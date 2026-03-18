import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Clock,
  Receipt,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  {
    key: "cancelled",
    label: "Đã hủy",
    statuses: ["CustomerCancelled", "OwnerCancelled"],
  },
];

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
  if (s === "customercancelled" || s === "ownercancelled") return "cancelled";
  return null;
}

function translateStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Chờ thanh toán";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy (khách)";
  if (s === "ownercancelled") return "Đã hủy (chủ sân)";
  if (s === "expired") return "Hết hạn";
  return status || "—";
}

const BookingList = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const [activeTab, setActiveTab] = useState("all");
  const [list, setList] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState(null);
  const [detailPopupId, setDetailPopupId] = useState(null);
  const [popupBooking, setPopupBooking] = useState(null);
  const [loadingDetailPopup, setLoadingDetailPopup] = useState(false);

  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: cancelBookingApi,
    onSuccess: (_, bookingId) => {
      setHistoryItems((prev) =>
        prev.map((item) =>
          (item.bookingId ?? item.BookingId) === bookingId
            ? { ...item, status: "Cancelled", Status: "Cancelled" }
            : item,
        ),
      );
      if (
        popupBooking &&
        (popupBooking.bookingId ?? popupBooking.id) === bookingId
      ) {
        setPopupBooking((prev) => ({ ...prev, status: "Cancelled" }));
      }
      queryClient.invalidateQueries({ queryKey: ["bookingHistory"] });
    },
  });

  const {
    data: bookingHistoryData,
    isLoading: loadingList,
    error: listError,
  } = useQuery({
    queryKey: ["bookingHistory", { page }],
    queryFn: () =>
      getBookingHistory({
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }),
    keepPreviousData: true,
    staleTime: 0,
  });

  useEffect(() => {
    const grouped = groupHistoryByBooking(historyItems);
    setList(grouped);
  }, [historyItems]);

  useEffect(() => {
    if (!bookingHistoryData) return;
    const items = bookingHistoryData.items || [];
    if (page === 1) {
      setHistoryItems(items);
      setTotalItems(bookingHistoryData.totalItems ?? items.length);
    }
  }, [bookingHistoryData, page]);

  const closeDetailPopup = () => {
    setDetailPopupId(null);
    setPopupBooking(null);
    if (id) navigate("/bookings");
  };

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
      setHistoryItems((prev) => [...prev, ...items]);
      setTotalItems(res.totalItems ?? historyItems.length + items.length);
      setPage(nextPage);
    } catch (e) {
    } finally {
      setLoadingMore(false);
    }
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
        await cancelMutation.mutateAsync(bookingId);
        await Swal.fire({
          icon: "success",
          title: "Huỷ đặt sân thành công",
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: e.data?.message || e.message || "Không thể huỷ đặt sân",
        text: "Vui lòng thử lại sau.",
      });
    }
  };

  const handleOpenRatingFromList = (bookingId) => {
    setRatingBookingId(bookingId);
    setShowRating(true);
  };

  useEffect(() => {
    if (id) setDetailPopupId(Number(id) || null);
  }, [id]);

  useEffect(() => {
    if (!detailPopupId) return;
    let cancelled = false;
    setLoadingDetailPopup(true);
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
  }, [detailPopupId]);

  return (
    <motion.div
      className="bl-main screen-bg-green"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bl-header">
        <button type="button" className="bl-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="bl-title">Sân đã đặt</h1>
      </div>

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

      {loadingList && page === 1 && historyItems.length === 0 ? (
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
                  <p>Không có dữ liệu đơn hàng.</p>
                </div>
              );
            }
            return filtered.map((b) => (
              <div key={b.bookingId} className="bl-list-item">
                <div className="bl-list-info">
                  <div className="bl-badge-row">
                    <span
                      className="bl-list-badge"
                      data-status={(b.status || "").toLowerCase()}
                    >
                      {translateStatus(b.status)}
                    </span>
                    <span className="bl-list-id">Mã #{b.bookingId}</span>
                  </div>
                  <h3 className="bl-list-venue">{b.venueName || "—"}</h3>
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
                      Thanh toán
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

      {detailPopupId != null && (
        <div className="bl-popup-overlay" onClick={closeDetailPopup}>
          <div className="bl-popup" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="bl-popup-close"
              onClick={closeDetailPopup}
            >
              <X size={24} />
            </button>
            {loadingDetailPopup ? (
              <div className="bl-popup-loading">
                <Loader2 size={32} className="spin" />
              </div>
            ) : popupBooking ? (
              <div className="bl-detail-card bl-popup-card">
                <div className="bl-detail-header">
                  <span
                    className="bl-badge"
                    data-status={(popupBooking.status || "").toLowerCase()}
                  >
                    {translateStatus(popupBooking.status)}
                  </span>
                  <div className="bl-popup-code">
                    Mã #{popupBooking.bookingId ?? popupBooking.id}
                  </div>
                </div>
                <h2 className="bl-venue-name">
                  <MapPin size={18} /> {popupBooking.venueName || "—"}
                </h2>
                <div className="bl-meta">
                  <span>
                    <Calendar size={16} />{" "}
                    {formatDate(popupBooking.date || popupBooking.bookingDate)}
                  </span>
                  <span>
                    <Receipt size={16} /> {formatPrice(popupBooking.totalPrice)}
                  </span>
                </div>
                <div className="bl-contact">
                  <p>
                    <strong>Người đặt:</strong>{" "}
                    {popupBooking.fullName ??
                      popupBooking.fullname ??
                      popupBooking.customerName ??
                      "—"}
                  </p>
                  <p>
                    <strong>SĐT:</strong>{" "}
                    {popupBooking.phone ??
                      popupBooking.phoneNumber ??
                      popupBooking.customerPhone ??
                      "—"}
                  </p>
                </div>
                {popupBooking.details && (
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
                  {(popupBooking.status || "").toLowerCase() === "booked" && (
                    <button
                      type="button"
                      className="bl-btn danger"
                      onClick={() =>
                        handleCancelFromList(
                          popupBooking.bookingId ?? popupBooking.id,
                        )
                      }
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
            ) : null}
          </div>
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
