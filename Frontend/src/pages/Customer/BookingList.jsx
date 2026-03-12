import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Clock,
  Receipt,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getBookingById } from "../../services/bookingService";
import GiveRating from "./GiveRating/GiveRating";
import "./BookingList.css";

const formatPrice = (price) =>
  price != null && price !== "" ? `${Number(price).toLocaleString("vi-VN")} đ` : "—";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatTime = (t) => {
  if (!t) return "—";
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const BookingList = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const [bookingIdInput, setBookingIdInput] = useState(id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (id) {
      setBookingIdInput(id);
      fetchBooking(id);
    }
  }, [id, isAuthenticated]);

  const fetchBooking = async (bookingId) => {
    const numId = Number(bookingId);
    if (!numId || numId < 1) {
      setError("Mã đặt chỗ không hợp lệ.");
      setBooking(null);
      return;
    }
    setError("");
    setLoading(true);
    setBooking(null);
    try {
      const data = await getBookingById(numId);
      setBooking(data?.data ?? data);
    } catch (err) {
      setBooking(null);
      if (err?.status === 404 || err?.data?.message?.toLowerCase?.().includes("not found")) {
        setError("Không tìm thấy đặt chỗ với mã này.");
      } else if (err?.status === 401) {
        setError("Bạn cần đăng nhập để xem đặt chỗ.");
      } else if (err?.status === 403) {
        setError("Bạn không có quyền xem đặt chỗ này.");
      } else {
        setError(err?.message || "Không thể tải thông tin đặt chỗ.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const val = bookingIdInput.trim();
    if (val) navigate(`/bookings/${val}`);
  };

  const statusKey = (booking?.status || "").toLowerCase();

  const handleContinuePayment = () => {
    // TODO: có thể điều hướng sang màn thanh toán sau khi có full flow từ lịch sử
    alert("Chức năng tiếp tục thanh toán từ lịch sử sẽ được bổ sung sau. Hiện hãy thanh toán từ luồng đặt sân.");
  };

  const handleCancelBooking = () => {
    alert("Chức năng hủy đặt chỗ sẽ được bổ sung sau.");
  };

  const handleOpenRating = () => {
    if (!booking) return;
    setRatingBookingId(booking.bookingId ?? booking.id);
    setShowRating(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="bl-main">
        <div className="bl-empty">
          <AlertCircle size={48} />
          <h2>Vui lòng đăng nhập</h2>
          <p>Bạn cần đăng nhập để xem sân đã đặt.</p>
          <Link to="/login" className="bl-btn primary">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="bl-main"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bl-header">
        <button type="button" className="bl-back" onClick={() => navigate(-1)} aria-label="Quay lại">
          <ArrowLeft size={20} />
        </button>
        <h1 className="bl-title">Sân đã đặt</h1>
        <p className="bl-subtitle">Tra cứu đặt chỗ theo mã hoặc xem chi tiết từ đường dẫn.</p>
      </div>

      <form className="bl-search" onSubmit={handleSearch}>
        <div className="bl-search-inner">
          <Search size={20} className="bl-search-icon" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Nhập mã đặt chỗ (VD: 31)"
            value={bookingIdInput}
            onChange={(e) => setBookingIdInput(e.target.value.replace(/\D/g, ""))}
            className="bl-search-input"
          />
          <button type="submit" className="bl-search-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : "Tra cứu"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bl-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !booking && (
        <div className="bl-loading">
          <Loader2 size={32} className="spin" />
          <span>Đang tải...</span>
        </div>
      )}

      {!loading && booking && (
        <div className="bl-detail">
          <div className="bl-detail-card">
            <div className="bl-detail-header">
              <span className="bl-badge" data-status={(booking.status || "").toLowerCase()}>
                {booking.status || "—"}
              </span>
              <span className="bl-id">Mã #{booking.bookingId ?? booking.id}</span>
            </div>
            <h2 className="bl-venue-name">
              <MapPin size={18} />
              {booking.venueName || "—"}
            </h2>
            <div className="bl-meta">
              <span><Calendar size={16} /> {formatDate(booking.date)}</span>
              <span><Receipt size={16} /> {formatPrice(booking.totalPrice)}</span>
            </div>
            <div className="bl-contact">
              <p><strong>Người đặt:</strong> {booking.fullName ?? booking.fullname ?? "—"}</p>
              <p><strong>SĐT:</strong> {booking.phone ?? booking.phoneNumber ?? "—"}</p>
              {booking.bookingNote && (
                <p><strong>Ghi chú:</strong> {booking.bookingNote}</p>
              )}
            </div>
            {booking.expiredAt && (
              <p className="bl-expiry">
                <Clock size={14} /> Hết hạn thanh toán: {formatDate(booking.expiredAt)} {formatTime(booking.expiredAt)}
              </p>
            )}
            {booking.details && booking.details.length > 0 && (
              <div className="bl-slots">
                <h3>Khung giờ đã đặt</h3>
                <ul>
                  {booking.details.map((slot, i) => (
                    <li key={i}>
                      {slot.fieldName ?? "Sân"} — {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bl-actions">
              {statusKey === "pending" && (
                <button type="button" className="bl-btn primary" onClick={handleContinuePayment}>
                  Tiếp tục thanh toán
                </button>
              )}
              {statusKey === "booked" && (
                <button type="button" className="bl-btn danger" onClick={handleCancelBooking}>
                  Hủy đặt sân
                </button>
              )}
              {statusKey === "completed" && (
                <button type="button" className="bl-btn primary" onClick={handleOpenRating}>
                  Đánh giá
                </button>
              )}
              <Link to={`/venue/${booking.venueId}`} className="bl-btn secondary">
                Xem sân
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && !booking && !error && id && (
        <div className="bl-empty-state">
          <p>Nhập mã đặt chỗ và bấm Tra cứu để xem chi tiết.</p>
        </div>
      )}

      {showRating && (
        <GiveRating
          open={showRating}
          bookingId={ratingBookingId}
          handleClose={() => setShowRating(false)}
        />
      )}
    </motion.div>
  );
};

export default BookingList;
