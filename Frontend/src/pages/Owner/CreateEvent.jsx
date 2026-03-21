import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getVenueDetail, getVenueSchedule } from "../../services/fieldService";
import { createEvent, getEventList } from "../../services/eventService";
import "./CreateEvent.css";

const formatPrice = (n) => {
  if (n == null || Number.isNaN(n)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

/** Chuẩn hóa thời gian từ API (e.g. "18:00:00" hoặc "18:00") thành "HH:mm" */
const normalizeTime = (t) => {
  if (!t) return "";
  const s = String(t).trim();
  const part = s.split(":")[0] + ":" + (s.split(":")[1] || "00");
  return part.length === 5 ? part : part.slice(0, 5);
};

/** Ghép ngày (YYYY-MM-DD) + giờ bắt đầu slot → Date theo giờ máy người dùng */
function parseLocalSlotStart(isoDate, startTime) {
  const dateStr = String(isoDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = normalizeTime(startTime);
  if (!t) return null;
  const [hh, mm] = t.split(":").map((n) => Number(n));
  return new Date(y, mo - 1, d, hh || 0, mm || 0, 0, 0);
}

/** Slot đã bắt đầu hoặc đã hết (so với hiện tại) → không cho tạo sự kiện */
function isSlotStartInPast(eventDateStr, startTime) {
  const slotStart = parseLocalSlotStart(eventDateStr, startTime);
  if (!slotStart || Number.isNaN(slotStart.getTime())) return false;
  return slotStart.getTime() <= Date.now();
}

/** Set các key "fieldName_startTime" đang bị chiếm bởi sự kiện (từ danh sách event theo venue+ngày) */
function getEventOccupiedKeys(eventList, venueName, dateStr) {
  const keys = new Set();
  const venueNorm = String(venueName || "").trim().toLowerCase();
  const dateNorm = String(dateStr || "").slice(0, 10);
  for (const e of eventList || []) {
    if (dateNorm && String(e?.eventDate || "").slice(0, 10) !== dateNorm) continue;
    if (venueNorm && String(e?.venueName || "").trim().toLowerCase() !== venueNorm) continue;
    for (const s of e?.slots || []) {
      const name = String(s?.fieldName || "").trim();
      const start = normalizeTime(s?.startTime);
      if (name && start) keys.add(`${name}_${start}`);
    }
  }
  return keys;
}

/**
 * Trả về tất cả slot theo từng sân, mỗi slot có status: 'available' | 'booked' | 'event' | 'past'
 * - booked: từ schedule field.unavailableSlots (đã có người đặt sân)
 * - event: từ danh sách sự kiện cùng venue+ngày (slot đã nằm trong sự kiện khác)
 * - past: khung giờ đã qua (so với thời điểm hiện tại, cùng ngày hoặc ngày trong quá khứ)
 */
function getSlotsByFieldWithStatus(schedule, eventOccupiedKeys, eventDateStr) {
  const groups = [];
  if (!schedule?.sportTypes?.length) return groups;
  const dateKey = String(eventDateStr || "").slice(0, 10);
  for (const st of schedule.sportTypes) {
    const slots = st.slots || [];
    const fields = st.fields || [];
    for (const field of fields) {
      const fieldId = field.fieldId ?? field.id;
      const fieldName = field.fieldName ?? field.name ?? "Sân";
      const unavailableSet = new Set((field.unavailableSlots || []).map((u) => u.slotId));
      const list = [];
      for (const slot of slots) {
        const slotId = slot.slotId ?? slot.id;
        const startTime = slot.startTime;
        const endTime = slot.endTime;
        const timeKey = `${fieldName}_${normalizeTime(startTime)}`;
        let status = "available";
        if (unavailableSet.has(slotId)) status = "booked";
        else if (eventOccupiedKeys.has(timeKey)) status = "event";
        else if (dateKey && isSlotStartInPast(dateKey, startTime)) status = "past";
        list.push({
          fieldId,
          slotId,
          fieldName,
          startTime,
          endTime,
          status,
        });
      }
      groups.push({ fieldId, fieldName, slots: list });
    }
  }
  return groups.sort((a, b) => (a.fieldName || "").localeCompare(b.fieldName || ""));
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const [venueId, setVenueId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [eventListForDate, setEventListForDate] = useState([]);
  const [loadingVenue, setLoadingVenue] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState([]); // [{ fieldId, slotId }]
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [minPlayer, setMinPlayer] = useState("4");
  const [maxPlayer, setMaxPlayer] = useState("10");
  const [description, setDescription] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedFieldId, setExpandedFieldId] = useState(null);
  /** Làm mới trạng thái "đã qua" khi đang xem ngày hôm nay (mỗi 30s) */
  const [pastSlotsTick, setPastSlotsTick] = useState(0);

  /** Slot bị chiếm bởi sự kiện khác (key = fieldName_startTime) */
  const eventOccupiedKeys = useMemo(
    () => getEventOccupiedKeys(eventListForDate, venue?.name ?? venue?.venueName, eventDate),
    [eventListForDate, venue?.name, venue?.venueName, eventDate],
  );

  /** Tất cả slot theo sân, mỗi slot có status: available | booked | event | past */
  const slotsByFieldWithStatus = useMemo(
    () => getSlotsByFieldWithStatus(schedule, eventOccupiedKeys, eventDate),
    [schedule, eventOccupiedKeys, eventDate, pastSlotsTick],
  );

  /** Chỉ các slot available (để submit) */
  const availableSlots = useMemo(() => {
    const out = [];
    for (const group of slotsByFieldWithStatus) {
      for (const s of group.slots) {
        if (s.status === "available") out.push(s);
      }
    }
    return out;
  }, [slotsByFieldWithStatus]);

  const loadVenue = async () => {
    const id = Number(venueId);
    if (!id) {
      setError("Vui lòng nhập mã cơ sở.");
      return;
    }
    setError("");
    setLoadingVenue(true);
    setVenue(null);
    setSchedule(null);
    setSelectedDetails([]);
    setExpandedFieldId(null);
    try {
      const v = await getVenueDetail(id);
      setVenue(v ?? null);
      if (!v) setError("Không tìm thấy cơ sở.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không tải được thông tin cơ sở.");
    } finally {
      setLoadingVenue(false);
    }
  };

  const loadSchedule = async () => {
    const id = Number(venueId);
    if (!id || !eventDate) {
      setError("Vui lòng chọn mã cơ sở và ngày sự kiện.");
      return;
    }
    setError("");
    setLoadingSchedule(true);
    setSchedule(null);
    setEventListForDate([]);
    setSelectedDetails([]);
    setExpandedFieldId(null);
    try {
      const dateStr = eventDate.slice(0, 10);
      const s = await getVenueSchedule(id, dateStr);
      setSchedule(s ?? null);
      if (!s?.sportTypes?.length) setError("Không có khung giờ cho ngày này.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không tải được lịch.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  /** Khi đã có schedule + venue + ngày → lấy danh sách sự kiện để đánh dấu slot "sự kiện" */
  useEffect(() => {
    if (!schedule?.sportTypes?.length || !venue || !eventDate) {
      setEventListForDate([]);
      return;
    }
    let mounted = true;
    getEventList()
      .then((list) => {
        if (mounted && Array.isArray(list)) setEventListForDate(list);
      })
      .catch(() => {
        if (mounted) setEventListForDate([]);
      });
    return () => { mounted = false; };
  }, [schedule, venue, eventDate]);

  /** Cập nhật khóa slot "đã qua" theo thời gian thực khi chọn đúng ngày hôm nay */
  useEffect(() => {
    const dateStr = String(eventDate || "").slice(0, 10);
    if (!dateStr || !schedule?.sportTypes?.length) return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (dateStr !== todayStr) return;
    const id = setInterval(() => setPastSlotsTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [eventDate, schedule]);

  /** Bỏ chọn các khung vừa chuyển sang trạng thái không còn chọn được (vd. đã qua) */
  useEffect(() => {
    const allowed = new Set(
      availableSlots.map((s) => `${s.fieldId}-${s.slotId}`),
    );
    setSelectedDetails((prev) => {
      const next = prev.filter((d) => allowed.has(`${d.fieldId}-${d.slotId}`));
      return next.length === prev.length ? prev : next;
    });
  }, [availableSlots]);

  const toggleSlot = (item) => {
    if (item.status !== "available") return;
    const key = `${item.fieldId}-${item.slotId}`;
    setSelectedDetails((prev) => {
      const has = prev.some((d) => `${d.fieldId}-${d.slotId}` === key);
      if (has) return prev.filter((d) => `${d.fieldId}-${d.slotId}` !== key);
      return [...prev, { fieldId: item.fieldId, slotId: item.slotId }];
    });
  };

  const isSelected = (item) =>
    selectedDetails.some((d) => d.fieldId === item.fieldId && d.slotId === item.slotId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = Number(venueId);
    if (!id || !eventDate) {
      setError("Vui lòng chọn cơ sở và ngày.");
      return;
    }
    if (selectedDetails.length === 0) {
      setError("Vui lòng chọn ít nhất một khung giờ.");
      return;
    }
    const price = Number(pricePerPerson);
    const min = Number(minPlayer);
    const max = Number(maxPlayer);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Phí tham gia phải lớn hơn 0.");
      return;
    }
    if (!Number.isFinite(min) || min < 1) {
      setError("Số người tối thiểu phải lớn hơn 0.");
      return;
    }
    if (!Number.isFinite(max) || max < min) {
      setError("Số người tối đa phải lớn hơn hoặc bằng số người tối thiểu.");
      return;
    }

    setError("");
    setSubmitLoading(true);
    try {
      const payload = {
        eventDate: eventDate.slice(0, 10),
        details: selectedDetails.map((d) => ({ fieldId: d.fieldId, slotId: d.slotId })),
        pricePerPerson: price,
        minPlayer: min,
        maxPlayer: max,
        description: description.trim() || null,
      };
      const res = await createEvent(payload);
      const eventId = res?.eventId ?? res?.EventId;
      if (eventId) {
        navigate(`/owner/events/${eventId}`);
      } else {
        navigate("/owner/events");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Tạo sự kiện thất bại.";
      setError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="owner-home create-event-page">
      <div className="owner-home-header">
        <h1>Tạo sự kiện</h1>
        <Link to="/owner/events" className="oh-create-btn">
          Danh sách
        </Link>
      </div>

      <div className="owner-home-content">
        <form className="create-event-form" onSubmit={handleSubmit}>
          {error && (
            <div className="ce-error" role="alert">
              {error}
            </div>
          )}

          <div className="ce-section">
            <h3>Cơ sở &amp; ngày</h3>
            <div className="ce-row">
              <label>
                Mã cơ sở (Venue ID)
                <input
                  type="number"
                  min={1}
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  placeholder="VD: 1"
                />
              </label>
              <button type="button" className="ce-btn secondary" onClick={loadVenue} disabled={loadingVenue}>
                {loadingVenue ? "Đang tải…" : "Tải thông tin"}
              </button>
            </div>
            {venue && (
              <p className="ce-venue-name">
                Cơ sở: <strong>{venue.name ?? venue.venueName}</strong>
              </p>
            )}
            <div className="ce-row">
              <label>
                Ngày sự kiện
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <button
                type="button"
                className="ce-btn secondary"
                onClick={loadSchedule}
                disabled={loadingSchedule || !venueId || !eventDate}
              >
                {loadingSchedule ? "Đang tải…" : "Tải khung giờ"}
              </button>
            </div>
          </div>

          {slotsByFieldWithStatus.length > 0 && (
            <div className="ce-section">
              <h3>Chọn khung giờ (ít nhất 1)</h3>
              <div className="ce-legend">
                <span className="ce-legend-item available">Trống</span>
                <span className="ce-legend-item past">Đã qua</span>
                <span className="ce-legend-item booked">Đã đặt</span>
                <span className="ce-legend-item event">Sự kiện</span>
              </div>
              <div className="ce-slots-by-field">
                {slotsByFieldWithStatus.map((group) => (
                  <div key={group.fieldId} className="ce-field-block">
                    <div className="ce-field-head">
                      <h4 className="ce-field-title">{group.fieldName}</h4>
                      <div className="ce-field-right">
                        <span className="ce-field-meta">
                          {group.slots.filter((s) => s.status === "available").length} trống /{" "}
                          {group.slots.length} tổng
                        </span>
                        <button
                          type="button"
                          className="ce-field-toggle"
                          onClick={() =>
                            setExpandedFieldId((prev) => (prev === group.fieldId ? null : group.fieldId))
                          }
                        >
                          {expandedFieldId === group.fieldId ? "Thu nhỏ" : "Phóng to"}
                        </button>
                      </div>
                    </div>

                    {expandedFieldId === group.fieldId ? (
                      <div className="ce-compact-grid">
                        {group.slots.map((item) => {
                          const disabled = item.status !== "available";
                          const selected = !disabled && isSelected(item);
                          return (
                            <button
                              key={`${item.fieldId}-${item.slotId}`}
                              type="button"
                              className={`ce-compact-chip ce-slot-${item.status}${selected ? " selected" : ""}`}
                              onClick={() => !disabled && toggleSlot(item)}
                              disabled={disabled}
                              title={
                                item.status === "past"
                                  ? "Khung giờ đã qua, không thể tạo sự kiện"
                                  : item.status === "booked"
                                  ? "Đã có người đặt sân"
                                  : item.status === "event"
                                  ? "Đã nằm trong sự kiện khác"
                                  : undefined
                              }
                            >
                              <span className="ce-compact-time">
                                {normalizeTime(item.startTime)} - {normalizeTime(item.endTime)}
                              </span>
                              {item.status === "past" && <span className="ce-compact-tag">Đã qua</span>}
                              {item.status === "booked" && <span className="ce-compact-tag">Đã đặt</span>}
                              {item.status === "event" && <span className="ce-compact-tag">Sự kiện</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="ce-collapsed-note">Bấm "Phóng to" để xem và chọn khung giờ.</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="ce-hint">Đã chọn: {selectedDetails.length} khung</p>
            </div>
          )}

          <div className="ce-section">
            <h3>Thông tin sự kiện</h3>
            <div className="ce-row">
              <label>
                Phí tham gia (VNĐ/người)
                <input
                  type="number"
                  min={1}
                  value={pricePerPerson}
                  onChange={(e) => setPricePerPerson(e.target.value)}
                  placeholder="50000"
                />
              </label>
            </div>
            <div className="ce-row two-cols">
              <label>
                Số người tối thiểu
                <input
                  type="number"
                  min={1}
                  value={minPlayer}
                  onChange={(e) => setMinPlayer(e.target.value)}
                />
              </label>
              <label>
                Số người tối đa
                <input
                  type="number"
                  min={1}
                  value={maxPlayer}
                  onChange={(e) => setMaxPlayer(e.target.value)}
                />
              </label>
            </div>
            <label className="ce-full">
              Mô tả (tuỳ chọn)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Bóng đá 5 người, giao lưu cuối tuần"
                rows={3}
              />
            </label>
          </div>

          <div className="ce-actions">
            <button
              type="submit"
              className="ce-btn primary"
              disabled={submitLoading || selectedDetails.length === 0}
            >
              {submitLoading ? "Đang tạo…" : "Tạo sự kiện"}
            </button>
            <Link to="/owner/events" className="ce-btn link">
              Huỷ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
