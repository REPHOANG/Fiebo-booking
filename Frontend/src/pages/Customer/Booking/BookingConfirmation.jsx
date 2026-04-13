import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import * as yup from "yup";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Calendar, Search, Loader2 } from "lucide-react";
import { createBooking, createWalkInBooking } from "../../../services/bookingService";
import { getVenueSchedule } from "../../../services/fieldService";
import { getVenueServices } from "../../../services/venueService";
import { getProfile } from "../../../services/authService";
import { clearDraft } from '../../../store/bookingDraftSlice';
import { addBookedSlots } from '../../../store/bookedSlotsSlice';
import { useAuthModal } from "../../../context/AuthModalContext";
import "./BookingConfirmation.css";
import { toast } from 'react-toastify';

// Normalize time to "HH:mm" so map keys match client slot labels (e.g. "08:00" not "8:00")
const normalizeTime = (t) => {
  if (t == null || t === "") return "";
  const s = String(t).trim();
  const part = s.length >= 5 ? s.slice(0, 5) : s; // "08:00:00" -> "08:00" or "8:00"
  const [h, m] = part.split(":").map((n) => parseInt(n, 10) || 0);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Trả về Set các key "fieldId_slotId" đang bị chiếm (unavailable) trong schedule từ DB */
const getUnavailableKeysFromSchedule = (schedule) => {
  const keys = new Set();
  if (!schedule?.sportTypes) return keys;
  schedule.sportTypes.forEach((st) => {
    (st.fields || []).forEach((f) => {
      const fieldId = Number(f.fieldId ?? f.id);
      (f.unavailableSlots || []).forEach((us) => {
        const slotId = Number(us.slotId ?? us.id);
        if (fieldId && slotId) keys.add(`${fieldId}_${slotId}`);
      });
    });
  });
  return keys;
};

const normalizePhoneNumber = (value) => String(value ?? "").replace(/\D/g, "").trim();

const guestPhoneSchema = yup
  .string()
  .transform((value) => normalizePhoneNumber(value))
  .required("Vui lòng nhập số điện thoại.")
  .matches(/^0\d{8,10}$/, "Số điện thoại phải bắt đầu bằng số 0 và gồm 9 đến 11 chữ số.");

const getPhoneValidationError = (value) => {
  try {
    guestPhoneSchema.validateSync(value);
    return "";
  } catch (error) {
    return error?.message || "Số điện thoại không hợp lệ.";
  }
};



const buildBookingNoteWithServices = (baseNote, serviceRows) => {
  const note = (baseNote || "").trim();
  if (!serviceRows.length) return note || undefined;
  const serviceLine = serviceRows
    .map((s) => `${s.name} x${s.qty} (${s.subtotal.toLocaleString("vi-VN")} đ)`)
    .join("; ");
  const merged = `${note ? `${note}\n` : ""}[Dich vu] ${serviceLine}`;
  return merged;
};

// Build booking details from schedule by matching client field (name + sportType) to schedule.
const buildDetailsFromSchedule = (schedule, fields, slots, selectedSlots) => {
  const details = [];
  if (!schedule?.sportTypes || !Array.isArray(selectedSlots) || !Array.isArray(fields) || !Array.isArray(slots)) return details;

  const sportTypeByName = {};
  schedule.sportTypes.forEach((st) => {
    const key = (st.sportTypeName || st.sportType || "").trim().toLowerCase();
    if (key) sportTypeByName[key] = st;
  });

  for (const { fieldIdx, slotIdx } of selectedSlots) {
    const clientField = fields[fieldIdx];
    if (!clientField) continue;
    const startTime = normalizeTime(slots[slotIdx]?.label);
    if (!startTime) continue;

    const sportKey = (clientField.sportType || clientField.sportTypeName || "").trim().toLowerCase();
    const st = sportTypeByName[sportKey];
    if (!st?.fields?.length || !st?.slots?.length) continue;

    const fieldNameNorm = (clientField.name || "").trim();
    const scheduleField = st.fields.find((f) => (String(f.fieldName || f.name || "").trim() === fieldNameNorm));
    if (!scheduleField) continue;

    const slot = st.slots.find((s) => normalizeTime(s.startTime) === startTime);
    if (!slot) continue;

    const fieldId = Number(scheduleField.fieldId ?? scheduleField.id);
    const slotId = Number(slot.slotId ?? slot.id);
    if (fieldId && slotId) details.push({ fieldId, slotId });
  }
  return details;
};

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth || {});
  const { openLogin } = useAuthModal();

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Tách prefill user và user tự edit:
  // - Khi user đã nhập/xóa, không tự động override lại giá trị cũ.
  const didEditNameRef = useRef(false);
  const didEditPhoneRef = useRef(false);

  const formatPrice = (price) => (price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ");
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [localSchedule, setLocalSchedule] = useState(null);
  const [bookingNote, setBookingNote] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceQty, setServiceQty] = useState({});
  const [showServicePopup, setShowServicePopup] = useState(false);
  const [serviceDraftQty, setServiceDraftQty] = useState({});
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCategory, setServiceCategory] = useState("all");
  /** Dịch vụ add-on từ GET `/api/venue/{venueId}/services` — thay catalog tĩnh. */
  const [venueServiceCatalog, setVenueServiceCatalog] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Data passed from BookingSchedule via navigate state
  const bookingState = location.state;
  const venue = bookingState?.venue;
  const fields = bookingState?.fields ?? [];
  const selectedDate = bookingState?.selectedDate;
  const selectedSlots = bookingState?.selectedSlots ?? [];
  const slots = bookingState?.slots ?? [];
  const slotSummary = bookingState?.slotSummary;
  const venueSchedule = bookingState?.venueSchedule;
  const isWalkInBooking = bookingState?.walkIn;

  // Prefill from Redux user when available (e.g. email/phone login có thể có trong JWT).
  React.useEffect(() => {
    if (!user) return;
    if (!isWalkInBooking && !didEditNameRef.current) setGuestName(user?.fullName || user?.name || "");
    if (!didEditPhoneRef.current) setGuestPhone(normalizePhoneNumber(user?.phone || user?.phoneNumber || ""));
  }, [user, isWalkInBooking]);

  // Prefill từ profile API khi đã đăng nhập — auth.user có thể thiếu phone (vd: đăng nhập Google).
  // Profile lấy từ DB nên luôn có fullName, phoneNumber nếu user đã cập nhật.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile();
        if (cancelled || !profile) return;
        const name = (profile.fullName || profile.name || "").toString().trim();
        const phone = (profile.phoneNumber || profile.phone || "").toString().trim().replace(/\s/g, "");
        if (name) {
          if (!isWalkInBooking && !didEditNameRef.current) setGuestName(name);
          setNameError("");
        }
        if (phone) {
          if (!didEditPhoneRef.current) setGuestPhone(normalizePhoneNumber(phone));
          setPhoneError(getPhoneValidationError(phone));
        }
      } catch (_) {
        // ignore (e.g. 401, network)
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const displayName = guestName;
  const displayPhone = guestPhone;

  // Form-level validation: require fullname and phone
  const isFormValid = Boolean(
    (displayName || "").toString().trim() && !getPhoneValidationError(displayPhone),
  );
  const canConfirm = Boolean(isAuthenticated && isFormValid);

  // GET `/api/venue/{venueId}/services` — dịch vụ kèm theo do chủ sân cấu hình
  useEffect(() => {
    const vid = venue?.id;
    if (vid == null || vid === "") {
      setVenueServiceCatalog([]);
      return;
    }
    let cancelled = false;
    setServicesLoading(true);
    (async () => {
      try {
        const data = await getVenueServices(Number(vid), 1, 100, "");
        if (cancelled) return;
        const items = (data?.items ?? []).map((raw) => {
          const sid = raw?.id ?? raw?.Id;
          const name = String(raw?.serviceName ?? raw?.ServiceName ?? "").trim() || "Dịch vụ";
          const price = Number(raw?.price ?? raw?.Price ?? 0);
          return {
            id: String(sid),
            name,
            price: Number.isFinite(price) ? price : 0,
            unit: "suất",
            category: "Dịch vụ tại sân",
            description: String(raw?.description ?? raw?.Description ?? "").trim(),
            imageUrl: raw?.imageUrl ?? raw?.ImageUrl ?? null,
          };
        }).filter((x) => x.id && x.id !== "");
        setVenueServiceCatalog(items);
        setServiceQty({});
        setServiceDraftQty({});
      } catch {
        if (!cancelled) {
          setVenueServiceCatalog([]);
          toast.error("Không tải được danh sách dịch vụ.");
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venue?.id]);

  // initialize localSchedule from booking state if provided
  useEffect(() => {
    try {
      if (bookingState?.venueSchedule) setLocalSchedule(bookingState.venueSchedule);
    } catch (e) {}
  }, [bookingState]);

  // Poll venue schedule periodically while on this page (must run before early return for rules of hooks)
  useEffect(() => {
    if (!bookingState?.venue?.id || !bookingState?.selectedDate) return;
    const venue = bookingState.venue;
    const selectedDate = bookingState.selectedDate;
    const fields = bookingState.fields;
    const venueSchedule = bookingState.venueSchedule;
    let mounted = true;
    const POLL_MS = 10000;

    const poll = async () => {
      try {
        const res = await getVenueSchedule(venue.id, selectedDate);
        if (!mounted) return;
        const serverSlots = [];
        (res?.sportTypes || []).forEach((st) => (st.slots || []).forEach((s) => serverSlots.push(s)));

        const startToIdx = {};
        serverSlots.forEach((s) => {
          const hhmm = (s.startTime || "").slice(0, 5);
          const idx = venueSchedule?.slots ? venueSchedule.slots.findIndex((sl) => sl.label === hhmm) : -1;
          if (idx >= 0) startToIdx[s.slotId] = idx;
        });

        const booked = [];
        (res?.sportTypes || []).forEach((st) => {
          (st.fields || []).forEach((f) => {
            const fieldId = f.fieldId;
            const fieldIdx = (fields || []).findIndex((ff) => Number(ff.id ?? ff.fieldId) === Number(fieldId));
            if (fieldIdx < 0) return;
            (f.unavailableSlots || []).forEach((us) => {
              const slotIdx = startToIdx[us.slotId];
              if (slotIdx != null && slotIdx >= 0) booked.push({ fieldIdx, slotIdx });
            });
          });
        });

        if (booked.length) {
          try {
            dispatch(addBookedSlots({ venueId: String(venue.id), date: selectedDate, slots: booked }));
          } catch (e) {}
        }
      } catch (e) {
        // ignore polling errors
      }
    };

    poll();
    const idt = setInterval(poll, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(idt);
    };
  }, [bookingState?.venue?.id, bookingState?.selectedDate, bookingState?.fields, bookingState?.venueSchedule, dispatch]);

  // Format the date nicely
  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    const [y, mo, d] = selectedDate.split("-");
    const date = new Date(y, mo - 1, d);
    const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${dayName}, ${d}/${mo}/${y}`;
  }, [selectedDate]);

  // Build detailed booking items
  const bookingItems = useMemo(() => {
    if (!slotSummary?.groups) return [];
    return slotSummary.groups.map((g) => ({
      fieldId: g.fieldId,
      fieldName: g.fieldName,
      ranges: g.ranges,
      slotCount: g.slotCount,
      pricePerSlot: g.pricePerSlot,
      subtotal: g.slotCount * g.pricePerSlot,
      duration: `${Math.floor((g.totalMinutes ?? g.slotCount * 60) / 60)}h${(g.totalMinutes ?? g.slotCount * 60) % 60 > 0 ? (g.totalMinutes ?? g.slotCount * 60) % 60 + "p" : ""}`,
    }));
  }, [slotSummary]);

  const totalPrice = slotSummary?.totalPrice || 0;
  const totalMinutes = slotSummary?.totalMinutes || 0;
  const selectedServiceRows = useMemo(() => {
    return venueServiceCatalog
      .map((s) => {
        const qty = Number(serviceQty[s.id] || 0);
        return qty > 0 ? { ...s, qty, subtotal: qty * s.price } : null;
      })
      .filter(Boolean);
  }, [serviceQty, venueServiceCatalog]);
  const serviceTotal = useMemo(
    () => selectedServiceRows.reduce((sum, x) => sum + x.subtotal, 0),
    [selectedServiceRows]
  );
  // Business rule (offline): user only pays field fee on app; services are paid directly at venue.
  const payableTotal = totalPrice;

  const openServicePopup = () => {
    setServiceDraftQty({ ...serviceQty });
    setServiceSearch("");
    setServiceCategory("all");
    setShowServicePopup(true);
  };

  const applyServicePopup = () => {
    setServiceQty({ ...serviceDraftQty });
    setShowServicePopup(false);
  };

  const serviceCategories = useMemo(
    () => ["all", ...Array.from(new Set(venueServiceCatalog.map((s) => s.category)))],
    [venueServiceCatalog],
  );

  const filteredServiceCatalog = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return venueServiceCatalog.filter((s) => {
      const inCategory = serviceCategory === "all" || s.category === serviceCategory;
      const inSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));
      return inCategory && inSearch;
    });
  }, [serviceCategory, serviceSearch, venueServiceCatalog]);

  const modalServiceRows = useMemo(() => {
    const grouped = {};
    filteredServiceCatalog.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return Object.entries(grouped);
  }, [filteredServiceCatalog]);

  const modalServiceCount = useMemo(
    () => Object.values(serviceDraftQty).reduce((sum, x) => sum + Number(x || 0), 0),
    [serviceDraftQty]
  );
  const modalServiceTotal = useMemo(
    () =>
      venueServiceCatalog.reduce(
        (sum, s) => sum + Number(serviceDraftQty[s.id] || 0) * Number(s.price || 0),
        0,
      ),
    [serviceDraftQty, venueServiceCatalog],
  );

  const handleConfirmBooking = () => {
    setConfirmError("");
    (async () => {
      if (!bookingState || venue?.id == null) return;
      // Client-side validation: require name and phone before attempting
      const fullnameCheck = (displayName || guestName || "").toString().trim();
      const phoneCheck = normalizePhoneNumber(displayPhone || guestPhone || "");
      const nextPhoneError = getPhoneValidationError(phoneCheck);
      if (!fullnameCheck || nextPhoneError) {
        if (!fullnameCheck) setNameError("Vui lòng nhập họ tên.");
        if (nextPhoneError) setPhoneError(nextPhoneError);
        toast.error(!fullnameCheck ? "Vui lòng nhập đầy đủ họ tên và số điện thoại." : nextPhoneError);
        return;
      }

      if (isWalkInBooking) {
        setIsSubmitting(true);
        try {
          try {
            dispatch(clearDraft(String(venue?.id)));
          } catch (e) {}

          let schedule = localSchedule || venueSchedule;
          if (!schedule && venue?.id && selectedDate) {
            const res = await getVenueSchedule(venue.id, selectedDate);
            schedule = res;
            setLocalSchedule(res);
          }
          let details = buildDetailsFromSchedule(schedule, fields, slots, selectedSlots);

          if (details.length === 0 && selectedSlots.length > 0) {
            try {
              const refreshed = await getVenueSchedule(venue.id, selectedDate);
              setLocalSchedule(refreshed);
              details = buildDetailsFromSchedule(refreshed, fields, slots, selectedSlots);
            } catch (e) {
              // ignore
            }
            if (details.length === 0) {
              toast.error("Không thể ánh xạ khung giờ. Vui lòng quay lại trang đặt lịch và thử lại.");
              return;
            }
          }

          const seen = new Set();
          const uniqueDetails = details.filter((d) => {
            const key = `${d.fieldId}-${d.slotId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          const fullname = (displayName || guestName || "").trim();
          const phoneNumber = normalizePhoneNumber(displayPhone || guestPhone || "");
          const payload = {
            venueId: Number(venue?.id),
            bookingDate: selectedDate,
            fullname,
            phoneNumber,
            ...((bookingNote || "").trim() && { bookingNote: buildBookingNoteWithServices(bookingNote, selectedServiceRows) }),
            details: uniqueDetails.map((d) => ({ fieldId: Number(d.fieldId), slotId: Number(d.slotId) })),
          };
          if (!payload.bookingNote) {
            payload.bookingNote = buildBookingNoteWithServices("", selectedServiceRows);
          }

          if (!payload.details.length) {
            toast.error("Không có khung giờ hợp lệ để đặt. Vui lòng quay lại trang đặt lịch.");
            return;
          }

          try {
            const freshSchedule = await getVenueSchedule(venue.id, selectedDate);
            setLocalSchedule(freshSchedule);
            const unavailableKeys = getUnavailableKeysFromSchedule(freshSchedule);
            const hasConflict = uniqueDetails.some((d) =>
              unavailableKeys.has(`${Number(d.fieldId)}_${Number(d.slotId)}`)
            );
            if (hasConflict) {
              toast.error(
                "Một hoặc nhiều khung giờ đã được đặt. Vui lòng quay lại trang đặt lịch và chọn slot khác."
              );
              return;
            }
          } catch (e) {
            // vẫn gửi API; backend sẽ kiểm tra
          }

          await createWalkInBooking(payload);
          toast.success("Đã tạo lịch đặt offline thành công.");
          navigate("/owner/bookings", { replace: true });
        } catch (err) {
          const msg =
            err?.response?.data?.message ||
            err?.data?.message ||
            err?.message ||
            "Không thể tạo đặt chỗ offline.";
          toast.error(msg);
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      setIsSubmitting(true);
      try {
      // Note: removed optimistic slot locking here. Slots will be reserved
      // only after server confirms booking (see below). We still clear draft.
      try {
        dispatch(clearDraft(String(venue?.id)));
      } catch (e) {}

      // Create booking request on server with required payload structure
      try {
        // Get schedule to map (fieldId, startTime) -> server slotId
        let schedule = localSchedule || venueSchedule;
        if (!schedule && venue?.id && selectedDate) {
          const res = await getVenueSchedule(venue.id, selectedDate);
          schedule = res;
          setLocalSchedule(res);
        }
        // Build details by matching client field (name + sportType) to schedule — frontend-only, no backend change needed
        let details = buildDetailsFromSchedule(schedule, fields, slots, selectedSlots);

        if (details.length === 0 && selectedSlots.length > 0) {
          // Retry: refresh schedule and try again
          try {
            const refreshed = await getVenueSchedule(venue.id, selectedDate);
            setLocalSchedule(refreshed);
            details = buildDetailsFromSchedule(refreshed, fields, slots, selectedSlots);
          } catch (e) {
            // ignore
          }

          if (details.length === 0) {
            toast.error("Không thể ánh xạ khung giờ. Vui lòng quay lại trang đặt lịch và thử lại.");
            return;
          }
        }

        // Deduplicate (fieldId, slotId) — backend has unique constraint on (FieldId, SlotId, BookingDate)
        const seen = new Set();
        const uniqueDetails = details.filter((d) => {
          const key = `${d.fieldId}-${d.slotId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const fullname = (displayName || guestName || "").trim();
        const phoneNumber = normalizePhoneNumber(displayPhone || guestPhone || "");
        const nextPhoneError = getPhoneValidationError(phoneNumber);
        if (!fullname || nextPhoneError) {
          if (nextPhoneError) setPhoneError(nextPhoneError);
          toast.error(!fullname ? "Vui lòng nhập đầy đủ họ tên và số điện thoại." : nextPhoneError);
          return;
        }

        // API contract (POST /api/Booking): venueId, bookingDate, fullname, phoneNumber, bookingNote?, details: [{ fieldId, slotId }]
        const payload = {
          venueId: Number(venue?.id),
          bookingDate: selectedDate,
          fullname,
          phoneNumber,
          ...((bookingNote || "").trim() && { bookingNote: buildBookingNoteWithServices(bookingNote, selectedServiceRows) }),
          details: uniqueDetails.map((d) => ({ fieldId: Number(d.fieldId), slotId: Number(d.slotId) })),
        };
        if (!payload.bookingNote) {
          payload.bookingNote = buildBookingNoteWithServices("", selectedServiceRows);
        }

        if (!payload.details.length) {
          toast.error("Không có khung giờ hợp lệ để đặt. Vui lòng quay lại trang đặt lịch.");
          return;
        }

        // Refetch schedule từ DB ngay trước khi gửi để tránh conflict: nếu slot đã bị đặt thì báo lỗi, không gọi API
        try {
          const freshSchedule = await getVenueSchedule(venue.id, selectedDate);
          setLocalSchedule(freshSchedule);
          const unavailableKeys = getUnavailableKeysFromSchedule(freshSchedule);
          const hasConflict = uniqueDetails.some((d) => unavailableKeys.has(`${Number(d.fieldId)}_${Number(d.slotId)}`));
          if (hasConflict) {
            toast.error("Một hoặc nhiều khung giờ đã được đặt. Vui lòng quay lại trang đặt lịch và chọn slot khác.");
            return;
          }
        } catch (e) {
          // Nếu refetch lỗi vẫn gửi createBooking; backend sẽ check DB và trả 409 nếu conflict
        }

        const res = await createBooking(payload);
        const bookingId = res?.bookingId || res?.id || res?.data?.bookingId || null;
        const expireAt = res?.expiredAt ?? res?.expireAt ?? null;
        const ttlSeconds = expireAt
          ? Math.max(0, Math.floor((new Date(expireAt) - Date.now()) / 1000))
          : Number(res?.expiresInSeconds ?? res?.ttlSeconds ?? 300);

        try {
          dispatch(
            addBookedSlots({
              venueId: String(venue?.id),
              date: selectedDate,
              slots: selectedSlots,
              ttlSeconds: ttlSeconds > 0 ? ttlSeconds : 300,
            }),
          );
        } catch (e) {}

        if (!bookingId) {
          toast.error("Không nhận được mã đặt chỗ từ máy chủ. Vui lòng thử lại.");
          return;
        }

        navigate(
          `/booking/${venue?.id || "unknown"}/payment?bookingId=${bookingId}`,
          {
            state: {
              venue,
              selectedDate,
              selectedSlots,
            },
          },
        );
      } catch (err) {
        if (err && err.status === 401) {
          toast.error('Bạn cần đăng nhập trước khi xác nhận đặt sân.');
          return;
        }
        if (err && err.status === 400) {
          const msg = err?.data?.message || err?.message || 'Một hoặc nhiều khung giờ đã được đặt hoặc không hợp lệ. Vui lòng quay lại trang đặt lịch và chọn lại.';
          toast.error(msg);
          return;
        }
        if (err && err.status === 409) {
          const msg = err?.data?.message || err?.message || 'Slot đã được đặt hoặc đang được người khác đặt. Vui lòng quay lại trang đặt lịch và chọn slot khác.';
          toast.error(msg);
          return;
        }

        toast.error(
          err?.data?.message ??
            err?.message ??
            "Không thể hoàn tất đặt sân. Vui lòng thử lại hoặc quay lại chọn khung giờ.",
        );
      }
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  // Attempt to refresh schedule and remap selected slots to server slotIds
  const attemptRemap = async () => {
    if (!venue?.id || !selectedDate) return;
    setIsRetrying(true);
    try {
      const res = await getVenueSchedule(venue.id, selectedDate);
      setLocalSchedule(res);

      const details = buildDetailsFromSchedule(res, fields, slots, selectedSlots);

      if (details.length === 0) {
        setConfirmError("Không thể ánh xạ khung giờ. Vui lòng quay lại trang đặt lịch và thử lại.");
      } else {
        setConfirmError("");
        const seen = new Set();
        const uniqueDetails = details.filter((d) => {
          const key = `${d.fieldId}-${d.slotId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        try {
          const payload = {
            venueId: Number(venue?.id),
            bookingDate: selectedDate,
            fullname: (displayName || guestName || "").trim(),
            phoneNumber: normalizePhoneNumber(displayPhone || guestPhone || ""),
            bookingNote: buildBookingNoteWithServices(bookingNote, selectedServiceRows),
            details: uniqueDetails.map((d) => ({ fieldId: Number(d.fieldId), slotId: Number(d.slotId) })),
          };
          const res = await createBooking(payload);
          const bookingId = res?.bookingId || res?.id || res?.data?.bookingId || null;
          const expireAt = res?.expiredAt ?? res?.expireAt ?? null;
          const ttlSeconds = expireAt
            ? Math.max(0, Math.floor((new Date(expireAt) - Date.now()) / 1000))
            : Number(res?.expiresInSeconds ?? res?.ttlSeconds ?? 300);
          try {
            dispatch(
              addBookedSlots({
                venueId: String(venue?.id),
                date: selectedDate,
                slots: selectedSlots,
                ttlSeconds: ttlSeconds > 0 ? ttlSeconds : 300,
              }),
            );
          } catch (e) {}

          if (!bookingId) {
            toast.error("Không nhận được mã đặt chỗ từ máy chủ. Vui lòng thử lại.");
            return;
          }
          navigate(
            `/booking/${venue?.id || "unknown"}/payment?bookingId=${bookingId}`,
            {
              state: {
                venue,
                selectedDate,
                selectedSlots,
              },
            },
          );
        } catch (err) {
          toast.error(err?.message || 'Không thể tạo đặt chỗ.');
        }
      }
      } catch (e) {
      toast.error('Không thể lấy lịch từ server. Vui lòng thử lại.');
    } finally {
      setIsRetrying(false);
    }
  };

  if (!bookingState) {
    return (
      <div className="bc-empty">
        <h2>Không có dữ liệu đặt sân</h2>
        <p>Vui lòng quay lại trang đặt lịch để chọn khung giờ.</p>
        <button type="button" onClick={() => navigate(-1)} className="bc-back-link">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
    <div className={`bc-main${isWalkInBooking ? " bc-main--owner" : ""}`}>
      {/* Header */}
      <div className="bc-header">
        <button
          className="bc-back-btn"
          onClick={() =>
            isWalkInBooking && venue?.id
              ? navigate(`/owner/venues/${venue.id}/offline-booking`)
              : navigate(-1)
          }
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="bc-header-title">
          {isWalkInBooking ? "Xác nhận đặt sân offline" : "Xác nhận đặt sân"}
        </h1>
        <div className="bc-header-spacer" />
      </div>

      <div className="bc-layout">
        {/* Left column: venue, date, booking details, summary */}
        <div className="bc-left">
      {/* Venue info */}
      <div className="bc-section">
        <div className="bc-section-header">
          <MapPin size={18} />
          <span>Thông tin sân</span>
        </div>
        <div className="bc-venue-card">
          <h3 className="bc-venue-name">{venue?.name}</h3>
          {venue?.address && (
            <p className="bc-venue-address">{venue.address}</p>
          )}
          <div className="bc-venue-meta">
            <span className="bc-venue-tag">
              <Clock size={14} />
              {venue?.openTime?.slice(0, 5)} – {venue?.closeTime?.slice(0, 5)}
            </span>
          </div>
        </div>
      </div>

      {/* Booking date */}
      <div className="bc-section">
        <div className="bc-section-header">
          <Calendar size={18} />
          <span>Ngày đặt</span>
        </div>
        <div className="bc-date-card">
          <span className="bc-date-text">{formattedDate}</span>
        </div>
      </div>

      {/* Booking details */}
      <div className="bc-section">
        <div className="bc-section-header">
          <Clock size={18} />
          <span>Chi tiết đặt sân</span>
        </div>
        <div className="bc-items">
          {bookingItems.map((item, i) => (
            <div key={i} className="bc-item">
              <div className="bc-item-top">
                <span className="bc-item-field">{item.fieldName}</span>
                <span className="bc-item-duration">{item.duration}</span>
              </div>
              <div className="bc-item-times">
                {item.ranges.map((r, ri) => (
                  <span key={ri} className="bc-item-range">{r}</span>
                ))}
              </div>
              <div className="bc-item-bottom">
                <span className="bc-item-slots">
                  {item.slotCount} khung × {formatPrice(item.pricePerSlot)}
                </span>
                <span className="bc-item-subtotal">{formatPrice(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bc-section">
        <div className="bc-section-header">
          <span style={{ fontSize: "1.05rem" }}>🧰</span>
          <span>Dịch vụ kèm theo</span>
        </div>
        <div className="bc-services-card">
          {selectedServiceRows.length === 0 ? (
            <p className="bc-service-empty">Chưa chọn dịch vụ nào.</p>
          ) : (
            selectedServiceRows.map((s) => (
              <div key={s.id} className="bc-service-row">
                <div className="bc-service-info">
                  <strong>{s.name}</strong>
                  <span>
                    {s.qty} {s.unit} × {formatPrice(s.price)}
                  </span>
                </div>
                <div className="bc-service-subtotal">{formatPrice(s.subtotal)}</div>
              </div>
            ))
          )}
        </div>
      </div>

        </div>

        {/* Right column: customer info */}
        <div className="bc-right">
      {/* Customer info */}
      <div className="bc-section">
        <div className="bc-section-header">
          <span style={{ fontSize: "1.1rem" }}>👤</span>
          <span>Thông tin người đặt</span>
        </div>
        <div className="bc-customer-card">
          {isAuthenticated && user ? (
            /* ── Logged-in user ── */
            <>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Họ tên</span>
                <input
                  className={`bc-field-input${nameError ? " error" : ""}`}
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={guestName}
                  onChange={(e) => {
                    didEditNameRef.current = true;
                    setGuestName(e.target.value);
                    if (e.target.value && e.target.value.trim().length > 0) setNameError("");
                  }}
                  onBlur={() => {
                    if (!((displayName || guestName || "").toString().trim())) setNameError("Vui lòng nhập họ tên.");
                  }}
                />
                {nameError && <p className="bc-field-error" role="alert">{nameError}</p>}
              </div>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Số điện thoại</span>
                <input
                  className={`bc-field-input${phoneError ? " error" : ""}`}
                  type="tel"
                  placeholder="0912 345 678"
                  value={guestPhone}
                  onChange={(e) => {
                    didEditPhoneRef.current = true;
                    const nextPhone = normalizePhoneNumber(e.target.value);
                    setGuestPhone(nextPhone);
                    if (!nextPhone) {
                      setPhoneError("");
                    } else {
                      setPhoneError(getPhoneValidationError(nextPhone));
                    }
                  }}
                  onBlur={() => {
                    const phoneVal = normalizePhoneNumber(displayPhone || guestPhone || "");
                    setPhoneError(getPhoneValidationError(phoneVal));
                  }}
                />
                {phoneError && <p className="bc-field-error" role="alert">{phoneError}</p>}
              </div>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Ghi chú đặt sân (tuỳ chọn)</span>
                <textarea
                  className="bc-field-input bc-textarea"
                  placeholder="Nhập ghi chú cho nhà quản lý (ví dụ: cần lưới, bóng...)"
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                />
              </div>
            </>
          ) : (
            /* ── Chưa đăng nhập: chỉ hiện nút Đăng nhập, bấm vào mở popup ── */
            <div className="bc-guest-form bc-guest-login-only">
              <p className="bc-guest-note">
                Bạn cần đăng nhập để xác nhận đặt sân.
              </p>
              <button
                type="button"
                className="bc-login-btn-primary"
                onClick={() => openLogin()}
              >
                Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="bc-service-open-wrap">
        <button type="button" className="bc-service-open-btn" onClick={openServicePopup}>
          + THÊM DỊCH VỤ
        </button>
      </div>
        </div>
      </div>

      {/* Price summary */}
      <div className="bc-summary">
        <div className="bc-summary-row">
          <span>Tổng thời gian</span>
          <span className="bc-summary-val">
            {Math.floor(totalMinutes / 60)}h{totalMinutes % 60 > 0 ? totalMinutes % 60 + "p" : ""}
          </span>
        </div>
        <div className="bc-summary-row">
          <span>Tổng khung giờ</span>
          <span className="bc-summary-val">{selectedSlots?.length || 0} khung</span>
        </div>
        <div className="bc-summary-row">
          <span>Tiền sân</span>
          <span className="bc-summary-val">{formatPrice(totalPrice)}</span>
        </div>
        <div className="bc-summary-row">
          <span>Tiền dịch vụ</span>
          <span className="bc-summary-val">
            {formatPrice(serviceTotal)} <span className="bc-summary-note">(trả tại sân)</span>
          </span>
        </div>
        <div className="bc-summary-divider" />
        <div className="bc-summary-row total">
          <span>Tổng thanh toán</span>
          <span className="bc-summary-total">{formatPrice(payableTotal)}</span>
        </div>
      </div>

      

      {/* Bottom action */}
      <div className="bc-bottom">
        <div className="bc-bottom-price">
          <span className="bc-bottom-label">Tổng cộng</span>
          <span className="bc-bottom-amount">{formatPrice(payableTotal)}</span>
        </div>
        <button
          className={`bc-confirm-btn${!canConfirm || isSubmitting ? " disabled" : ""}${isSubmitting ? " loading" : ""}`}
          disabled={!canConfirm || isSubmitting}
          onClick={handleConfirmBooking}
        >
          {isSubmitting
            ? "Đang xử lý..."
            : isWalkInBooking
              ? "HOÀN TẤT ĐẶT OFFLINE"
              : "XÁC NHẬN ĐẶT SÂN"}
        </button>
      </div>
    </div>

    {showServicePopup ? (
      <div className="bc-service-modal-backdrop" onClick={() => setShowServicePopup(false)}>
        <div className="bc-service-modal" onClick={(e) => e.stopPropagation()}>
          <div className="bc-service-modal-head">
            <h3>Dịch vụ dành cho bạn</h3>
            <button type="button" className="bc-service-close" onClick={() => setShowServicePopup(false)}>
              ×
            </button>
          </div>
          <div className="bc-service-toolbar">
            <div className="bc-service-search-wrap">
              <Search size={16} />
              <input
                className="bc-service-search"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Nhập tên sản phẩm"
              />
            </div>
            <div className="bc-service-cats">
              {serviceCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`bc-service-cat${serviceCategory === c ? " active" : ""}`}
                  onClick={() => setServiceCategory(c)}
                >
                  {c === "all" ? "Tất cả" : c}
                </button>
              ))}
            </div>
          </div>
          <div className="bc-service-modal-body ">
            {servicesLoading ? (
              <div className="bc-service-loading">
                <Loader2 size={28} className="bc-service-loading-icon" />
                <span>Đang tải dịch vụ từ sân…</span>
              </div>
            ) : venueServiceCatalog.length === 0 ? (
              <p className="bc-service-empty">Sân chưa đăng dịch vụ kèm theo. Bạn có thể ghi chú thêm ở ô ghi chú đặt sân.</p>
            ) : modalServiceRows.length === 0 ? (
              <p className="bc-service-empty">Không có dịch vụ phù hợp bộ lọc.</p>
            ) : (
              modalServiceRows.map(([category, items]) => (
                <div key={category} className="bc-service-category-block">
                  <p className="bc-service-category-title">{category}</p>
                  <div className="bc-service-product-grid">
                    {items.map((s) => {
                      const qty = Number(serviceDraftQty[s.id] || 0);
                      return (
                        <div key={s.id} className="bc-service-product-card">
                          <div className="bc-service-product-main">
                            {s.imageUrl ? (
                              <img
                                src={s.imageUrl}
                                alt=""
                                className="bc-service-product-thumb"
                              />
                            ) : (
                              <div className="bc-service-product-icon" aria-hidden>
                                👜
                              </div>
                            )}
                            <div className="bc-service-product-info">
                              <strong>{s.name} ({s.unit})</strong>
                              <span>{formatPrice(s.price)} / {s.unit}</span>
                            </div>
                          </div>
                          <div className="bc-service-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setServiceDraftQty((prev) => ({
                                  ...prev,
                                  [s.id]: Math.max(0, Number(prev[s.id] || 0) - 1),
                                }))
                              }
                              className="bc-qty-btn"
                            >
                              -
                            </button>
                            <span className="bc-qty-val">{qty}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setServiceDraftQty((prev) => ({
                                  ...prev,
                                  [s.id]: Math.min(99, Number(prev[s.id] || 0) + 1),
                                }))
                              }
                              className="bc-qty-btn"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="bc-service-modal-foot">
            <button type="button" className="bc-service-cancel" onClick={() => setShowServicePopup(false)}>
              Hủy
            </button>
            <button type="button" className="bc-service-apply" onClick={applyServicePopup}>
              Thêm dịch vụ
            </button>
            <span className="bc-service-foot-meta">
              {modalServiceCount} món | Tổng cộng: {formatPrice(modalServiceTotal)}
            </span>
          </div>
        </div>
      </div>
    ) : null}
    </motion.div>
  );
};

export default BookingConfirmation;
