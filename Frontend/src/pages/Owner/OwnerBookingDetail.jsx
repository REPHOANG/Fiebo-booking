import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getOwnerBookingDetail } from "../../services/bookingService";
import "./OwnerBookingDetail.css";

const formatPrice = (n) => {
  if (n == null || Number.isNaN(n)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

const formatDate = (d) => {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

const formatTime = (t) => {
  if (!t) return "";
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const translateStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Chờ thanh toán";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy (khách)";
  if (s === "ownercancelled") return "Đã hủy (chủ sân)";
  if (s === "expired") return "Hết hạn";
  return status || "—";
};

const OwnerBookingDetail = () => {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const data = await getOwnerBookingDetail(id);
        if (mounted) setDetail(data);
      } catch (e) {
        if (mounted) {
          setDetail(null);
          setError(e?.response?.data?.message || e?.message || "Không tải được chi tiết đơn.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="owner-home obd-page">
        <div className="owner-home-content">
          <p className="obd-loading">Đang tải…</p>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="owner-home obd-page">
        <div className="owner-home-header">
          <Link to="/owner/bookings" className="obd-back">← Đơn đặt sân</Link>
        </div>
        <div className="owner-home-content">
          <div className="obd-error">{error}</div>
        </div>
      </div>
    );
  }

  const d = detail || {};
  const items = d.bookedItems ?? d.BookedItems ?? [];

  return (
    <div className="owner-home obd-page">
      <div className="owner-home-header">
        <h1>Đơn đặt sân #{d.bookingId ?? id}</h1>
        <Link to="/owner/bookings" className="oh-create-btn">Danh sách đơn</Link>
      </div>

      <div className="owner-home-content">
        <div className="obd-card">
          <div className="obd-meta">
            <span className="obd-badge" data-status={(d.status || "").toLowerCase()}>
              {translateStatus(d.status)}
            </span>
            <span>Đặt lúc: {d.createdAt ? new Date(d.createdAt).toLocaleString("vi-VN") : "—"}</span>
          </div>

          <div className="obd-section">
            <h3>Khách hàng</h3>
            <ul className="obd-info">
              <li>Họ tên: <strong>{d.customerName ?? "—"}</strong></li>
              <li>SĐT: <strong>{d.phoneNumber ?? "—"}</strong></li>
              {d.bookingNote ? <li>Ghi chú: {d.bookingNote}</li> : null}
            </ul>
          </div>

          <div className="obd-section">
            <h3>Chi tiết sân đã đặt</h3>
            {items.length === 0 ? (
              <p className="obd-empty">Không có mục nào.</p>
            ) : (
              <div className="obd-table-wrap">
                <table className="obd-table">
                  <thead>
                    <tr>
                      <th>Sân</th>
                      <th>Ngày</th>
                      <th>Giờ</th>
                      <th>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => (
                      <tr key={i}>
                        <td>{row.fieldName ?? "—"}</td>
                        <td>{formatDate(row.playDate)}</td>
                        <td>{formatTime(row.startTime)} – {formatTime(row.endTime)}</td>
                        <td>{formatPrice(row.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="obd-total">
            <span>Tổng tiền</span>
            <strong>{formatPrice(d.totalPrice)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerBookingDetail;
