import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./OwnerVenues.css";
import {
  deactivateOwnerVenue,
  getOwnerVenueSchedule,
  getOwnerVenues,
} from "../../services/venueService";

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

const formatPrice = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n));
};

const formatTime = (t) => {
  if (t == null) return "—";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const translateVenueStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "Hoạt động";
  if (s === "inactive") return "Đã vô hiệu hóa";
  return status || "—";
};

const OwnerVenues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpenId, setScheduleOpenId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(todayYmd);
  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getOwnerVenues();
      setVenues(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách cơ sở.");
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const loadSchedule = useCallback(async (venueId, dateStr) => {
    setScheduleLoading(true);
    setScheduleData(null);
    try {
      const data = await getOwnerVenueSchedule(venueId, dateStr);
      setScheduleData(data);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được lịch sân.");
      setScheduleData(null);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  const toggleSchedule = (venueId) => {
    if (scheduleOpenId === venueId) {
      setScheduleOpenId(null);
      setScheduleData(null);
      return;
    }
    setScheduleOpenId(venueId);
    const d = scheduleDate || todayYmd();
    setScheduleDate(d);
    loadSchedule(venueId, d);
  };

  const handleScheduleDateChange = (venueId, nextDate) => {
    setScheduleDate(nextDate);
    if (scheduleOpenId === venueId && nextDate) loadSchedule(venueId, nextDate);
  };

  const handleDeactivate = async (venueId, name) => {
    const ok = window.confirm(
      `Vô hiệu hóa cơ sở "${name}"? Khách sẽ không đặt sân tại đây nữa.`
    );
    if (!ok) return;
    try {
      await deactivateOwnerVenue(venueId);
      toast.success("Đã vô hiệu hóa cơ sở.");
      await loadVenues();
      if (scheduleOpenId === venueId) {
        setScheduleOpenId(null);
        setScheduleData(null);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không vô hiệu hóa được.");
    }
  };

  return (
    <div className="owner-venues-page">
      <div className="ov-header">
        <div>
          <h1>Danh sách sân của tôi</h1>
          <p>Quản lý các cơ sở và sân bạn đang sở hữu.</p>
        </div>
        <Link to="/owner/create-venue" className="ov-create-btn">
          + Tạo cơ sở mới
        </Link>
      </div>

      {loading ? (
        <div className="ov-empty">
          <p>Đang tải...</p>
        </div>
      ) : venues.length === 0 ? (
        <div className="ov-empty">
          <p>Hiện bạn chưa có cơ sở nào.</p>
          <Link to="/owner/create-venue" className="ov-create-link">
            Bắt đầu tạo cơ sở đầu tiên
          </Link>
        </div>
      ) : (
        <div className="ov-list">
          {venues.map((v) => {
            const id = pick(v, "venueId", "VenueId");
            const name = pick(v, "name", "Name") ?? "—";
            const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
            const province = pick(v, "province", "Province") ?? "";
            const ward = pick(v, "ward", "Ward") ?? "";
            const status = pick(v, "status", "Status");
            const totalFields = pick(v, "totalFields", "TotalFields") ?? 0;
            const statusLower = String(status || "").toLowerCase();
            const canDeactivate = statusLower === "active";

            return (
              <div key={id} className="ov-card">
                <div className="ov-card-main">
                  <div className="ov-thumb-wrap">
                    {thumb ? (
                      <img className="ov-thumb" src={thumb} alt="" />
                    ) : (
                      <div className="ov-thumb ov-thumb--placeholder" aria-hidden />
                    )}
                  </div>
                  <div className="ov-card-body">
                    <div className="ov-card-title-row">
                      <h2 className="ov-card-title">{name}</h2>
                      <span className="ov-status" data-status={statusLower}>
                        {translateVenueStatus(status)}
                      </span>
                    </div>
                    <p className="ov-card-meta">
                      {[ward, province].filter(Boolean).join(", ") || "—"}
                    </p>
                    <p className="ov-card-meta">Số sân: {totalFields}</p>
                    <div className="ov-card-actions">
                      <button
                        type="button"
                        className="ov-btn ov-btn--secondary"
                        onClick={() => toggleSchedule(id)}
                      >
                        {scheduleOpenId === id ? "Ẩn lịch" : "Xem lịch"}
                      </button>
                      {canDeactivate ? (
                        <Link
                          to={`/owner/venues/${id}/offline-booking`}
                          className="ov-btn ov-btn--offline"
                        >
                          Đặt sân offline
                        </Link>
                      ) : null}
                      {canDeactivate ? (
                        <button
                          type="button"
                          className="ov-btn ov-btn--danger"
                          onClick={() => handleDeactivate(id, name)}
                        >
                          Vô hiệu hóa
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {scheduleOpenId === id ? (
                  <div className="ov-schedule">
                    <div className="ov-schedule-toolbar">
                      <label className="ov-schedule-date-label">
                        Ngày
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => handleScheduleDateChange(id, e.target.value)}
                        />
                      </label>
                    </div>
                    {scheduleLoading ? (
                      <p className="ov-schedule-msg">Đang tải lịch...</p>
                    ) : scheduleData ? (
                      <OwnerScheduleView data={scheduleData} />
                    ) : (
                      <p className="ov-schedule-msg">Không có dữ liệu lịch.</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function OwnerScheduleView({ data }) {
  const navigate = useNavigate();
  const venueId = pick(data, "venueId", "VenueId");
  const dateVal = pick(data, "date", "Date");
  const sportTypes = pick(data, "sportTypes", "SportTypes") ?? [];

  if (!sportTypes.length) {
    return <p className="ov-schedule-msg">Không có khung giờ cho ngày này.</p>;
  }

  return (
    <div className="ov-schedule-inner">
      <p className="ov-schedule-summary">
        Cơ sở #{venueId}
        {dateVal != null ? ` · ${String(dateVal).slice(0, 10)}` : null}
      </p>
      {sportTypes.map((st, idx) => {
        const sportName = pick(st, "sportTypeName", "SportTypeName") ?? "Môn";
        const slots = pick(st, "slots", "Slots") ?? [];
        const fields = pick(st, "fields", "Fields") ?? [];

        return (
          <div key={idx} className="ov-sport-block">
            <h3 className="ov-sport-title">{sportName}</h3>
            {slots.length > 0 ? (
              <ul className="ov-slot-list">
                {slots.map((sl) => {
                  const sid = pick(sl, "slotId", "SlotId");
                  const start = pick(sl, "startTime", "StartTime");
                  const end = pick(sl, "endTime", "EndTime");
                  const price = pick(sl, "price", "Price");
                  return (
                    <li key={sid}>
                      {formatTime(start)} – {formatTime(end)} · {formatPrice(price)}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="ov-schedule-msg ov-schedule-msg--sm">Chưa có khung giờ mở bán.</p>
            )}
            {fields.length > 0 ? (
              <div className="ov-fields">
                <p className="ov-fields-title">Sân và slot không khả dụng</p>
                {fields.map((f) => {
                  const fid = pick(f, "fieldId", "FieldId");
                  const fname = pick(f, "fieldName", "FieldName") ?? "—";
                  const unavail = pick(f, "unavailableSlots", "UnavailableSlots") ?? [];
                  return (
                    <div key={fid} className="ov-field-row">
                      <strong>{fname}</strong>
                      {unavail.length ? (
                        <ul className="ov-unavail-list">
                          {unavail.map((u, i) => {
                            const slotId = pick(u, "slotId", "SlotId");
                            const stt = pick(u, "status", "Status");
                            const eid = pick(u, "eventId", "EventId");
                            const hasEvent =
                              eid != null && eid !== "" && !Number.isNaN(Number(eid));
                            return (
                              <li
                                key={`${slotId}-${i}`}
                                className={
                                  hasEvent
                                    ? "ov-unavail-slot ov-unavail-slot--event"
                                    : "ov-unavail-slot"
                                }
                                onClick={() => {
                                  if (hasEvent) navigate(`/event/${Number(eid)}`);
                                }}
                                onKeyDown={(ev) => {
                                  if (
                                    hasEvent &&
                                    (ev.key === "Enter" || ev.key === " ")
                                  ) {
                                    ev.preventDefault();
                                    navigate(`/event/${Number(eid)}`);
                                  }
                                }}
                                role={hasEvent ? "link" : undefined}
                                tabIndex={hasEvent ? 0 : undefined}
                              >
                                Slot #{slotId}
                                {stt ? ` (${stt})` : ""}
                                {hasEvent ? " · Sự kiện" : ""}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="ov-schedule-msg--sm"> — </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default OwnerVenues;
