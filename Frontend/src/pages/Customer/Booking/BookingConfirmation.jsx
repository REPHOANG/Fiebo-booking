import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Calendar } from "lucide-react";
import { createBooking } from "../../../services/bookingService";
import { savePaymentDraft } from '../../../utils/paymentDraft';
import { getVenueSchedule } from "../../../services/fieldService";
import { clearDraft } from '../../../store/bookingDraftSlice';
import { addBookedSlots } from '../../../store/bookedSlotsSlice';
import LoginPopup from '../../../components/common/LoginPopup/LoginPopup';
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

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  const formatPrice = (price) => (price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ");
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [localSchedule, setLocalSchedule] = useState(null);
  const [bookingNote, setBookingNote] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  // Prefill name and phone from authenticated user when available
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (!guestName && (user?.fullName || user?.name)) setGuestName(user.fullName || user.name || "");
      if (!guestPhone && (user?.phone || user?.phoneNumber)) setGuestPhone(user.phone || user.phoneNumber || "");
    }
  }, [isAuthenticated, user]);

  const displayName = user?.fullName || user?.name || guestName;
  const displayPhone = user?.phone || user?.phoneNumber || guestPhone;

  // Form-level validation: require fullname and phone
  const isFormValid = Boolean((displayName || "").toString().trim() && (displayPhone || "").toString().trim());
  const canConfirm = Boolean(isAuthenticated && isFormValid);

  // Data passed from BookingSchedule via navigate state
  const bookingState = location.state;

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

  // If no booking data, redirect back
  if (!bookingState) {
    return (
      <div className="bc-empty">
        <h2>Không có dữ liệu đặt sân</h2>
        <p>Vui lòng quay lại trang đặt lịch để chọn khung giờ.</p>
        <button onClick={() => navigate(-1)} className="bc-back-link">
          ← Quay lại
        </button>
      </div>
    );
  }

  const { venue, fields, selectedDate, selectedSlots, slots, slotSummary, venueSchedule } = bookingState;

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
      duration: `${Math.floor((g.slotCount * 60) / 60)}h${(g.slotCount * 60) % 60 > 0 ? (g.slotCount * 60) % 60 + "p" : ""}`,
    }));
  }, [slotSummary]);

  const totalPrice = slotSummary?.totalPrice || 0;
  const totalMinutes = slotSummary?.totalMinutes || 0;

  const handleConfirmBooking = () => {
    setConfirmError("");
    (async () => {
      // Client-side validation: require name and phone before attempting
      const fullnameCheck = (displayName || guestName || "").toString().trim();
      const phoneCheck = (displayPhone || guestPhone || "").toString().trim();
      if (!fullnameCheck || !phoneCheck) {
        if (!fullnameCheck) setNameError("Vui lòng nhập họ tên.");
        if (!phoneCheck) setPhoneError("Vui lòng nhập số điện thoại.");
        toast.error("Vui lòng nhập đầy đủ họ tên và số điện thoại.");
        return;
      }
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
        const phoneNumber = (displayPhone || guestPhone || "").trim();
        if (!fullname || !phoneNumber) {
          toast.error("Vui lòng nhập đầy đủ họ tên và số điện thoại.");
          return;
        }

        // API contract (POST /api/Booking): venueId, bookingDate, fullname, phoneNumber, bookingNote?, details: [{ fieldId, slotId }]
        const payload = {
          venueId: Number(venue?.id),
          bookingDate: selectedDate,
          fullname,
          phoneNumber,
          ...((bookingNote || "").trim() && { bookingNote: (bookingNote || "").trim() }),
          details: uniqueDetails.map((d) => ({ fieldId: Number(d.fieldId), slotId: Number(d.slotId) })),
        };

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

        // eslint-disable-next-line no-console
        console.debug('[BookingConfirmation] sending booking payload', payload);

        const res = await createBooking(payload);
        const bookingId = res?.bookingId || res?.id || res?.data?.bookingId || null;
        const expireAt = res?.expiredAt ?? res?.expireAt ?? null;
        // Persist minimal server-side draft (bookingId) so users can resume across devices
        try {
          if (bookingId) savePaymentDraft({ bookingId, venueId: venue?.id, expiresAt: expireAt });
        } catch (e) {}
        const ttl = expireAt
          ? Math.max(0, Math.floor((new Date(expireAt) - Date.now()) / 1000))
          : Number(res?.expiresInSeconds ?? res?.ttlSeconds ?? 300);

        try {
          console.debug('[BookingConfirmation] server created booking', { bookingId, venueId: String(venue?.id), date: selectedDate, ttlSeconds: ttl, expireAt });
          dispatch(addBookedSlots({ venueId: String(venue?.id), date: selectedDate, slots: selectedSlots, ttlSeconds: ttl }));
        } catch (e) {}

        navigate(`/venue/${venue?.id || 'unknown'}/booking/payment`, {
          state: {
            venue,
            selectedDate,
            selectedSlots,
            slotSummary,
            bookingItems,
            customerName: displayName,
            customerPhone: displayPhone,
            totalPrice,
            reservationId: bookingId,
            reservationTtl: ttl,
            reservationExpireAt: expireAt,
          },
        });
      } catch (err) {
        // Log full response for 400 to debug backend validation/constraints
        if (err?.status === 400 && err?.data) {
          console.error('[BookingConfirmation] 400 response body:', err.data);
        }
        console.warn('Create booking failed', err);
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

        // Other errors: proceed to payment without server booking
        navigate(`/venue/${venue?.id || 'unknown'}/booking/payment`, {
          state: {
            venue,
            selectedDate,
            selectedSlots,
            slotSummary,
            bookingItems,
            customerName: displayName,
            customerPhone: displayPhone,
            totalPrice,
          },
        });
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
            phoneNumber: (displayPhone || guestPhone || "").trim(),
            bookingNote: (bookingNote || "").trim() || undefined,
            details: uniqueDetails.map((d) => ({ fieldId: Number(d.fieldId), slotId: Number(d.slotId) })),
          };
          const res = await createBooking(payload);
          const bookingId = res?.bookingId || res?.id || res?.data?.bookingId || null;
          const expireAt = res?.expiredAt ?? res?.expireAt ?? null;
          const ttl = expireAt
            ? Math.max(0, Math.floor((new Date(expireAt) - Date.now()) / 1000))
            : Number(res?.expiresInSeconds ?? res?.ttlSeconds ?? 300);
          try {
            dispatch(addBookedSlots({ venueId: String(venue?.id), date: selectedDate, slots: selectedSlots, ttlSeconds: ttl }));
          } catch (e) {}

          navigate(`/venue/${venue?.id || 'unknown'}/booking/payment`, {
            state: {
              venue,
              selectedDate,
              selectedSlots,
              slotSummary,
              bookingItems,
              customerName: displayName,
              customerPhone: displayPhone,
              totalPrice,
              reservationId: bookingId,
              reservationTtl: ttl,
              reservationExpireAt: expireAt,
            },
          });
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
    <div className="bc-main">
      {/* Header */}
      <div className="bc-header">
        <button className="bc-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="bc-header-title">Xác nhận đặt sân</h1>
        <div className="bc-header-spacer" />
      </div>

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
                <span className="bc-customer-label">Email</span>
                <input
                  className="bc-field-input"
                  type="email"
                  value={user?.email || user?.username || ""}
                  disabled
                  readOnly
                />
              </div>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Họ tên</span>
                <input
                  className={`bc-field-input${nameError ? " error" : ""}`}
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={guestName}
                  onChange={(e) => {
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
                    setGuestPhone(e.target.value.replace(/[^0-9]/g, ""));
                    if (e.target.value && e.target.value.trim().length > 0) setPhoneError("");
                  }}
                  onBlur={() => {
                    const phoneVal = (displayPhone || guestPhone || "").toString().trim();
                    if (!phoneVal) setPhoneError("Vui lòng nhập số điện thoại.");
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
                onClick={() => setShowLoginPopup(true)}
              >
                Đăng nhập
              </button>
              <LoginPopup open={showLoginPopup} onClose={() => setShowLoginPopup(false)} />
            </div>
          )}
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
        <div className="bc-summary-divider" />
        <div className="bc-summary-row total">
          <span>Tổng thanh toán</span>
          <span className="bc-summary-total">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      

      {/* Bottom action */}
      <div className="bc-bottom">
        <div className="bc-bottom-price">
          <span className="bc-bottom-label">Tổng cộng</span>
          <span className="bc-bottom-amount">{formatPrice(totalPrice)}</span>
        </div>
        <button
          className={`bc-confirm-btn${!canConfirm ? " disabled" : ""}`}
          disabled={!canConfirm}
          onClick={handleConfirmBooking}
        >
          XÁC NHẬN ĐẶT SÂN
        </button>
      </div>
    </div>
    </motion.div>
  );
};

export default BookingConfirmation;
