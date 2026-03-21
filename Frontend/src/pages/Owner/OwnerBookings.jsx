import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./OwnerBookings.css";

const OwnerBookings = () => {
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = bookingId.trim();
    if (!id) return;
    navigate(`/owner/bookings/${id}`);
  };

  return (
    <div className="owner-home owner-bookings-page">
      <div className="owner-home-header">
        <h1>Đơn đặt sân</h1>
      </div>

      <div className="owner-home-content">
        <div className="ob-card">
          <p className="ob-desc">
            Xem chi tiết đơn đặt sân theo mã đơn. Nhập mã đơn (ID) bên dưới.
          </p>
          <form className="ob-form" onSubmit={handleSubmit}>
            <label>
              Mã đơn đặt sân
              <input
                type="text"
                inputMode="numeric"
                placeholder="VD: 123"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              />
            </label>
            <button type="submit" className="ob-btn primary" disabled={!bookingId.trim()}>
              Xem chi tiết
            </button>
          </form>
          <Link to="/owner" className="ob-link">
            ← Về tổng quan
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OwnerBookings;
