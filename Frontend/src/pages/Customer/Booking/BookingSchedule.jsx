import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Loader2, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { getVenueDetail, getVenueSchedule } from "../../../services/fieldService";
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

const BASE_GRID_STEP_MINUTES = 30;

const addMinutesToLabel = (label, plusMinutes) => {
  const t = parseTime(label);
  if (!t) return "";
  const total = t.h * 60 + t.m + Number(plusMinutes || 0);
  return formatSlot(Math.floor(total / 60), total % 60);
};

/** Tên đầy đủ hiển thị / tooltip */
const getFieldDisplayName = (field) =>
  String(field?.name ?? field?.fieldName ?? field?.Name ?? field?.FieldName ?? "Sân").trim() || "Sân";

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
  const clampZoom = useCallback((value) => Math.min(100, Math.max(50, value)), []);
  useEffect(() => {
    if (selectedDate !== todayStr()) return;
    const id = setInterval(() => setTimeTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  // Tải chi tiết venue (metadata + fallback giờ mở cửa). Danh sách sân & slot lấy từ GET schedule.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFields([]);
      setVenue(null);
      try {
        const v = await getVenueDetail(id);
        setVenue({ ...v, id });
      } catch (err) {
        setError(err.message || "Không thể tải thông tin sân");
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
          const step = BASE_GRID_STEP_MINUTES;
          return generateSlots(minStart, maxEnd, step);
        }
      }
    } catch (e) {
      // ignore and fall back
    }
    return venue ? generateSlots(venue.openTime, venue.closeTime, BASE_GRID_STEP_MINUTES) : [];
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
    if (!venue || !selectedDate) return;
    let mounted = true;

    const fetchAndDispatch = async () => {
        try {
          const res = await getVenueSchedule(id, selectedDate);
          if (!mounted) return;
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
            const step = BASE_GRID_STEP_MINUTES;
            slotsForMap = generateSlots(minStart, maxEnd, step);
          } else if (venue?.openTime && venue?.closeTime) {
            slotsForMap = generateSlots(venue.openTime, venue.closeTime, BASE_GRID_STEP_MINUTES);
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
  }, [venue, selectedDate, id, dispatch]);

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

  const slotSpanBySportAndStart = useMemo(() => {
    const m = new Map();
    if (!venueSchedule?.sportTypes?.length) return m;
    venueSchedule.sportTypes.forEach((st) => {
      const sportKey = normalizeText(st.sportTypeName || st.sportType || "");
      if (!sportKey) return;
      const spanMap = new Map();
      (st.slots || []).forEach((s) => {
        const start = normalizeSlotTime(s.startTime ?? s.StartTime);
        const dur = apiSlotDurationMinutes(s);
        if (!start || !dur || dur <= 0) return;
        const span = Math.max(1, Math.round(dur / BASE_GRID_STEP_MINUTES));
        const prev = spanMap.get(start) ?? 1;
        spanMap.set(start, Math.max(prev, span));
      });
      m.set(sportKey, spanMap);
    });
    return m;
  }, [venueSchedule]);

  const slotContinuationStartsBySport = useMemo(() => {
    const m = new Map();
    slotSpanBySportAndStart.forEach((spanMap, sportKey) => {
      const set = new Set();
      spanMap.forEach((span, startLabel) => {
        for (let i = 1; i < span; i++) {
          set.add(addMinutesToLabel(startLabel, i * BASE_GRID_STEP_MINUTES));
        }
      });
      m.set(sportKey, set);
    });
    return m;
  }, [slotSpanBySportAndStart]);

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

  // Khóa slot đã qua (ngày hôm nay): dựa trên thời điểm *kết thúc* khung chứ không phải chỉ giờ bắt đầu
  // (tránh coi slot 13:00–14:00 là “đã qua” ngay từ 13:01).
  const lockedBefore = useMemo(() => {
    if (selectedDate !== todayStr()) return -1;
    if (!slots.length) return -1;
    const now = new Date(timeTick);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slotEndMin = (s) => s.h * 60 + s.m + (s.stepMinutes ?? 60);
    const idx = slots.findIndex((s) => slotEndMin(s) > nowMin);
    if (idx < 0) return slots.length - 1;
    return idx - 1;
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
    setSelectedSlots((prev) => {
      if (!prev.length) return prev;
      const remaining = prev.filter((s) => !isBooked(s.fieldIdx, s.slotIdx));
      return remaining.length === prev.length ? prev : remaining;
    });
  }, [isBooked]);

  // If a slot becomes event, remove it from current selection
  useEffect(() => {
    setSelectedSlots((prev) => {
      if (!prev.length) return prev;
      const remaining = prev.filter((s) => !isEventBlock(s.fieldIdx, s.slotIdx));
      return remaining.length === prev.length ? prev : remaining;
    });
  }, [isEventBlock]);

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
    const past = isLocked(slotIdx);
    if (sportKeysWithNoTimeSlots.has(skRow)) return "bs-cell no-config";

    const evId = getEventIdForCell(fieldIdx, slotIdx);
    if (evId != null) {
      return `bs-cell event${past ? " past" : ""}`;
    }
    if (isEventBlock(fieldIdx, slotIdx)) {
      return `bs-cell event${past ? " past" : ""}`;
    }
    if (isBooked(fieldIdx, slotIdx)) {
      // Không hiển thị booking đã qua — chỉ như ô khóa (cùng hàng với nối locked-run)
      if (past) return "bs-cell locked";
      return "bs-cell booked";
    }

    if (past) return "bs-cell locked";

    const sk = skRow;
    const startLabel = slots[slotIdx]?.label;
    if (startLabel && isUnconfiguredSlotStart(sk, startLabel)) return "bs-cell locked";
    if (isSelected(fieldIdx, slotIdx)) return "bs-cell selected";
    return "bs-cell available";
  };

  /** Ô khóa (đã qua / cột không mở bán) — dùng chung cho nối liền */
  const isLockedSlotCell = useCallback(
    (fieldIdx, slotIdx) => {
      if (slotIdx < 0 || slotIdx >= slots.length) return false;
      const skRow = normalizeText(fields[fieldIdx]?.sportType || "");
      if (sportKeysWithNoTimeSlots.has(skRow)) return false;
      if (getEventIdForCell(fieldIdx, slotIdx) != null || isEventBlock(fieldIdx, slotIdx)) return false;
      if (isBooked(fieldIdx, slotIdx)) return isLocked(slotIdx);
      if (isLocked(slotIdx)) return true;
      const startLabel = slots[slotIdx]?.label;
      return !!(startLabel && isUnconfiguredSlotStart(skRow, startLabel));
    },
    [
      slots,
      fields,
      sportKeysWithNoTimeSlots,
      getEventIdForCell,
      isEventBlock,
      isBooked,
      isLocked,
      isUnconfiguredSlotStart,
    ],
  );

  /** Slot khóa liền kề → một thanh; gồm cả booking đã qua (đang hiện như locked) */
  const getLockedRunExtraClass = useCallback(
    (fieldIdx, slotIdx) => {
      if (!isLockedSlotCell(fieldIdx, slotIdx)) return "";
      const prevLocked = slotIdx > 0 && isLockedSlotCell(fieldIdx, slotIdx - 1);
      const nextLocked = slotIdx < slots.length - 1 && isLockedSlotCell(fieldIdx, slotIdx + 1);
      if (!prevLocked && !nextLocked) return "bs-lock-run-single";
      if (!prevLocked && nextLocked) return "bs-lock-run-start";
      if (prevLocked && nextLocked) return "bs-lock-run-mid";
      if (prevLocked && !nextLocked) return "bs-lock-run-end";
      return "";
    },
    [isLockedSlotCell, slots.length],
  );

  /** Cùng eventId trên một hàng: chỉ nối ô liền kề cùng một sự kiện */
  const getEventRunExtraClass = useCallback(
    (fieldIdx, slotIdx) => {
      const curId = getEventIdForCell(fieldIdx, slotIdx);
      const isEv = curId != null || isEventBlock(fieldIdx, slotIdx);
      if (!isEv) return "";

      let samePrev = false;
      let sameNext = false;
      if (curId != null) {
        const prevId = slotIdx > 0 ? getEventIdForCell(fieldIdx, slotIdx - 1) : null;
        const nextId =
          slotIdx < slots.length - 1 ? getEventIdForCell(fieldIdx, slotIdx + 1) : null;
        samePrev = prevId != null && prevId === curId;
        sameNext = nextId != null && nextId === curId;
      } else {
        samePrev = slotIdx > 0 && isEventBlock(fieldIdx, slotIdx - 1);
        sameNext = slotIdx < slots.length - 1 && isEventBlock(fieldIdx, slotIdx + 1);
      }

      if (!samePrev && !sameNext) return "bs-event-run-single";
      if (!samePrev && sameNext) return "bs-event-run-start";
      if (samePrev && sameNext) return "bs-event-run-mid";
      if (samePrev && !sameNext) return "bs-event-run-end";
      return "";
    },
    [getEventIdForCell, isEventBlock, slots.length],
  );

  /** Cùng trạng thái booked liền kề theo trục thời gian: nối các ô booked thành 1 khối */
  const getBookedRunExtraClass = useCallback(
    (fieldIdx, slotIdx) => {
      if (!isBooked(fieldIdx, slotIdx)) return "";
      if (isLocked(slotIdx)) return "";
      const curId = getBookedIdForCell(fieldIdx, slotIdx);

      // If we have bookingId, use it to split different bookings even when they are adjacent.
      if (curId != null) {
        const prevOpen = slotIdx > 0 && !isLocked(slotIdx - 1);
        const nextOpen = slotIdx < slots.length - 1 && !isLocked(slotIdx + 1);
        const prevId =
          slotIdx > 0 ? getBookedIdForCell(fieldIdx, slotIdx - 1) : null;
        const nextId =
          slotIdx < slots.length - 1 ? getBookedIdForCell(fieldIdx, slotIdx + 1) : null;

        const samePrev = prevOpen && prevId != null && prevId === curId;
        const sameNext = nextOpen && nextId != null && nextId === curId;

        if (!samePrev && !sameNext) return "bs-book-run-single";
        if (!samePrev && sameNext) return "bs-book-run-start";
        if (samePrev && sameNext) return "bs-book-run-mid";
        if (samePrev && !sameNext) return "bs-book-run-end";
        return "";
      }

      // Fallback: no bookingId => merge theo ô booked còn hiển thị (bỏ qua ô đã qua).
      const prevBooked =
        slotIdx > 0 && isBooked(fieldIdx, slotIdx - 1) && !isLocked(slotIdx - 1);
      const nextBooked =
        slotIdx < slots.length - 1 &&
        isBooked(fieldIdx, slotIdx + 1) &&
        !isLocked(slotIdx + 1);

      if (!prevBooked && !nextBooked) return "bs-book-run-single";
      if (!prevBooked && nextBooked) return "bs-book-run-start";
      if (prevBooked && nextBooked) return "bs-book-run-mid";
      if (prevBooked && !nextBooked) return "bs-book-run-end";
      return "";
    },
    [isBooked, isLocked, slots.length, getBookedIdForCell]
  );

  const handleCellClick = (fieldIdx, slotIdx) => {
    const sk = normalizeText(fields[fieldIdx]?.sportType || "");
    if (sportKeysWithNoTimeSlots.has(sk)) return;
    if (isUnconfiguredSlotStart(sk, slots[slotIdx]?.label)) return;
    if (isLocked(slotIdx)) return;
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
          const step = BASE_GRID_STEP_MINUTES;
          arr = generateSlots(minStart, maxEnd, step);
        }
      }
      if (!arr.length && venue?.openTime && venue?.closeTime) {
        arr = generateSlots(venue.openTime, venue.closeTime, BASE_GRID_STEP_MINUTES);
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

  /** Cột ngoài lưới giờ global (nhãn nhóm môn vs slots tổng) — locked, nối liền theo hàng nhóm */
  const getOffGridLockedRunClass = useCallback(
    (si, gSlotsArr) => {
      if (!gSlotsArr?.length) return "";
      const label = gSlotsArr[si]?.label;
      if (label == null) return "";
      const cur = globalIdxForSlotLabel(label) < 0;
      if (!cur) return "";
      const prev =
        si > 0 && globalIdxForSlotLabel(gSlotsArr[si - 1]?.label) < 0;
      const next =
        si < gSlotsArr.length - 1 &&
        globalIdxForSlotLabel(gSlotsArr[si + 1]?.label) < 0;
      if (!prev && !next) return "bs-lock-run-single";
      if (!prev && next) return "bs-lock-run-start";
      if (prev && next) return "bs-lock-run-mid";
      if (prev && !next) return "bs-lock-run-end";
      return "";
    },
    [globalIdxForSlotLabel],
  );

  // Build grouped slot summary for the bottom bar.
  // Price comes from venueSchedule (server slot: SlotId, StartTime, EndTime, Price) when available.
  const slotSummary = useMemo(() => {
    if (!selectedSlots.length || !slots.length) return { groups: [], totalMinutes: 0, totalPrice: 0 };

    // (sportTypeName, startTimeLabel) -> info from API slots (Price + Duration)
    const priceBySportAndTime = {};
    const durationBySportAndTime = {};
    if (venueSchedule?.sportTypes) {
      venueSchedule.sportTypes.forEach((st) => {
        const sportKey = (st.sportTypeName || st.sportType || "").trim().toLowerCase();
        (st.slots || []).forEach((s) => {
          const timeKey = normalizeSlotTime(s.startTime);
          if (!timeKey) return;
          priceBySportAndTime[`${sportKey}:${timeKey}`] = Number(s.price) || 0;
          const dur = apiSlotDurationMinutes(s);
          if (dur != null && dur > 0) durationBySportAndTime[`${sportKey}:${timeKey}`] = dur;
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

      const segments = sorted
        .map((idx) => {
          const startLabel = slots[idx]?.label;
          const t = parseTime(startLabel);
          if (!startLabel || !t) return null;
          const duration =
            durationBySportAndTime[`${sportKey}:${startLabel}`] ??
            slots[idx]?.stepMinutes ??
            BASE_GRID_STEP_MINUTES;
          const startMin = t.h * 60 + t.m;
          return { startMin, endMin: startMin + duration };
        })
        .filter(Boolean)
        .sort((a, b) => a.startMin - b.startMin);

      const merged = [];
      segments.forEach((seg) => {
        const last = merged[merged.length - 1];
        if (!last || seg.startMin > last.endMin) {
          merged.push({ ...seg });
        } else {
          last.endMin = Math.max(last.endMin, seg.endMin);
        }
      });

      const rangeLabels = merged.map((r) => {
        const sH = Math.floor(r.startMin / 60);
        const sM = r.startMin % 60;
        const eH = Math.floor(r.endMin / 60);
        const eM = r.endMin % 60;
        return `${formatSlot(sH, sM)} - ${formatSlot(eH, eM)}`;
      });

      const groupTotalMinutes = segments.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);

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
  }, [selectedSlots, slots, fields, venueSchedule]);

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

  const promptLoginBeforeBooking = useCallback(() => {
    Swal.fire({
      title: "Yêu cầu đăng nhập",
      text: "Bạn cần đăng nhập để tiếp tục đặt sân.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Đăng nhập",
      cancelButtonText: "Để sau",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#94a3b8",
    }).then((result) => {
      if (result.isConfirmed) {
        openLogin();
      }
    });
  }, [openLogin]);

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
            <span className="bs-legend-box event" /> Sự kiện
          </div>
        </div>

        {/* Time Range Slider */}
        {slots.length > 0 && (
          <div className={`bs-time-filter${isOwnerOffline ? " is-owner" : ""}`}>
            <div className="bs-time-filter-label"></div>
            <div className="bs-time-range-container">
              <button
                type="button"
                className="bs-zoom-btn"
                onClick={() => setZoomLevel((z) => clampZoom(z - 10))}
                aria-label="Giảm thu phóng"
              >
                <Minus size={14} />
              </button>
              <input
                ref={zoomSliderRef}
                type="range"
                min="50"
                max="100"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(clampZoom(parseInt(e.target.value, 10)))}
                className="bs-time-slider"
              />
              <button
                type="button"
                className="bs-zoom-btn"
                onClick={() => setZoomLevel((z) => clampZoom(z + 10))}
                aria-label="Tăng thu phóng"
              >
                <Plus size={14} />
              </button>
              <span className="bs-time-display">{Math.round((zoomLevel / 50) * 100)}%</span>
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
                        <div className="bs-sport-header-main">
                          <span className="bs-sport-header-icon">
                            {["⚽", "🏸", "🎾", "🏐", "⚾", "🏓"][gi % 6]}
                          </span>
                          <span className="bs-sport-header-name">{group.sportType}</span>
                          <span className="bs-sport-header-count">{group.fields.length} sân</span>
                        </div>
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
                          {isNoScheduleGroup ? (
                            <div
                              className="bs-cell no-config bs-cell-no-slot-merged"
                              title="Sân này chưa có time slot"
                              style={{ gridColumn: `span ${gSlots.length}` }}
                            >
                              Chưa có time slot
                            </div>
                          ) : (
                            gSlots.map((gs, si) => {
                              const sk = normalizeText(group.sportType);
                              const continuationSet = slotContinuationStartsBySport.get(sk);
                              if (continuationSet?.has(gs.label)) return null;
                              const spanMap = slotSpanBySportAndStart.get(sk);
                              const rawSpan = Number(spanMap?.get(gs.label) ?? 1);
                              const span = Math.max(1, Math.min(rawSpan, gSlots.length - si));
                              const globalSi = globalIdxForSlotLabel(gs.label);
                              const eid = globalSi >= 0
                                ? getEventIdForCell(field.originalIdx, globalSi)
                                : null;
                              const cellClass = globalSi >= 0
                                ? `${getCellClass(field.originalIdx, globalSi)} ${getEventRunExtraClass(field.originalIdx, globalSi)} ${getBookedRunExtraClass(field.originalIdx, globalSi)} ${getLockedRunExtraClass(field.originalIdx, globalSi)}`.trim()
                                : `bs-cell locked ${getOffGridLockedRunClass(si, gSlots)}`.trim();
                              return (
                                <div
                                  key={`${field.originalIdx}-${si}-${gs.label}`}
                                  className={cellClass}
                                  onClick={() =>
                                    globalSi >= 0
                                      ? handleCellClick(field.originalIdx, globalSi)
                                      : undefined
                                  }
                                  role={
                                    isLocked(globalSi) ? undefined : eid != null ? "link" : "button"
                                  }
                                  data-event-nav={eid != null && !isLocked(globalSi) ? "true" : undefined}
                                  title={eid != null ? "Sự kiện — xem chi tiết" : undefined}
                                  style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
                                />
                              );
                            })
                          )}
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
              promptLoginBeforeBooking();
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
            navigate(`/venue/${id}/booking`, {
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
