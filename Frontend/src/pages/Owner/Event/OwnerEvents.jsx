import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getEventListOwner } from "../../../services/eventService";
import "./OwnerEvents.css";

const formatDate = (d) => {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  if (!s) return "";
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const translateStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "Chưa diễn ra";
  if (s === "ongoing" || s === "active") return "Đang diễn ra";
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled" || s === "canceled") return "Đã hủy";
  return status || "—";
};

const OwnerEvents = ({ showCreate = true, eventDetailBasePath = "/owner/events" }) => {
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
      <div className="owner-home-header" style={{
        marginBottom:"10px"
      }}>
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
            {showCreate && (
              <Link to="/owner/events/create" className="oe-create-link">
                Tạo sự kiện
              </Link>
            )}
          </div>
        ) : (
          <div className="oe-table-wrap">
            <table className="oe-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên sự kiện</th>
                  <th>Cơ sở</th>
                  <th>Ngày</th>
                  <th>Thời gian tạo</th>
                  <th>Trạng thái</th>
                  <th>Người tham gia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((ev) => (
                  <tr key={ev.eventId}>
                    <td>{ev.eventId}</td>
                    <td>{ev.name?.trim() || "—"}</td>
                    <td>{ev.venueName ?? ""}</td>
                    <td>{formatDate(ev.eventDate)}</td>
                    <td>{formatDateTime(ev.createdAt)}</td>
                    <td>
                      <span className={`oe-status-badge oe-status-${String(ev.status || "").toLowerCase()}`}>
                        {translateStatus(ev.status)}
                      </span>
                    </td>
                    <td>
                      {Math.max(
                        0,
                        Number(ev.totalTicketQuantity ?? 0) - Number(ev.remainingTicketQuantity ?? 0),
                      )}
                      /
                      {Number(ev.totalTicketQuantity ?? 0)}
                    </td>
                    <td>
                      {eventDetailBasePath ? (
                        <Link to={`${eventDetailBasePath}/${ev.eventId}`} className="oe-link">
                          Chi tiết
                        </Link>
                      ) : null}
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
}

export default OwnerEvents;
