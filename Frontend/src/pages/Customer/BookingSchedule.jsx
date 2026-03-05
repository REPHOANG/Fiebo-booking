import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
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

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX - (gridRef.current?.scrollLeft || 0));
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !gridRef.current) return;
    const x = e.clientX - dragStart;
    gridRef.current.scrollLeft = -x;
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
    <>
      <div className="bs-main">
        {/* Top bar */}
        <div className="bs-topbar">
          <button className="bs-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="bs-title">Đặt lịch ngày trực quan</h1>
          <div className="bs-date-picker">
            <input
              type="date"
              value={selectedDate}
              min={todayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <span className="bs-date-display">
              📅 {formatDateVN(selectedDate)}
            </span>
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
        </div>

        {/* Time Range Slider */}
        {slots.length > 0 && (
          <div className="bs-time-filter">
            <div className="bs-time-filter-label">Phóng to / Co lại lưới</div>
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

              {/* Field rows */}
              {fields.map((field, fi) => (
                <React.Fragment key={fi}>
                  <div className="bs-field-label">{field.name}</div>
                  {slots.map((_, si) => (
                    <div
                      key={si}
                      className={getCellClass(fi, si)}
                      onClick={() => toggleSlot(fi, si)}
                    />
                  ))}
                  <div />
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

        {/* Selected summary */}
        {selectedSlots.length > 0 && (
          <div className="bs-selection-summary">
            Đã chọn <strong>{selectedSlots.length}</strong> khung giờ
          </div>
        )}
      </div>

      {/* Sticky bottom button */}
      <div className="bs-bottom-bar">
        <button
          className={`bs-next-btn${selectedSlots.length === 0 ? " disabled" : ""}`}
          disabled={selectedSlots.length === 0}
          onClick={() => {
            // Build booking data for next step
            const bookingData = selectedSlots.map((s) => ({
              fieldName: fields[s.fieldIdx]?.name,
              fieldIdx: s.fieldIdx,
              time: slots[s.slotIdx]?.label,
              slotIdx: s.slotIdx,
            }));
            console.log("Booking data:", { venueId: id, date: selectedDate, slots: bookingData });
            // TODO: navigate to confirmation step
          }}
        >
          TIẾP THEO
        </button>
      </div>
    </>
  );
};

export default BookingSchedule;
