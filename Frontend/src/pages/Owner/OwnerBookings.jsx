import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./OwnerBookings.css";
import { getOwnerBookingList } from "../../services/bookingService";

const formatDate = (d) => {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}/${m}/${y}` : s;
};

const formatPrice = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n));
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

const OwnerBookings = () => {
  const navigate = useNavigate();
  const [venueFilter, setVenueFilter] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const v = venueFilter.trim();
      if (v) params.venueName = v;
      const list = await getOwnerBookingList(params);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách đơn.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [venueFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadList();
  };

  return (
    <div className="owner-home owner-bookings-page">
      <div className="owner-home-header">
        <h1>Đơn đặt sân</h1>
      </div>

      <div className="owner-home-content">
        <div className="ob-card ob-card--list">
          

          <form className="ob-filter-row" onSubmit={handleFilterSubmit}>
            <label className="ob-filter-label">
              Lọc theo tên cơ sở (tuỳ chọn)
              <input
                type="text"
                placeholder="VD: Sân Mỹ Đình"
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
              />
            </label>
            <button type="submit" className="ob-btn primary ob-btn-sm">
              Lọc
            </button>
            <button
              type="button"
              className="ob-btn outline ob-btn-sm"
              onClick={() => setVenueFilter("")}
            >
              Xóa lọc
            </button>
          </form>

          {loading ? (
            <p className="ob-desc">Đang tải danh sách...</p>
          ) : items.length === 0 ? (
            <p className="ob-desc">Chưa có đơn nào.</p>
          ) : (
            <div className="ob-list">
              {items.map((b) => {
                const bid = b.bookingId ?? b.BookingId;
                const status = b.status ?? b.Status;
                const venueName = b.venueName ?? b.VenueName ?? "—";
                const customerName = b.customerName ?? b.CustomerName ?? "—";
                const phone = b.phoneNumber ?? b.PhoneNumber ?? "";
                const bookingDate = b.bookingDate ?? b.BookingDate;
                const total = b.totalPrice ?? b.TotalPrice;
                const fields = b.fieldNames ?? b.FieldNames ?? [];
                const fieldStr = Array.isArray(fields) ? fields.join(", ") : "—";

                return (
                  <div key={bid} className="ob-booking-item">
                    <div className="ob-booking-info">
                      <div className="ob-booking-top">
                        <span
                          className="ob-booking-badge"
                          data-status={String(status || "").toLowerCase()}
                        >
                          {translateStatus(status)}
                        </span>
                        <span className="ob-booking-id">Mã #{bid}</span>
                      </div>
                      <div className="ob-booking-venue">{venueName}</div>
                      <div className="ob-booking-meta">
                        <span>{formatDate(bookingDate)}</span>
                        {" · "}
                        <span>{formatPrice(total)}</span>
                      </div>
                      <div className="ob-booking-meta">
                        Khách: <strong>{customerName}</strong>
                        {phone ? ` · ${phone}` : null}
                      </div>
                      <div className="ob-booking-meta">Sân: {fieldStr}</div>
                    </div>
                    <div className="ob-booking-actions">
                      <button
                        type="button"
                        className="ob-btn secondary"
                        onClick={() => navigate(`/owner/bookings/${bid}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerBookings;
