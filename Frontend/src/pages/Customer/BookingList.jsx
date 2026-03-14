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
  X,
} from "lucide-react";
import {
  cancelBookingApi,
  getBookingById,
  getBookingHistory,
  getCancelBookingPreview,
} from "../../services/bookingService";
import GiveRating from "./GiveRating/GiveRating";
import "./BookingList.css";
import Swal from "sweetalert2";
import { useMutation } from "@tanstack/react-query";

const formatPrice = (price) =>
  price != null && price !== ""
    ? `${Number(price).toLocaleString("vi-VN")} đ`
    : "—";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (t) => {
  if (!t) return "—";
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ thanh toán", statuses: ["Pending"] },
  { key: "upcoming", label: "Sắp tới", statuses: ["Booked"] },
  { key: "completed", label: "Hoàn thành", statuses: ["Completed"] },
  { key: "cancelled", label: "Đã hủy", statuses: ["Cancelled", "Expired"] },
];

/** Chuẩn hóa 1 item từ API (hỗ trợ cả camelCase và PascalCase). */
function normHistoryItem(it) {
  const bid = it?.bookingId ?? it?.BookingId;
  if (bid == null) return null;
  return {
    bookingId: bid,
    status: it?.status ?? it?.Status,
    bookingDate: it?.bookingDate ?? it?.BookingDate,
    venueName: it?.venueName ?? it?.VenueName,
    address: it?.address ?? it?.Address,
    province: it?.province ?? it?.Province,
    ward: it?.ward ?? it?.Ward,
    venueId: it?.venueId ?? it?.VenueId,
  };
}

/** Group history items by bookingId, one row per booking. Sort by bookingDate desc. */
function groupHistoryByBooking(items) {
  const byId = new Map();
  for (const it of items || []) {
    const row = normHistoryItem(it);
    if (!row || byId.has(row.bookingId)) continue;
    byId.set(row.bookingId, row);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.bookingDate || 0) - new Date(a.bookingDate || 0),
  );
}

function getTabForStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "booked") return "upcoming";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "expired") return "cancelled";
  return null;
}

function translateStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Chờ thanh toán";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled") return "Đã hủy";
  if (s === "expired") return "Hết hạn";
  return status || "—";
}

const BookingList = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const [activeTab, setActiveTab] = useState("all");
  const [bookingIdInput, setBookingIdInput] = useState(id || "");
  const [list, setList] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState(null);
  const [detailPopupId, setDetailPopupId] = useState(null);
  const [popupBooking, setPopupBooking] = useState(null);
  const [loadingDetailPopup, setLoadingDetailPopup] = useState(false);

  useEffect(() => {
    if (id) setDetailPopupId(Number(id) || null);
  }, [id]);

  useEffect(() => {
    if (!detailPopupId || !isAuthenticated) {
      setPopupBooking(null);
      return;
    }
    let cancelled = false;
    setLoadingDetailPopup(true);
    setPopupBooking(null);
    getBookingById(detailPopupId)
      .then((data) => {
        if (!cancelled) setPopupBooking(data?.data ?? data);
      })
      .catch(() => {
        if (!cancelled) setPopupBooking(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailPopup(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailPopupId, isAuthenticated]);

  const closeDetailPopup = () => {
    setDetailPopupId(null);
    setPopupBooking(null);
    if (id) navigate("/bookings");
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setListError(null);
    const load = async () => {
      setLoadingList(true);
      try {
        const res = await getBookingHistory({
          pageNumber: 1,
          pageSize: PAGE_SIZE,
        });
        const items = res.items || [];
        const grouped = groupHistoryByBooking(items);
        if (!cancelled) {
          setHistoryItems(items);
          setList(grouped);
          setTotalItems(res.totalItems ?? items.length);
          setPage(1);
        }
      } catch (e) {
        if (!cancelled) {
          setHistoryItems([]);
          setList([]);
          setTotalItems(0);
          const is401 = e?.status === 401;
          setListError(
            is401
              ? "Phiên đăng nhập hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại."
              : e?.message ||
                  "Không tải được danh sách đặt chỗ. Kiểm tra mạng và thử lại.",
          );
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await getBookingHistory({
        pageNumber: nextPage,
        pageSize: PAGE_SIZE,
      });
      const items = res.items || [];
      const merged = [...historyItems, ...items];
      setHistoryItems(merged);
      setList(groupHistoryByBooking(merged));
      setTotalItems(res.totalItems ?? merged.length);
      setPage(nextPage);
    } catch (e) {
      // giữ nguyên danh sách hiện tại nếu lỗi
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (id) setBookingIdInput(id);
    if (!id) setError("");
  }, [id]);

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
      if (
        err?.status === 404 ||
        err?.data?.message?.toLowerCase?.().includes("not found")
      ) {
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
    alert(
      "Chức năng tiếp tục thanh toán từ lịch sử sẽ được bổ sung sau. Hiện hãy thanh toán từ luồng đặt sân.",
    );
  };

  const handleCancelBooking = () => {
    alert("Chức năng hủy đặt chỗ sẽ được bổ sung sau.");
  };

  const handleOpenRating = () => {
    if (!booking) return;
    setRatingBookingId(booking.bookingId ?? booking.id);
    setShowRating(true);
  };

  const handleContinuePaymentFromList = (venueId, bookingId) => {
    navigate(`/venue/${venueId}/booking/payment?bookingId=${bookingId}`, {
      state: { bookingId },
    });
  };

  const handleCancelFromList = async (bookingId) => {
    try {
      const message =
        (await getCancelBookingPreview(bookingId)) ||
        "Bạn có chắc muốn hủy đặt chỗ này?";

      const result = await Swal.fire({
        icon: "warning",
        title: "Xác nhận huỷ đặt sân",
        text: message,
        showCancelButton: true,
        confirmButtonText: "Huỷ đặt sân",
        cancelButtonText: "Quay lại",
        confirmButtonColor: "#d33",
      });

      if (result.isConfirmed) {
        await cancelBookingApi(bookingId);
        await Swal.fire({
          icon: "success",
          title: "Huỷ đặt sân thành công",
          text: "Đặt sân của bạn đã được huỷ thành công.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Không thể lấy thông tin huỷ",
        text: "Vui lòng thử lại sau.",
      });
    }
  };

  const handleOpenRatingFromList = (bookingId) => {
    setRatingBookingId(bookingId);
    setShowRating(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="bl-main">
        <div className="bl-empty">
          <AlertCircle size={48} />
          <h2>Vui lòng đăng nhập</h2>
          <p>Bạn cần đăng nhập để xem sân đã đặt.</p>
          <Link to="/login" className="bl-btn primary">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="bl-main screen-bg-green"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bl-header">
        <button
          type="button"
          className="bl-back"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="bl-title">Sân đã đặt</h1>
        <p className="bl-subtitle">
          Danh sách đặt chỗ theo trạng thái, sắp xếp mới nhất trước.
        </p>
      </div>

      <form className="bl-search" onSubmit={handleSearch}>
        <div className="bl-search-inner">
          <Search size={20} className="bl-search-icon" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Nhập mã đặt chỗ (VD: 31)"
            value={bookingIdInput}
            onChange={(e) =>
              setBookingIdInput(e.target.value.replace(/\D/g, ""))
            }
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

      <div className="bl-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`bl-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {listError && (
        <div className="bl-error">
          <AlertCircle size={18} />
          <span>{listError}</span>
          {listError.includes("đăng nhập") && (
            <Link
              to="/login"
              className="bl-btn primary"
              style={{ marginLeft: 8 }}
            >
              Đăng nhập lại
            </Link>
          )}
        </div>
      )}

      {loadingList ? (
        <div className="bl-loading">
          <Loader2 size={32} className="spin" />
          <span>Đang tải danh sách...</span>
        </div>
      ) : (
        <div className="bl-list">
          {(() => {
            const filtered =
              activeTab === "all"
                ? list
                : list.filter((b) => getTabForStatus(b.status) === activeTab);
            if (filtered.length === 0) {
              return (
                <div className="bl-empty-state">
                  <p>
                    {activeTab === "all" && "Bạn chưa có đặt chỗ nào."}
                    {activeTab === "pending" && "Chưa có đơn chờ thanh toán."}
                    {activeTab === "upcoming" && "Chưa có đơn sắp tới."}
                    {activeTab === "completed" && "Chưa có đơn hoàn thành."}
                    {activeTab === "cancelled" && "Chưa có đơn đã hủy."}
                  </p>
                  {activeTab === "all" && list.length === 0 && (
                    <Link to="/venues" className="bl-btn primary">
                      Khám phá sân
                    </Link>
                  )}
                </div>
              );
            }
            return filtered.map((b) => (
              <div key={b.bookingId} className="bl-list-item">
                <div className="bl-list-info">
                  <div className="bl-badge-row">
                    <span
                      className="bl-list-badge"
                      data-status={
                        activeTab === "upcoming"
                          ? "upcoming"
                          : (b.status || "").toLowerCase()
                      }
                    >
                      {translateStatus(b.status)}
                    </span>
                    <span className="bl-list-id">Mã #{b.bookingId}</span>
                  </div>
                  <h3 className="bl-list-venue">{b.venueName || "—"}</h3>
                  {(b.address || b.ward || b.province) && (
                    <p className="bl-list-address">
                      <MapPin size={14} />
                      {[b.address, b.ward, b.province]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <p className="bl-list-meta">
                    <Calendar size={14} /> {formatDate(b.bookingDate)}
                  </p>
                </div>
                <div className="bl-list-actions">
                  {(b.status || "").toLowerCase() === "pending" && (
                    <button
                      type="button"
                      className="bl-btn primary bl-btn-sm"
                      onClick={() =>
                        handleContinuePaymentFromList(b.venueId, b.bookingId)
                      }
                    >
                      Tiếp tục thanh toán
                    </button>
                  )}
                  {(b.status || "").toLowerCase() === "booked" && (
                    <button
                      type="button"
                      className="bl-btn danger bl-btn-sm"
                      onClick={() => handleCancelFromList(b.bookingId)}
                    >
                      Hủy
                    </button>
                  )}
                  {(b.status || "").toLowerCase() === "completed" && (
                    <button
                      type="button"
                      className="bl-btn primary bl-btn-sm"
                      onClick={() => handleOpenRatingFromList(b.bookingId)}
                    >
                      Đánh giá
                    </button>
                  )}
                  <button
                    type="button"
                    className="bl-btn secondary bl-btn-sm"
                    onClick={() => setDetailPopupId(b.bookingId)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ));
          })()}
          {historyItems.length < totalItems && (
            <div className="bl-load-more">
              <button
                type="button"
                className="bl-btn outline bl-load-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Đang tải thêm..." : "Tải thêm"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Popup chi tiết đặt chỗ */}
      {detailPopupId != null && (
        <div
          className="bl-popup-overlay"
          onClick={closeDetailPopup}
          role="dialog"
          aria-modal="true"
        >
          <div className="bl-popup" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="bl-popup-close"
              onClick={closeDetailPopup}
              aria-label="Đóng"
            >
              <X size={24} />
            </button>
            {loadingDetailPopup ? (
              <div className="bl-popup-loading">
                <Loader2 size={32} className="spin" />
                <span>Đang tải...</span>
              </div>
            ) : !popupBooking ? (
              <div className="bl-popup-error">
                <AlertCircle size={32} />
                <p>Không tải được thông tin đặt chỗ.</p>
                <button
                  type="button"
                  className="bl-btn primary"
                  onClick={closeDetailPopup}
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="bl-detail-card bl-popup-card">
                <div className="bl-detail-header">
                  <div className="bl-badge-row">
                    <span
                      className="bl-badge"
                      data-status={(popupBooking.status || "").toLowerCase()}
                    >
                      {translateStatus(popupBooking.status)}
                    </span>
                  </div>
                  <div className="bl-popup-code">
                    Mã #{popupBooking.bookingId ?? popupBooking.id}
                  </div>
                </div>
                <h2 className="bl-venue-name">
                  <MapPin size={18} />
                  {popupBooking.venueName || "—"}
                </h2>
                <div className="bl-meta">
                  <span>
                    <Calendar size={16} /> {formatDate(popupBooking.date)}
                  </span>
                  <span>
                    <Receipt size={16} /> {formatPrice(popupBooking.totalPrice)}
                  </span>
                </div>
                <div className="bl-contact">
                  <p>
                    <strong>Người đặt:</strong>{" "}
                    {popupBooking.fullName ?? popupBooking.fullname ?? "—"}
                  </p>
                  <p>
                    <strong>SĐT:</strong>{" "}
                    {popupBooking.phone ?? popupBooking.phoneNumber ?? "—"}
                  </p>
                  {popupBooking.bookingNote && (
                    <p>
                      <strong>Ghi chú:</strong> {popupBooking.bookingNote}
                    </p>
                  )}
                </div>
                {popupBooking.expiredAt && (
                  <p className="bl-expiry">
                    <Clock size={14} /> Hết hạn thanh toán:{" "}
                    {formatDate(popupBooking.expiredAt)}{" "}
                    {formatTime(popupBooking.expiredAt)}
                  </p>
                )}
                {popupBooking.details && popupBooking.details.length > 0 && (
                  <div className="bl-slots">
                    <h3>Khung giờ đã đặt</h3>
                    <ul>
                      {popupBooking.details.map((slot, i) => (
                        <li key={i}>
                          {slot.fieldName ?? "Sân"} —{" "}
                          {formatTime(slot.startTime)} –{" "}
                          {formatTime(slot.endTime)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="bl-actions">
                  {(popupBooking.status || "").toLowerCase() === "pending" && (
                    <button
                      type="button"
                      className="bl-btn primary"
                      onClick={() =>
                        handleContinuePaymentFromList(
                          popupBooking.venueId,
                          popupBooking.bookingId ?? popupBooking.id,
                        )
                      }
                    >
                      Tiếp tục thanh toán
                    </button>
                  )}
                  {(popupBooking.status || "").toLowerCase() === "booked" && (
                    <button
                      type="button"
                      className="bl-btn danger"
                      onClick={() => handleCancelFromList(popupBooking.bookingId)}
                    >
                      Hủy đặt sân
                    </button>
                  )}
                  {(popupBooking.status || "").toLowerCase() ===
                    "completed" && (
                    <button
                      type="button"
                      className="bl-btn primary"
                      onClick={() => {
                        handleOpenRatingFromList(
                          popupBooking.bookingId ?? popupBooking.id,
                        );
                        closeDetailPopup();
                      }}
                    >
                      Đánh giá
                    </button>
                  )}
                  <Link
                    to={`/venue/${popupBooking.venueId}`}
                    className="bl-btn secondary"
                    onClick={closeDetailPopup}
                  >
                    Xem sân
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading &&
        !booking &&
        !error &&
        id &&
        !loadingList &&
        list.length === 0 && (
          <div className="bl-empty-state">
            <p>Không tìm thấy đặt chỗ với mã này.</p>
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
