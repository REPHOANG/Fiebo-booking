import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getEventListOwner } from "../../../services/eventService";
import "./OwnerEvents.css";

const formatPrice = (n) => {
  if (n == null || Number.isNaN(n)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

const formatDate = (d) => {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  if (!s) return "";
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

const OwnerEvents = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchList = async () => {
      try {
        const data = await getEventListOwner();
        if (mounted && Array.isArray(data)) setList(data);
        else if (mounted) setList([]);
      } catch (e) {
        if (mounted) {
          setList([]);
          setError(e?.response?.data?.message || e?.message || "Không tải được danh sách.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchList();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="owner-home owner-events-page">
      <div className="owner-home-header">
        <h1>Danh sách sự kiện</h1>
      </div>

      <div className="owner-home-content">
        {error && (
          <div className="oe-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="oe-loading">Đang tải…</p>
        ) : list.length === 0 ? (
          <div className="oe-empty">
            <p>Hiện chưa có sự kiện nào. Bạn có thể tạo sự kiện mới.</p>
            <Link to="/owner/events/create" className="oe-create-link">
              Tạo sự kiện
            </Link>
          </div>
        ) : (
          <div className="oe-table-wrap">
            <table className="oe-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Cơ sở</th>
                  <th>Ngày</th>
                  <th>Giá vé</th>
                  <th>Còn lại</th>
                  <th>Khung giờ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((ev) => (
                  <tr key={ev.eventId}>
                    <td>{ev.eventId}</td>
                    <td>{ev.venueName ?? ""}</td>
                    <td>{formatDate(ev.eventDate)}</td>
                    <td>{formatPrice(ev.ticketPrice)}</td>
                    <td>{ev.remainingTicketQuantity ?? 0}</td>
                    <td className="oe-slots-cell">
                      {Array.isArray(ev.slots) && ev.slots.length > 0
                        ? ev.slots.map((s, i) => (
                            <span key={i} className="oe-slot-tag">
                              {s.fieldName ?? "Sân"} {formatSlotTime(s.startTime)}–{formatSlotTime(s.endTime)}
                            </span>
                          ))
                        : "—"}
                    </td>
                    <td>
                      <Link to={`/owner/events/${ev.eventId}`} className="oe-link">
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function formatSlotTime(t) {
  if (!t) return "";
  const s = String(t).trim();
  const part = s.split(":")[0] + ":" + (s.split(":")[1] || "00");
  return part.length >= 5 ? part.slice(0, 5) : part;
}

export default OwnerEvents;
