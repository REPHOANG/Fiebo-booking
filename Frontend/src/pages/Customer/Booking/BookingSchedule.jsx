import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getVenueDetail, getVenueSchedule, fetchVenueFieldCatalog } from "../../../services/fieldService";
import { setDraft } from '../../../store/bookingDraftSlice';
import { setBookedSlotsFromServer } from '../../../store/bookedSlotsSlice';
import { useAuthModal } from "../../../context/AuthModalContext";
import "./BookingSchedule.css";

/* ── Helpers ─────────────────────────────────────────────────── */
const parseTime = (timeSpan) => {
  if (!timeSpan) return null;
  const parts = String(timeSpan).split(":");
  return { h: parseInt(parts[0], 10), m: parseInt(parts[1], 10) };
};

const formatSlot = (h, m) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const formatTime = (timeSpan) => {
  const time = parseTime(timeSpan);
  return time ? formatSlot(time.h, time.m) : "";
};

/** Normalize server slot time (StartTime/EndTime e.g. "11:00:00.000000" or "11:00") to "HH:mm" for matching */
const normalizeSlotTime = (t) => {
  if (t == null || t === "") return "";
  const s = String(t).trim();
  const part = s.length >= 5 ? s.slice(0, 5) : s;
  const [h, m] = part.split(":").map((n) => parseInt(n, 10) || 0);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const normalizeText = (v) => String(v || "").trim().toLowerCase();

/** Lọc từng nhóm môn: chỉ giữ sân thuộc đúng sportType (backend có thể nhân bản cùng fields cho mọi SportTypes). */
const filterScheduleByFieldCatalog = (res, allowedKeySet) => {
  if (!res?.sportTypes?.length || !allowedKeySet || allowedKeySet.size === 0) return res;
  const sportTypes = res.sportTypes.map((st) => {
    const sportType = String(st.sportTypeName || st.sportType || "").trim();
    const sportKey = normalizeText(sportType);
    const fields = (st.fields || []).filter((f) => {
      const name = String(f.fieldName || f.name || "").trim();
      if (!name) return false;
      return allowedKeySet.has(`${sportKey}|${normalizeText(name)}`);
    });
    return { ...st, fields };
  });
  return { ...res, sportTypes };
};

/** Danh sách sân + môn từ GET lịch. Thứ tự theo sportTypes.fields trên response. */
const buildFieldsFromVenueSchedule = (res) => {
  const out = [];
  const seen = new Set();
  (res?.sportTypes || []).forEach((st) => {
    const sportType = String(st.sportTypeName || st.sportType || "").trim();
    const sportKey = normalizeText(sportType);
    (st.fields || []).forEach((f) => {
      const name = String(f.fieldName || f.name || "").trim();
      if (!name) return;
      const key = `${sportKey}|${normalizeText(name)}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        ...f,
        name,
        sportType,
        fieldName: f.fieldName ?? f.name,
        id: f.fieldId ?? f.id ?? f.FieldId ?? f.fieldID,
        fieldId: f.fieldId ?? f.id ?? f.FieldId,
      });
    });
  });
  return out;
};

/** Độ dài một khung slot từ API (phút) */
const apiSlotDurationMinutes = (s) => {
  const st = normalizeSlotTime(s?.startTime ?? s?.StartTime ?? "");
  const en = normalizeSlotTime(s?.endTime ?? s?.EndTime ?? "");
  if (!st || !en) return null;
  const a = parseTime(st);
  const b = parseTime(en);
  if (!a || !b) return null;
  return b.h * 60 + b.m - (a.h * 60 + a.m);
};

/**
 * Suy ra bước lưới (30, 60, …) từ danh sách slot một môn trên lịch.
 * Owner có thể cấu hình 30p/slot nhưng client trước đây luôn sinh lưới 60p.
 */
const inferStepMinutesFromApiSlots = (list) => {
  if (!list?.length) return 60;
  const durs = [];
  for (const s of list) {
    const d = apiSlotDurationMinutes(s);
    if (d != null && d > 0 && d <= 24 * 60) durs.push(d);
  }
  if (durs.length) {
    const m = Math.min(...durs);
    if (m >= 15 && m <= 120) return m;
  }
  const labels = [
    ...new Set(
      list.map((s) => normalizeSlotTime(s?.startTime ?? s?.StartTime ?? "")).filter(Boolean),
    ),
  ].sort();
  if (labels.length >= 2) {
    const toMin = (lab) => {
      const p = parseTime(lab);
      return p ? p.h * 60 + p.m : NaN;
    };
    let minGap = Infinity;
    for (let i = 1; i < labels.length; i++) {
      const g = toMin(labels[i]) - toMin(labels[i - 1]);
      if (g > 0) minGap = Math.min(minGap, g);
    }
    if (Number.isFinite(minGap) && minGap >= 15 && minGap <= 120) return minGap;
  }
  return 60;
};

const scheduleGlobalStepMinutes = (sportTypes) => {
  if (!sportTypes?.length) return 60;
  return sportTypes.reduce(
    (acc, st) => Math.min(acc, inferStepMinutesFromApiSlots(st.slots || [])),
    60,
  );
};

/** Tên đầy đủ hiển thị / tooltip */
const getFieldDisplayName = (field) =>
  String(field?.name ?? field?.fieldName ?? field?.Name ?? field?.FieldName ?? "Sân").trim() || "Sân";

/** Danh sách URL ảnh sân từ nhiều dạng DTO */
const getFieldImageList = (field) => {
  if (!field) return [];
  const raw =
    field.images ??
    field.Images ??
    field.imageUrls ??
    field.ImageUrls ??
    field.photos ??
    field.thumbnailUrl ??
    field.ThumbnailUrl ??
    null;
  if (Array.isArray(raw)) return raw.map((x) => (x == null ? "" : String(x))).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
};

const tooltipPositionFromEvent = (e) => {
  const margin = 12;
  const tw = 200;
  const th = 200;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  if (typeof window !== "undefined") {
    x = Math.min(x, window.innerWidth - tw - margin);
    y = Math.min(y, window.innerHeight - th - margin);
    x = Math.max(margin, x);
    y = Math.max(margin, y);
  }
  return { x, y };
};

/** Generate time slots; stepMinutes 30 hoặc 60 theo cấu hình sân. */
const generateSlots = (openTime, closeTime, stepMinutes = 60) => {
  const start = parseTime(openTime);
  const end = parseTime(closeTime);
  if (!start || !end) return [];

  const slots = [];
  let h = start.h;
  let m = start.m;
  const endMin = end.h * 60 + end.m;

  while (h * 60 + m < endMin) {
    slots.push({ h, m, label: formatSlot(h, m), stepMinutes });
    m += stepMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
  }
  return slots;
};

/** Nhãn trục thời gian N+1: cột cuối = mốc kết thúc sau step của slot cuối. */
const buildTimeLabels = (slotArr) => {
  if (!slotArr.length) return [];
  const last = slotArr[slotArr.length - 1];
  const step = last.stepMinutes ?? 60;
  const endMin = last.h * 60 + last.m + step;
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;
  return [...slotArr, { h: endH, m: endM, label: formatSlot(endH, endM), stepMinutes: step }];
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateVN = (dateStr) => {
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(y, mo - 1, d);
  const dayName = date.toLocaleDateString("vi-VN", { weekday: "short" });
  return `${d}/${mo} (${dayName})`;
};

const WEEKDAYS_VN = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1; // Monday = 0
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
};

const isSameDay = (y1, m1, d1, y2, m2, d2) =>
  y1 === y2 && m1 === m2 && d1 === d2;

/* ── Main Component ──────────────────────────────────────────── */
const BookingSchedule = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwnerOffline =
    location.pathname.includes("/owner/venues/") &&
    location.pathname.includes("/offline-booking") &&
    !location.pathname.includes("/offline-booking/confirm");
  const gridRef = useRef(null);
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get('date') || '';
  const prefillTimeRaw = searchParams.get('time') || '';
  const prefillTime = prefillTimeRaw ? prefillTimeRaw.slice(0,5) : '';

  const [venue, setVenue] = useState(null);
  const [fields, setFields] = useState([]);
  /** undefined = đang tải catalogue sân; null = không lọc; Set = cặp môn|tên hợp lệ từ GET /fields */
  const [fieldCatalogKeySet, setFieldCatalogKeySet] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedSlots, setSelectedSlots] = useState([]); // [{fieldIdx, slotIdx}]
  const initialMount = useRef(true);
  const didHydrateDraftRef = useRef(false);
  const dispatch = useDispatch();
  const draft = useSelector((s) => s.bookingDrafts?.[id]);
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const { openLogin } = useAuthModal();
  const [zoomLevel, setZoomLevel] = useState(50); // 50px to 100px column width
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tooltipField, setTooltipField] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [calYear, setCalYear] = useState(() => {
    const d = new Date(); return d.getFullYear();
  });
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return d.getMonth();
  });
  const [tempDate, setTempDate] = useState(null);
  const calendarRef = useRef(null);
  const zoomSliderRef = useRef(null);
  const [venueSchedule, setVenueSchedule] = useState(null);
  /** Slot bị chặn bởi sự kiện từ API lịch (unavailableSlots có eventId). Không gọi GET /Event list. */
  const [scheduleEventSlots, setScheduleEventSlots] = useState([]); // [{ fieldIdx, slotIdx, eventId }]
  // Cập nhật mỗi phút để slot "đã qua" (Khoá) được tính lại khi đang xem ngày hôm nay
  const [timeTick, setTimeTick] = useState(() => Date.now());
  useEffect(() => {
    if (selectedDate !== todayStr()) return;
    const id = setInterval(() => setTimeTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  // Tải chi tiết sân + catalogue GET /fields (sportType + name) để lọc hàng sân trên lịch đúng từng môn.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFields([]);
      setFieldCatalogKeySet(undefined);
      setVenue(null);
      try {
        const v = await getVenueDetail(id);
        let catalogRows = [];

        // Lưu ý: tránh gọi GET /fields hai lần trong tình huống hàng tồn tại từ getVenueDetail:
        // - Nếu getVenueDetail trả về 'fields' hoặc 'venueFields' thì dùng luôn.
        // - Chỉ gọi fetchVenueFieldCatalog(id) khi dữ liệu này không có sẵn (fallback).
        // Điều này ngăn việc gọi API field hai lần cùng lúc và giảm tải máy chủ.
        if (Array.isArray(v?.fields) && v.fields.length > 0) {
          catalogRows = v.fields;
        } else if (Array.isArray(v?.venueFields) && v.venueFields.length > 0) {
          catalogRows = v.venueFields;
        } else {
          catalogRows = await fetchVenueFieldCatalog(id).catch(() => []);
        }

        const allowed = new Set();
        for (const r of catalogRows || []) {
          const sport = String(r?.sportType ?? r?.SportType ?? "").trim();
          const name = String(r?.name ?? r?.Name ?? "").trim();
          if (!sport || !name) continue;
          allowed.add(`${normalizeText(sport)}|${normalizeText(name)}`);
        }

        setFieldCatalogKeySet(allowed.size > 0 ? allowed : null);
        setVenue({ ...v, id });
      } catch (err) {
        setError(err.message || "Không thể tải thông tin sân");
        setFieldCatalogKeySet(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // If page was opened with date/time params, prefill selectedDate and scroll to time
  useEffect(() => {
    if (prefillDate) setSelectedDate(prefillDate);
  }, [prefillDate]);

  // Reset selection on date change
  useEffect(() => {
    if (initialMount.current) {
      // skip clearing on initial mount so persisted selection can be restored
      initialMount.current = false;
      return;
    }
    setSelectedSlots([]);
  }, [selectedDate]);

  // Load persisted draft (from Redux) on mount
  useEffect(() => {
    if (!draft || didHydrateDraftRef.current) return;
    didHydrateDraftRef.current = true;

    if (draft.selectedDate && draft.selectedDate !== selectedDate) {
      setSelectedDate(draft.selectedDate);
    }
    if (Array.isArray(draft.selectedSlots) && draft.selectedSlots.length) {
      setSelectedSlots(draft.selectedSlots);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Persist draft to Redux (which is persisted to localStorage)
  useEffect(() => {
    try {
      dispatch(setDraft({ venueId: id, draft: { selectedDate, selectedSlots } }));
    } catch (e) {
      // ignore
    }
  }, [selectedDate, selectedSlots, dispatch, id]);

  // Close calendar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  // Generate time slots:
  // - Prefer server schedule (venueSchedule.sportTypes[].slots: StartTime/EndTime)
  // - Fallback to venue.openTime / venue.closeTime when schedule chưa tải
  const slots = useMemo(() => {
    try {
      if (venueSchedule?.sportTypes?.length) {
        const allSlots = [];
        venueSchedule.sportTypes.forEach((st) => {
          (st.slots || []).forEach((s) => allSlots.push(s));
        });
        if (allSlots.length) {
          const minStart = allSlots.reduce(
            (min, s) => (String(s.startTime) < String(min) ? s.startTime : min),
            allSlots[0].startTime
          );
          const maxEnd = allSlots.reduce(
            (max, s) => (String(s.endTime) > String(max) ? s.endTime : max),
            allSlots[0].endTime
          );
          const step = scheduleGlobalStepMinutes(venueSchedule.sportTypes);
          return generateSlots(minStart, maxEnd, step);
        }
      }
    } catch (e) {
      // ignore and fall back
    }
    return venue ? generateSlots(venue.openTime, venue.closeTime) : [];
  }, [venue, venueSchedule]);

  // Không cho lăn chuột thay đổi % zoom (range input mặc định của trình duyệt)
  useEffect(() => {
    const el = zoomSliderRef.current;
    if (!el) return;
    const preventWheel = (e) => e.preventDefault();
    el.addEventListener("wheel", preventWheel, { passive: false });
    return () => el.removeEventListener("wheel", preventWheel);
  }, [slots.length]);

  // Fetch server schedule (booked/unavailable slots) when venue or date changes
  useEffect(() => {
    if (!venue || !selectedDate || fieldCatalogKeySet === undefined) return;
    let mounted = true;

    const fetchAndDispatch = async () => {
        try {
          const raw = await getVenueSchedule(id, selectedDate);
          if (!mounted) return;
          const res =
            fieldCatalogKeySet && fieldCatalogKeySet.size > 0
              ? filterScheduleByFieldCatalog(raw, fieldCatalogKeySet)
              : raw;
          const fieldList = buildFieldsFromVenueSchedule(res);
          const serverSlots = [];
          (res?.sportTypes || []).forEach((st) => {
            (st.slots || []).forEach((s) => serverSlots.push(s));
          });

          // Build slots from response (giống useMemo) để map slotId -> idx, tránh phụ thuộc state slots gây loop
          let slotsForMap = [];
          if (serverSlots.length) {
            const minStart = serverSlots.reduce(
              (min, s) => (String(s.startTime) < String(min) ? s.startTime : min),
              serverSlots[0].startTime
            );
            const maxEnd = serverSlots.reduce(
              (max, s) => (String(s.endTime) > String(max) ? s.endTime : max),
              serverSlots[0].endTime
            );
            const step = scheduleGlobalStepMinutes(res?.sportTypes);
            slotsForMap = generateSlots(minStart, maxEnd, step);
          } else if (venue?.openTime && venue?.closeTime) {
            slotsForMap = generateSlots(venue.openTime, venue.closeTime);
          }

          const startToIdx = {};
          serverSlots.forEach((s) => {
            const hhmm = normalizeSlotTime(s.startTime);
            const idx = slotsForMap.findIndex((sl) => sl.label === hhmm);
            if (idx >= 0) startToIdx[s.slotId] = idx;
          });

          const booked = [];
          const scheduleEvents = [];
          (res?.sportTypes || []).forEach((st) => {
            const sportKey = (st.sportTypeName || st.sportType || '').trim().toLowerCase();
            (st.fields || []).forEach((f) => {
              const nameKey = (f.fieldName || f.name || '').trim();
              const fieldIdx = fieldList.findIndex(
                (ff) =>
                  normalizeText(ff.name || "") === normalizeText(nameKey) &&
                  normalizeText(ff.sportType || "") === sportKey
              );
              if (fieldIdx < 0) return;
              (f.unavailableSlots || []).forEach((us) => {
                const slotIdx = startToIdx[us.slotId ?? us.SlotId];
                if (slotIdx == null || slotIdx < 0) return;
                const eid = us.eventId ?? us.EventId;
                if (eid != null && eid !== '') {
                  const n = Number(eid);
                  if (!Number.isNaN(n)) scheduleEvents.push({ fieldIdx, slotIdx, eventId: n });
                } else {
                  // Nếu API có trả bookingId/reservationId cho unavailableSlots thì lưu lại để phân biệt các booking gần nhau
                  const bookingIdRaw =
                    us.bookingId ??
                    us.BookingId ??
                    us.bookingID ??
                    us.reservationId ??
                    us.ReservationId ??
                    us.booking_id ??
                    null;
                  const bookingId =
                    bookingIdRaw != null && bookingIdRaw !== ""
                      ? (() => {
                          const n = Number(bookingIdRaw);
                          return Number.isNaN(n) ? String(bookingIdRaw) : n;
                        })()
                      : null;
                  booked.push({ fieldIdx, slotIdx, bookingId });
                }
              });
            });
          });

          if (mounted) {
            setVenueSchedule(res);
            setFields(fieldList);
            setScheduleEventSlots(scheduleEvents);
            // Chỉ slot "đã đặt" (không gắn sự kiện) — slot có eventId hiển thị riêng + click xem chi tiết
            try {
              dispatch(setBookedSlotsFromServer({ venueId: String(id), date: selectedDate, slots: booked }));
            } catch (e) {}
          }
        } catch (e) {
          if (mounted) {
            setScheduleEventSlots([]);
          }
        }
    };

    // Call once on mount/when venue or date changes. Polling removed to avoid repeated API calls.
    fetchAndDispatch();
    return () => { mounted = false; };
  }, [venue, selectedDate, id, dispatch, fieldCatalogKeySet]);

  /** Mỗi môn: tập nhãn bắt đầu slot có trên API — cột không thuộc tập này là “khung trống”, không đặt được */
  const configuredSlotStartsBySport = useMemo(() => {
    const m = new Map();
    if (!venueSchedule?.sportTypes?.length) return m;
    venueSchedule.sportTypes.forEach((st) => {
      const key = normalizeText(st.sportTypeName || st.sportType || "");
      if (!key) return;
      const list = st.slots || [];
      if (!list.length) return;
      const set = new Set();
      list.forEach((s) => {
        const t = normalizeSlotTime(s.startTime ?? s.StartTime);
        if (t) set.add(t);
      });
      if (set.size) m.set(key, set);
    });
    return m;
  }, [venueSchedule]);

  /** Môn đã có trên lịch nhưng chưa cấu hình khung giờ (slots rỗng) → chỉ hiển thị lưới trống, không đặt được. */
  const sportKeysWithNoTimeSlots = useMemo(() => {
    const s = new Set();
    if (!venueSchedule?.sportTypes?.length) return s;
    venueSchedule.sportTypes.forEach((st) => {
      const key = normalizeText(st.sportTypeName || st.sportType || "");
      if (!key) return;
      const list = st.slots || [];
      if (!list.length) s.add(key);
    });
    return s;
  }, [venueSchedule]);

  const isUnconfiguredSlotStart = useCallback(
    (sportKey, startLabel) => {
      if (!sportKey || !startLabel) return false;
      const set = configuredSlotStartsBySport.get(sportKey);
      if (!set || set.size === 0) return false;
      return !set.has(startLabel);
    },
    [configuredSlotStartsBySport],
  );

  // Determine locked slots (past time for today) — phụ thuộc timeTick để cập nhật mỗi phút
  const lockedBefore = useMemo(() => {
    if (selectedDate !== todayStr()) return -1;
    if (!slots.length) return -1;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const idx = slots.findIndex((s) => s.h * 60 + s.m >= nowMin);
    return idx < 0 ? slots.length - 1 : idx - 1; // toàn bộ đã qua -> khóa hết
  }, [selectedDate, slots, timeTick]);

  // Scroll to prefill time column when available
  useEffect(() => {
    if (!prefillTime || !slots.length || !gridRef.current) return;
    const idx = slots.findIndex((s) => s.label === prefillTime);
    if (idx >= 0) {
      // approximate scroll: slot index * zoomLevel
      const colWidth = Math.max(50, zoomLevel);
      // Keep "locked/past" region in view (especially when prefillTime is around "now").
      // If lockedBefore = k, then slots[0..k] are past/locked; we shift so that at least that region remains visible.
      const pastSlotsVisible = Math.max(0, (lockedBefore ?? -1) + 1);
      gridRef.current.scrollLeft = Math.max(0, idx * colWidth - pastSlotsVisible * colWidth);
    }
  }, [prefillTime, slots, zoomLevel, lockedBefore]);

  const isLocked = useCallback(
    (slotIdx) => {
      if (selectedDate < todayStr()) return true;
      return slotIdx <= lockedBefore;
    },
    [selectedDate, lockedBefore]
  );

  const EMPTY_BOOKED = useMemo(() => [], []);

  // Raw booked slots for this venue/date (stable reference from Redux)
  const rawBookedForDate = useSelector(
    (s) => s.bookedSlots?.[id]?.[selectedDate] ?? EMPTY_BOOKED
  );
  // Memoize filtered list so selector doesn't return new reference every time
  const bookedForDate = useMemo(() => {
    const now = Date.now();
    return rawBookedForDate.filter((e) => !e.expiresAt || e.expiresAt > now);
  }, [rawBookedForDate]);

  const eventBlocks = useMemo(() => {
    const keys = new Set();
    scheduleEventSlots.forEach((x) => keys.add(`${x.fieldIdx}_${x.slotIdx}`));
    return keys;
  }, [scheduleEventSlots]);

  const eventIdByCell = useMemo(() => {
    const m = new Map();
    scheduleEventSlots.forEach((x) => {
      if (x.eventId != null && !Number.isNaN(Number(x.eventId))) {
        m.set(`${x.fieldIdx}_${x.slotIdx}`, Number(x.eventId));
      }
    });
    return m;
  }, [scheduleEventSlots]);

  const getEventIdForCell = useCallback(
    (fieldIdx, slotIdx) => eventIdByCell.get(`${fieldIdx}_${slotIdx}`) ?? null,
    [eventIdByCell]
  );

  /** Không còn gọi GET Event list → không có số vé còn lại; ô sự kiện từ lịch luôn kiểu "còn chỗ" (vàng) trừ khi sau này API lịch trả thêm. */
  const remainingByEventId = useMemo(() => new Map(), []);

  const isBooked = useCallback(
    (fieldIdx, slotIdx) => bookedForDate.some((b) => Number(b.fieldIdx) === Number(fieldIdx) && Number(b.slotIdx) === Number(slotIdx)),
    [bookedForDate]
  );

  const bookedIdByCell = useMemo(() => {
    const m = new Map();
    bookedForDate.forEach((b) => {
      const bid = b?.bookingId ?? b?.BookingId ?? null;
      if (bid == null || bid === "") return;
      m.set(`${Number(b.fieldIdx)}_${Number(b.slotIdx)}`, bid);
    });
    return m;
  }, [bookedForDate]);

  const getBookedIdForCell = useCallback(
    (fieldIdx, slotIdx) => bookedIdByCell.get(`${Number(fieldIdx)}_${Number(slotIdx)}`) ?? null,
    [bookedIdByCell]
  );

  const isEventBlock = useCallback(
    (fieldIdx, slotIdx) => eventBlocks.has(`${fieldIdx}_${slotIdx}`),
    [eventBlocks]
  );

  // If a slot becomes booked (e.g., after confirm/payment), remove it from current selection
  useEffect(() => {
    if (!selectedSlots || !selectedSlots.length) return;
    const remaining = selectedSlots.filter((s) => !isBooked(s.fieldIdx, s.slotIdx));
    if (remaining.length !== selectedSlots.length) {
      setSelectedSlots(remaining);
    }
  }, [bookedForDate]);

  // If a slot becomes event, remove it from current selection
  useEffect(() => {
    if (!selectedSlots || !selectedSlots.length) return;
    const remaining = selectedSlots.filter((s) => !isEventBlock(s.fieldIdx, s.slotIdx));
    if (remaining.length !== selectedSlots.length) {
      setSelectedSlots(remaining);
    }
  }, [eventBlocks]);

  const isSelected = useCallback(
    (fieldIdx, slotIdx) =>
      selectedSlots.some((s) => s.fieldIdx === fieldIdx && s.slotIdx === slotIdx),
    [selectedSlots]
  );

  const toggleSlot = (fieldIdx, slotIdx) => {
    // Allow selecting slots even when the user is not authenticated.
    // Authentication will be required when pressing the "TIẾP THEO" button.
    const sk = normalizeText(fields[fieldIdx]?.sportType || "");
    if (sportKeysWithNoTimeSlots.has(sk)) return;
    if (isUnconfiguredSlotStart(sk, slots[slotIdx]?.label)) return;
    if (isLocked(slotIdx) || isBooked(fieldIdx, slotIdx) || isEventBlock(fieldIdx, slotIdx)) return;
    setSelectedSlots((prev) => {
      const exists = prev.find((s) => s.fieldIdx === fieldIdx && s.slotIdx === slotIdx);
      if (exists) return prev.filter((s) => !(s.fieldIdx === fieldIdx && s.slotIdx === slotIdx));
      return [...prev, { fieldIdx, slotIdx }];
    });
  };

  const getCellClass = (fieldIdx, slotIdx) => {
    const skRow = normalizeText(fields[fieldIdx]?.sportType || "");
    if (sportKeysWithNoTimeSlots.has(skRow)) return "bs-cell no-config";
    if (isLocked(slotIdx)) return "bs-cell locked";
    const evId = getEventIdForCell(fieldIdx, slotIdx);
    if (evId != null) {
      const rem = remainingByEventId.get(evId);
      if (rem === 0) return "bs-cell event-linked";
      return "bs-cell event";
    }
    if (isEventBlock(fieldIdx, slotIdx)) return "bs-cell event";
    if (isBooked(fieldIdx, slotIdx)) return "bs-cell booked";
    const sk = skRow;
    const startLabel = slots[slotIdx]?.label;
    if (startLabel && isUnconfiguredSlotStart(sk, startLabel)) return "bs-cell locked";
    if (isSelected(fieldIdx, slotIdx)) return "bs-cell selected";
    return "bs-cell available";
  };

  /** Cùng một eventId trên một hàng: nối các ô liền kề thành một thanh */
  const getEventRunExtraClass = useCallback(
    (fieldIdx, slotIdx) => {
      const evId = getEventIdForCell(fieldIdx, slotIdx);
      if (evId == null) return "";
      const prev = slotIdx > 0 ? getEventIdForCell(fieldIdx, slotIdx - 1) : null;
      const next =
        slotIdx < slots.length - 1 ? getEventIdForCell(fieldIdx, slotIdx + 1) : null;
      const samePrev = prev === evId;
      const sameNext = next === evId;
      if (!samePrev && !sameNext) return "bs-event-run-single";
      if (!samePrev && sameNext) return "bs-event-run-start";
      if (samePrev && sameNext) return "bs-event-run-mid";
      if (samePrev && !sameNext) return "bs-event-run-end";
      return "";
    },
    [getEventIdForCell, slots.length]
  );

  /** Cùng trạng thái booked liền kề theo trục thời gian: nối các ô booked thành 1 khối */
  const getBookedRunExtraClass = useCallback(
    (fieldIdx, slotIdx) => {
      if (!isBooked(fieldIdx, slotIdx)) return "";
      const curId = getBookedIdForCell(fieldIdx, slotIdx);

      // If we have bookingId, use it to split different bookings even when they are adjacent.
      if (curId != null) {
        const prevId =
          slotIdx > 0 ? getBookedIdForCell(fieldIdx, slotIdx - 1) : null;
        const nextId =
          slotIdx < slots.length - 1 ? getBookedIdForCell(fieldIdx, slotIdx + 1) : null;

        const samePrev = prevId != null && prevId === curId;
        const sameNext = nextId != null && nextId === curId;

        if (!samePrev && !sameNext) return "bs-book-run-single";
        if (!samePrev && sameNext) return "bs-book-run-start";
        if (samePrev && sameNext) return "bs-book-run-mid";
        if (samePrev && !sameNext) return "bs-book-run-end";
        return "";
      }

      // Fallback: no bookingId => keep old behavior: merge by adjacency.
      const prevBooked = slotIdx > 0 ? isBooked(fieldIdx, slotIdx - 1) : false;
      const nextBooked = slotIdx < slots.length - 1 ? isBooked(fieldIdx, slotIdx + 1) : false;

      if (!prevBooked && !nextBooked) return "bs-book-run-single";
      if (!prevBooked && nextBooked) return "bs-book-run-start";
      if (prevBooked && nextBooked) return "bs-book-run-mid";
      if (prevBooked && !nextBooked) return "bs-book-run-end";
      return "";
    },
    [isBooked, slots.length, getBookedIdForCell]
  );

  const handleCellClick = (fieldIdx, slotIdx) => {
    const sk = normalizeText(fields[fieldIdx]?.sportType || "");
    if (sportKeysWithNoTimeSlots.has(sk)) return;
    if (isUnconfiguredSlotStart(sk, slots[slotIdx]?.label)) return;
    const evId = getEventIdForCell(fieldIdx, slotIdx);
    if (evId != null) {
      navigate(`/event/${evId}`, {
        state: {
          bookingScheduleReturn: {
            venueId: id,
            date: selectedDate,
          },
        },
      });
      return;
    }
    toggleSlot(fieldIdx, slotIdx);
  };

  // Group fields by sportType for visual separation
  const sportTypeColors = ['#eef7f0', '#eef1f7', '#f7f3ee', '#f2eef7', '#eef7f5', '#f7eeee'];
  const groupedFields = useMemo(() => {
    const groups = [];
    let currentType = null;
    fields.forEach((field, fi) => {
      const type = field.sportType || 'Khác';
      if (type !== currentType) {
        groups.push({ sportType: type, fields: [] });
        currentType = type;
      }
      groups[groups.length - 1].fields.push({ ...field, originalIdx: fi });
    });
    return groups;
  }, [fields]);

  /** Khung giờ hiển thị riêng theo từng môn (min–max từ venueSchedule.sportTypes[].slots, fallback giờ cơ sở). */
  const groupSlotsBySportKey = useMemo(() => {
    const map = new Map();
    for (const g of groupedFields) {
      const key = normalizeText(g.sportType);
      if (map.has(key)) continue;
      let arr = [];
      if (venueSchedule?.sportTypes?.length) {
        const st = venueSchedule.sportTypes.find(
          (x) => normalizeText(x.sportTypeName || x.sportType) === key,
        );
        const list = st?.slots || [];
        if (list.length) {
          const minStart = list.reduce(
            (min, s) => (String(s.startTime) < String(min) ? s.startTime : min),
            list[0].startTime,
          );
          const maxEnd = list.reduce(
            (max, s) => (String(s.endTime) > String(max) ? s.endTime : max),
            list[0].endTime,
          );
          const step = inferStepMinutesFromApiSlots(list);
          arr = generateSlots(minStart, maxEnd, step);
        }
      }
      if (!arr.length && venue?.openTime && venue?.closeTime) {
        arr = generateSlots(venue.openTime, venue.closeTime);
      }
      map.set(key, arr);
    }
    return map;
  }, [groupedFields, venueSchedule, venue]);

  const globalIdxForSlotLabel = useCallback(
    (label) => {
      if (!label || !slots.length) return -1;
      return slots.findIndex((s) => s.label === label);
    },
    [slots],
  );

  // Build grouped slot summary for the bottom bar.
  // Price comes from venueSchedule (server slot: SlotId, StartTime, EndTime, Price) when available.
  const slotSummary = useMemo(() => {
    if (!selectedSlots.length || !slots.length) return { groups: [], totalMinutes: 0, totalPrice: 0 };

    // (sportTypeName, startTimeLabel) -> price from API slots (Id, StartTime, EndTime, Price)
    const priceBySportAndTime = {};
    if (venueSchedule?.sportTypes) {
      venueSchedule.sportTypes.forEach((st) => {
        const sportKey = (st.sportTypeName || st.sportType || "").trim().toLowerCase();
        (st.slots || []).forEach((s) => {
          const timeKey = normalizeSlotTime(s.startTime);
          if (timeKey) priceBySportAndTime[`${sportKey}:${timeKey}`] = Number(s.price) || 0;
        });
      });
    }

    // Group by fieldIdx
    const map = {};
    selectedSlots.forEach(({ fieldIdx, slotIdx }) => {
      if (!map[fieldIdx]) map[fieldIdx] = [];
      map[fieldIdx].push(slotIdx);
    });

    const groups = Object.entries(map).map(([fi, slotIdxs]) => {
      const sorted = [...slotIdxs].sort((a, b) => a - b);
      const ranges = [];
      let rangeStart = sorted[0];
      let rangeEnd = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === rangeEnd + 1) {
          rangeEnd = sorted[i];
        } else {
          ranges.push({ from: rangeStart, to: rangeEnd });
          rangeStart = sorted[i];
          rangeEnd = sorted[i];
        }
      }
      ranges.push({ from: rangeStart, to: rangeEnd });

      const fiNum = Number(fi);
      const field = fields[fiNum];
      const fieldName = field?.name || `Sân ${fiNum + 1}`;
      const sportKey = (field?.sportType || "").trim().toLowerCase();
      // Price per slot: from server (venueSchedule) by sportType + startTime, else fallback
      const firstSlotLabel = slots[sorted[0]]?.label;
      const pricePerSlot =
        firstSlotLabel != null && priceBySportAndTime[`${sportKey}:${firstSlotLabel}`] != null
          ? priceBySportAndTime[`${sportKey}:${firstSlotLabel}`]
          : (field?.pricePerSlot != null ? Number(field.pricePerSlot) : 0);
      const fieldId = (field && (field.id ?? field.fieldId)) ?? fiNum;
      const rangeLabels = ranges.map((r) => {
        const startLabel = slots[r.from]?.label || "";
        const endNext = slots[r.to + 1];
        let endLabel;
        if (endNext) endLabel = endNext.label;
        else {
          const last = slots[r.to];
          const step = last?.stepMinutes ?? 60;
          const endMin = (last?.h ?? 0) * 60 + (last?.m ?? 0) + step;
          endLabel = formatSlot(Math.floor(endMin / 60), endMin % 60);
        }
        return `${startLabel} - ${endLabel}`;
      });

      const groupTotalMinutes = sorted.reduce((sum, idx) => {
        const cur = slots[idx];
        const next = slots[idx + 1];
        if (cur && next) return sum + (next.h * 60 + next.m - (cur.h * 60 + cur.m));
        if (cur) return sum + (cur.stepMinutes ?? 60);
        return sum;
      }, 0);

      return {
        fieldName,
        ranges: rangeLabels,
        slotCount: sorted.length,
        pricePerSlot,
        fieldId,
        totalMinutes: groupTotalMinutes,
      };
    });

    const totalMinutes = groups.reduce((sum, g) => sum + (g.totalMinutes || 0), 0);
    const totalPrice = groups.reduce((sum, g) => sum + g.slotCount * g.pricePerSlot, 0);
    return { groups, totalMinutes, totalPrice };
  }, [selectedSlots, slots, fields, venue, venueSchedule]);

  const handleMouseDown = (e) => {
    if (!gridRef.current) return;
    setIsDragging(true);
    setDragStart(e.clientX);
    gridRef.current.dataset.scrollStart = gridRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !gridRef.current) return;
    e.preventDefault();
    const delta = e.clientX - dragStart;
    gridRef.current.scrollLeft = Number(gridRef.current.dataset.scrollStart) - delta;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="bs-loading">
        <Loader2 size={32} className="bs-spinner" />
        <p>Đang tải lịch đặt sân...</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !venue) {
    return (
      <div className="bs-error">
        <h2>Không thể tải lịch sân</h2>
        <p>{error || "Sân không tồn tại."}</p>
        <button
          onClick={() => (isOwnerOffline ? navigate("/owner/venues") : navigate(-1))}
          className="bs-back-link"
        >
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
      <div className="bs-main">
        {/* Top bar */}
        <div className="bs-topbar">
          <button
            className="bs-back"
            onClick={() => (isOwnerOffline ? navigate("/owner/venues") : navigate(-1))}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="bs-title">
            {isOwnerOffline ? "Đặt sân offline" : "Đặt lịch ngày trực quan"}
          </h1>
          <div className="bs-date-picker" ref={calendarRef}>
            <span
              className="bs-date-display"
              onClick={() => {
                const [y, m] = selectedDate.split("-").map(Number);
                setCalYear(y);
                setCalMonth(m - 1);
                setTempDate(selectedDate);
                setShowCalendar((v) => !v);
              }}
            >
              {formatDateVN(selectedDate)} <Calendar size={18} />
            </span>

            {showCalendar && (() => {
              const today = new Date();
              const todayY = today.getFullYear();
              const todayM = today.getMonth();
              const todayD = today.getDate();
              const days = getCalendarDays(calYear, calMonth);
              const monthLabel = new Date(calYear, calMonth).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
              const [selY, selM, selD] = (tempDate || selectedDate).split("-").map(Number);

              const canPrevMonth = calYear > todayY || (calYear === todayY && calMonth > todayM);

              return (
                <div className="bs-calendar-popup">
                  <div className="bs-cal-header">
                    <button
                      className="bs-cal-nav"
                      onClick={() => {
                        if (!canPrevMonth) return;
                        if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
                        else setCalMonth(calMonth - 1);
                      }}
                      disabled={!canPrevMonth}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="bs-cal-month">{monthLabel}</span>
                    <button
                      className="bs-cal-nav"
                      onClick={() => {
                        if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
                        else setCalMonth(calMonth + 1);
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className="bs-cal-weekdays">
                    {WEEKDAYS_VN.map((w) => <div key={w} className="bs-cal-wd">{w}</div>)}
                  </div>
                  <div className="bs-cal-grid">
                    {days.map((d, i) => {
                      if (d === null) return <div key={`e${i}`} className="bs-cal-day empty" />;
                      const isToday = isSameDay(calYear, calMonth, d, todayY, todayM, todayD);
                      const isSelected = isSameDay(calYear, calMonth + 1, d, selY, selM, selD);
                      const isPast = new Date(calYear, calMonth, d) < new Date(todayY, todayM, todayD);
                      return (
                        <div
                          key={d}
                          className={`bs-cal-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}${isPast ? " past" : ""}`}
                          onClick={() => {
                            if (isPast) return;
                            const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            setTempDate(ds);
                          }}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>
                  <div className="bs-cal-footer">
                    <button className="bs-cal-cancel" onClick={() => setShowCalendar(false)}>Hủy</button>
                    <button
                      className="bs-cal-confirm"
                      onClick={() => {
                        if (tempDate) setSelectedDate(tempDate);
                        setShowCalendar(false);
                      }}
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Venue Info Card */}
        {venue && (
          <div className="bs-venue-card">
            <div className="bs-vc-left">
              <h2 className="bs-vc-name">{venue.name}</h2>
              <div className="bs-vc-info">
                <span>⏰ {formatTime(venue.openTime)} – {formatTime(venue.closeTime)}</span>
              </div>
            </div>
            <div className="bs-vc-right">
              <span className="bs-vc-badge">{fields.length} sân</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bs-legend">
          <div className="bs-legend-item">
            <span className="bs-legend-box available" /> Trống
          </div>
          <div className="bs-legend-item">
            <span className="bs-legend-box selected" /> Đang chọn
          </div>
          <div className="bs-legend-item">
            <span className="bs-legend-box booked" /> Đã đặt
          </div>
          <div className="bs-legend-item bs-legend-item--locked">
            <span className="bs-legend-box locked" /> Khoá
          </div>
          <div className="bs-legend-item">
            <span className="bs-legend-box event" /> Sự kiện (còn chỗ)
          </div>
          <div className="bs-legend-item">
            <span className="bs-legend-box event-linked" /> Sự kiện (đã đầy)
          </div>
        </div>

        {/* Time Range Slider */}
        {slots.length > 0 && (
          <div className="bs-time-filter">
            <div className="bs-time-filter-label">🔍 {Math.round((zoomLevel / 50) * 100)}%</div>
            <div className="bs-time-range-container">
              <input
                ref={zoomSliderRef}
                type="range"
                min="50"
                max="100"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                className="bs-time-slider"
              />
              <span className="bs-time-display">
                {Math.round((zoomLevel / 50) * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        {fields.length > 0 && slots.length > 0 ? (
          <div className="bs-grid-wrapper-outer">
            {/* Notice bar */}
            <div className="bs-notice">
              <span className="bs-notice-icon">⚠️</span>
              <span><strong>Lưu ý:</strong> Nếu bạn cần đặt lịch cố định vui lòng liên hệ hotline để được hỗ trợ.</span>
            </div>

            <div
              className={`bs-grid-wrapper ${isDragging ? 'dragging' : ''}`}
              ref={gridRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {groupedFields.map((group, gi) => {
                const gSlots = groupSlotsBySportKey.get(normalizeText(group.sportType)) || [];
                if (!gSlots.length) return null;
                const groupSportKeyNorm = normalizeText(group.sportType);
                const isNoScheduleGroup = sportKeysWithNoTimeSlots.has(groupSportKeyNorm);
                const gTimeLabelsRow = buildTimeLabels(gSlots);
                return (
                  <div key={`${normalizeText(group.sportType)}-${gi}`} className="bs-sport-block">
                    <div
                      className="bs-grid"
                      style={{
                        gridTemplateColumns: `minmax(72px, 88px) repeat(${gSlots.length}, ${zoomLevel}px) 0px`,
                      }}
                    >
                      <div
                        className="bs-sport-header"
                        style={{
                          gridColumn: "1 / -1",
                          background: sportTypeColors[gi % sportTypeColors.length],
                          borderLeft: `4px solid ${["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444"][gi % 6]}`,
                        }}
                      >
                        <span className="bs-sport-header-icon">
                          {["⚽", "🏸", "🎾", "🏐", "⚾", "🏓"][gi % 6]}
                        </span>
                        <span className="bs-sport-header-name">{group.sportType}</span>
                        <span className="bs-sport-header-count">{group.fields.length} sân</span>
                        <span className="bs-sport-header-hours">
                          <span className="bs-sport-header-hours-range">
                            {gSlots[0]?.label} –{" "}
                            {(() => {
                              const last = gSlots[gSlots.length - 1];
                              const step = last?.stepMinutes ?? 60;
                              const endMin = (last?.h ?? 0) * 60 + (last?.m ?? 0) + step;
                              return formatSlot(Math.floor(endMin / 60), endMin % 60);
                            })()}
                          </span>
                          {isNoScheduleGroup ? (
                            <span className="bs-sport-header-empty-label">Lịch trống</span>
                          ) : null}
                        </span>
                      </div>

                      <div className="bs-corner" />
                      {gTimeLabelsRow.map((s, i) => (
                        <div
                          key={i}
                          className={`bs-time-label${s.m === 0 ? " hour" : " half"}${i === 0 ? " first" : ""}${i === gTimeLabelsRow.length - 1 ? " last" : ""}`}
                        >
                          <span>{s.label}</span>
                        </div>
                      ))}

                      <div className="bs-bar-corner" />
                      {gSlots.map((_, i) => (
                        <div key={i} className="bs-tick-cell">
                          <span className="bs-tick" />
                        </div>
                      ))}
                      <div
                        className="bs-tick-cell"
                        style={{ background: "transparent", borderBottom: "1px solid #d1d5db" }}
                      />

                      {group.fields.map((field) => (
                        <React.Fragment key={field.originalIdx}>
                          <div
                            className="bs-field-label"
                            style={{ background: sportTypeColors[gi % sportTypeColors.length] }}
                            title={getFieldDisplayName(field)}
                            onMouseEnter={(e) => {
                              setTooltipField(field);
                              setTooltipPos(tooltipPositionFromEvent(e));
                            }}
                            onMouseMove={(e) => {
                              setTooltipPos(tooltipPositionFromEvent(e));
                            }}
                            onMouseLeave={() => setTooltipField(null)}
                          >
                            <span className="bs-field-name">{getFieldDisplayName(field)}</span>
                          </div>
                          {gSlots.map((gs, si) => {
                            const globalSi = globalIdxForSlotLabel(gs.label);
                            const eid =
                              !isNoScheduleGroup && globalSi >= 0
                                ? getEventIdForCell(field.originalIdx, globalSi)
                                : null;
                            const rem = eid != null ? remainingByEventId.get(eid) : undefined;
                            const cellClass = isNoScheduleGroup
                              ? "bs-cell no-config"
                              : globalSi >= 0
                                ? `${getCellClass(field.originalIdx, globalSi)} ${getEventRunExtraClass(field.originalIdx, globalSi)} ${getBookedRunExtraClass(field.originalIdx, globalSi)}`.trim()
                                : "bs-cell locked";
                            return (
                              <div
                                key={`${field.originalIdx}-${si}-${gs.label}`}
                                className={cellClass}
                                onClick={() =>
                                  !isNoScheduleGroup && globalSi >= 0
                                    ? handleCellClick(field.originalIdx, globalSi)
                                    : undefined
                                }
                                role={
                                  isNoScheduleGroup ? undefined : eid != null ? "link" : "button"
                                }
                                data-event-nav={!isNoScheduleGroup && eid != null ? "true" : undefined}
                                title={
                                  isNoScheduleGroup
                                    ? "Lịch trống — chưa cấu hình khung giờ cho môn này"
                                    : eid != null
                                      ? rem === 0
                                        ? "Sự kiện đã đầy — xem chi tiết"
                                        : "Sự kiện còn chỗ — xem chi tiết"
                                      : undefined
                                }
                              />
                            );
                          })}
                          <div />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bs-empty">
            <p>Chưa có sân hoặc khung giờ nào được thiết lập.</p>
          </div>
        )}

      </div>

      {/* Sticky bottom bar */}
      <div className="bs-bottom-bar">
        {selectedSlots.length > 0 && (
          <div className="bs-bottom-info">
            <span className="bs-bottom-info-badge">
              {selectedSlots.length} khung giờ · {Math.floor(slotSummary.totalMinutes / 60)}h{slotSummary.totalMinutes % 60 > 0 ? slotSummary.totalMinutes % 60 : ""}
            </span>
            <div className="bs-bottom-info-popup">
              {slotSummary.groups.map((g, i) => (
                <div key={i} className="bs-popup-row">
                  <strong>{g.fieldName}:</strong> {g.ranges.join(", ")}
                </div>
              ))}
              <div className="bs-popup-total">
                Tổng giờ: <strong>{Math.floor(slotSummary.totalMinutes / 60)}h{slotSummary.totalMinutes % 60 > 0 ? slotSummary.totalMinutes % 60 : ""}</strong>
              </div>
              {slotSummary.totalPrice > 0 && (
                <div className="bs-popup-total">
                  Tổng tiền: <strong>{slotSummary.totalPrice.toLocaleString("vi-VN")} đ</strong>
                </div>
              )}
            </div>
          </div>
        )}
        
        <button
          className={`bs-next-btn${selectedSlots.length === 0 ? " disabled" : ""}`}
          disabled={selectedSlots.length === 0}
          onClick={() => {
            if (!isOwnerOffline && !isAuthenticated) {
              openLogin();
              return;
            }
            if (isOwnerOffline) {
              navigate(`/owner/venues/${id}/offline-booking/confirm`, {
                state: {
                  venue,
                  fields,
                  selectedDate,
                  selectedSlots,
                  slots,
                  slotSummary,
                  venueSchedule,
                  walkIn: true,
                },
              });
              return;
            }
            navigate(`/venue/${id}/booking/confirm`, {
              state: {
                venue,
                fields,
                selectedDate,
                selectedSlots,
                slots,
                slotSummary,
                venueSchedule,
              },
            });
          }}
        >
          TIẾP THEO
        </button>
        {selectedSlots.length > 0 && (
          <span className="bs-bottom-price">
            Tổng tiền: <strong>{slotSummary.totalPrice > 0 ? `${slotSummary.totalPrice.toLocaleString("vi-VN")} đ` : "--"}</strong>
          </span>
        )}
      </div>

      {/* Tooltip phóng to: chỉ tên sân (không tải ảnh) */}
      {tooltipField ? (
        <div
          className="bs-field-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          role="tooltip"
        >
          <span className="bs-field-tooltip-name">{getFieldDisplayName(tooltipField)}</span>
        </div>
      ) : null}

    </motion.div>
  );
};

export default BookingSchedule;
