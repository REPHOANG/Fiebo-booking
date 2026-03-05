import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getVenueDetail, getVenueFields } from "../../services/fieldService";
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

const generateSlots = (openTime, closeTime) => {
  const start = parseTime(openTime);
  const end = parseTime(closeTime);
  if (!start || !end) return [];

  const slots = [];
  let h = start.h;
  let m = start.m;
  const endMin = end.h * 60 + end.m;

  while (h * 60 + m < endMin) {
    slots.push({ h, m, label: formatSlot(h, m) });
    m += 30;
    if (m >= 60) {
      h += 1;
      m -= 60;
    }
  }
  return slots;
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
  const gridRef = useRef(null);

  const [venue, setVenue] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedSlots, setSelectedSlots] = useState([]); // [{fieldIdx, slotIdx}]
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

  // Fetch venue & fields
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [v, f] = await Promise.all([
          getVenueDetail(id),
          getVenueFields(id),
        ]);
        setVenue(v);
        setFields(f?.items || []);
      } catch (err) {
        setError(err.message || "Không thể tải thông tin sân");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Reset selection on date change
  useEffect(() => {
    setSelectedSlots([]);
  }, [selectedDate]);

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

  // Generate time slots from venue open/close
  const slots = useMemo(
    () => (venue ? generateSlots(venue.openTime, venue.closeTime) : []),
    [venue]
  );

  // Labels = slots + closing time (N+1 labels for N columns)
  const timeLabels = useMemo(() => {
    if (!slots.length || !venue) return [];
    const end = parseTime(venue.closeTime);
    if (!end) return slots;
    return [...slots, { h: end.h, m: end.m, label: formatSlot(end.h, end.m) }];
  }, [slots, venue]);

  // Determine locked slots (past time for today)
  const lockedBefore = useMemo(() => {
    if (selectedDate !== todayStr()) return -1;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return slots.findIndex((s) => s.h * 60 + s.m >= nowMin) - 1;
  }, [selectedDate, slots]);

  const isLocked = useCallback(
    (slotIdx) => {
      if (selectedDate < todayStr()) return true;
      return slotIdx <= lockedBefore;
    },
    [selectedDate, lockedBefore]
  );

  // TODO: When backend API exists, fetch booked slots
  const isBooked = useCallback(() => false, []);

  const isSelected = useCallback(
    (fieldIdx, slotIdx) =>
      selectedSlots.some((s) => s.fieldIdx === fieldIdx && s.slotIdx === slotIdx),
    [selectedSlots]
  );

  const toggleSlot = (fieldIdx, slotIdx) => {
    if (isLocked(slotIdx) || isBooked(fieldIdx, slotIdx)) return;
    setSelectedSlots((prev) => {
      const exists = prev.find((s) => s.fieldIdx === fieldIdx && s.slotIdx === slotIdx);
      if (exists) return prev.filter((s) => !(s.fieldIdx === fieldIdx && s.slotIdx === slotIdx));
      return [...prev, { fieldIdx, slotIdx }];
    });
  };

  const getCellClass = (fieldIdx, slotIdx) => {
    if (isLocked(slotIdx)) return "bs-cell locked";
    if (isBooked(fieldIdx, slotIdx)) return "bs-cell booked";
    if (isSelected(fieldIdx, slotIdx)) return "bs-cell selected";
    return "bs-cell available";
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

  // Build grouped slot summary for the bottom bar
  const slotSummary = useMemo(() => {
    if (!selectedSlots.length || !slots.length) return { groups: [], totalMinutes: 0 };

    // Group by fieldIdx
    const map = {};
    selectedSlots.forEach(({ fieldIdx, slotIdx }) => {
      if (!map[fieldIdx]) map[fieldIdx] = [];
      map[fieldIdx].push(slotIdx);
    });

    const groups = Object.entries(map).map(([fi, slotIdxs]) => {
      const sorted = [...slotIdxs].sort((a, b) => a - b);
      // Merge consecutive slots into ranges
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
      const fieldName = fields[fiNum]?.name || `Sân ${fiNum + 1}`;
      const pricePerSlot = fields[fiNum]?.pricePerSlot || 0;
      const rangeLabels = ranges.map((r) => {
        const startLabel = slots[r.from]?.label || "";
        const endSlot = slots[r.to + 1] || null;
        const endLabel = endSlot
          ? endSlot.label
          : venue
            ? formatTime(venue.closeTime)
            : formatSlot(slots[r.to].h, slots[r.to].m + 30);
        return `${startLabel} - ${endLabel}`;
      });

      return { fieldName, ranges: rangeLabels, slotCount: sorted.length, pricePerSlot };
    });

    const totalMinutes = selectedSlots.length * 30;
    const totalPrice = groups.reduce((sum, g) => sum + g.slotCount * g.pricePerSlot, 0);
    return { groups, totalMinutes, totalPrice };
  }, [selectedSlots, slots, fields, venue]);

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
        <button onClick={() => navigate(-1)} className="bs-back-link">← Quay lại</button>
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
          <button className="bs-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="bs-title">Đặt lịch ngày trực quan</h1>
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
          <div className="bs-legend-item">
            <span className="bs-legend-box locked" /> Khoá
          </div>
          <div className="bs-legend-item">
            <span className="bs-legend-box event" /> Sự kiện
          </div>
        </div>

        {/* Time Range Slider */}
        {slots.length > 0 && (
          <div className="bs-time-filter">
            <div className="bs-time-filter-label">🔍 {Math.round((zoomLevel / 50) * 100)}%</div>
            <div className="bs-time-range-container">
              <input
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
            <div className="bs-grid" style={{ gridTemplateColumns: `120px repeat(${slots.length}, ${zoomLevel}px) 0px` }}>
              {/* Row 1 — time labels (N+1 for N columns) */}
              <div className="bs-corner" />
              {timeLabels.map((s, i) => (
                <div key={i} className={`bs-time-label${s.m === 0 ? ' hour' : ' half'}${i === 0 ? ' first' : ''}${i === timeLabels.length - 1 ? ' last' : ''}`}>
                  <span>{s.label}</span>
                </div>
              ))}

              {/* Row 2 — teal bar with tick marks */}
              <div className="bs-bar-corner" />
              {slots.map((_, i) => (
                <div key={i} className="bs-tick-cell">
                  <span className="bs-tick" />
                </div>
              ))}
              <div className="bs-tick-cell" style={{ background: 'transparent', borderBottom: '1px solid #d1d5db' }} />

              {/* Field rows grouped by sport type */}
              {groupedFields.map((group, gi) => (
                <React.Fragment key={gi}>
                  {/* Sport type header */}
                  <div
                    className="bs-sport-header"
                    style={{
                      gridColumn: `1 / -1`,
                      background: sportTypeColors[gi % sportTypeColors.length],
                      borderLeft: `4px solid ${['#10b981','#3b82f6','#f59e0b','#8b5cf6','#06b6d4','#ef4444'][gi % 6]}`,
                    }}
                  >
                    <span className="bs-sport-header-icon">{['⚽','🏸','🎾','🏐','⚾','🏓'][gi % 6]}</span>
                    <span className="bs-sport-header-name">{group.sportType}</span>
                    <span className="bs-sport-header-count">{group.fields.length} sân</span>
                  </div>

                  {group.fields.map((field) => (
                    <React.Fragment key={field.originalIdx}>
                      <div
                        className="bs-field-label"
                        style={{ background: sportTypeColors[gi % sportTypeColors.length] }}
                        onMouseEnter={(e) => {
                          if (field.images && field.images.length > 0) {
                            setTooltipField(field);
                            setTooltipPos({ x: e.clientX + 12, y: e.clientY - 60 });
                          }
                        }}
                        onMouseMove={(e) => {
                          if (tooltipField) {
                            setTooltipPos({ x: e.clientX + 12, y: e.clientY - 60 });
                          }
                        }}
                        onMouseLeave={() => setTooltipField(null)}
                      >
                        <span className="bs-field-name">{field.name}</span>
                      </div>
                      {slots.map((_, si) => (
                        <div
                          key={si}
                          className={getCellClass(field.originalIdx, si)}
                          onClick={() => toggleSlot(field.originalIdx, si)}
                        />
                      ))}
                      <div />
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </div>
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
        {selectedSlots.length > 0 && (
          <span className="bs-bottom-price">
            Tổng tiền: <strong>{slotSummary.totalPrice > 0 ? `${slotSummary.totalPrice.toLocaleString("vi-VN")} đ` : "--"}</strong>
          </span>
        )}
        <button
          className={`bs-next-btn${selectedSlots.length === 0 ? " disabled" : ""}`}
          disabled={selectedSlots.length === 0}
          onClick={() => {
            navigate(`/venue/${id}/booking/confirm`, {
              state: {
                venue,
                fields,
                selectedDate,
                selectedSlots,
                slots,
                slotSummary,
              },
            });
          }}
        >
          TIẾP THEO
        </button>
      </div>

      {/* Field image tooltip */}
      {tooltipField && tooltipField.images && tooltipField.images.length > 0 && (
        <div
          className="bs-field-tooltip"
          style={{ display: 'block', left: tooltipPos.x, top: tooltipPos.y }}
        >
          <img src={tooltipField.images[0]} alt={tooltipField.name} />
          <span className="bs-field-tooltip-name">{tooltipField.name}</span>
        </div>
      )}
    </motion.div>
  );
};

export default BookingSchedule;
