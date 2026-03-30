import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Clock,
  Receipt,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  XCircle,
  Clock3,
  CreditCard,
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

// Icon cho trạng thái
const statusIcon = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return <Clock3 size={16} className="bl-status-icon" />;
  if (s === "booked") return <CreditCard size={16} className="bl-status-icon" />;
  if (s === "completed")
    return <CheckCircle2 size={16} className="bl-status-icon bl-status-icon--ok" />;
  if (s === "customercancelled" || s === "ownercancelled")
    return <XCircle size={16} className="bl-status-icon bl-status-icon--danger" />;
  return null;
};

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

  // Date filter panel (range/month/year)
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [activeDateMode, setActiveDateMode] = useState("all"); // all | range | month | year
  const [activeFromDate, setActiveFromDate] = useState(""); // yyyy-mm-dd
  const [activeToDate, setActiveToDate] = useState(""); // yyyy-mm-dd

  const [draftDateMode, setDraftDateMode] = useState(activeDateMode);
  const [draftRangeFrom, setDraftRangeFrom] = useState("");
  const [draftRangeTo, setDraftRangeTo] = useState("");
  const [draftMonth, setDraftMonth] = useState(""); // yyyy-mm
  const [draftYear, setDraftYear] = useState(""); // yyyy

  const openDatePanel = () => {
    setDraftDateMode(activeDateMode);
    if (activeDateMode === "range") {
      setDraftRangeFrom(activeFromDate);
      setDraftRangeTo(activeToDate);
      setDraftMonth("");
      setDraftYear("");
    } else if (activeDateMode === "month") {
      setDraftMonth(activeFromDate ? activeFromDate.slice(0, 7) : "");
      setDraftYear("");
      setDraftRangeFrom("");
      setDraftRangeTo("");
    } else if (activeDateMode === "year") {
      setDraftYear(activeFromDate ? activeFromDate.slice(0, 4) : "");
      setDraftMonth("");
      setDraftRangeFrom("");
      setDraftRangeTo("");
    } else {
      setDraftRangeFrom("");
      setDraftRangeTo("");
      setDraftMonth("");
      setDraftYear("");
    }
    setDatePanelOpen(true);
  };

  const resetAndApplyDates = (nextMode, nextFrom, nextTo) => {
    setActiveDateMode(nextMode);
    setActiveFromDate(nextFrom || "");
    setActiveToDate(nextTo || "");
    setDatePanelOpen(false);
    setPage(1);
    setHistoryItems([]);
    setTotalItems(0);
  };

  const computeFromToFromDraft = () => {
    if (draftDateMode === "range") {
      if (!draftRangeFrom || !draftRangeTo) return null;
      return { from: draftRangeFrom, to: draftRangeTo };
    }
    if (draftDateMode === "month") {
      if (!draftMonth) return null;
      const [y, m] = draftMonth.split("-");
      const monthIndex = Number(m) - 1;
      const lastDay = new Date(Number(y), monthIndex + 1, 0).getDate();
      const mm = String(m).padStart(2, "0");
      const ddFrom = "01";
      const ddTo = String(lastDay).padStart(2, "0");
      return { from: `${y}-${mm}-${ddFrom}`, to: `${y}-${mm}-${ddTo}` };
    }
    if (draftDateMode === "year") {
      if (!draftYear) return null;
      return { from: `${draftYear}-01-01`, to: `${draftYear}-12-31` };
    }
    return null;
  };

  const applyDraftFilter = () => {
    if (draftDateMode === "all") {
      resetAndApplyDates("all", "", "");
      return;
    }
    const ft = computeFromToFromDraft();
    if (!ft) return;
    resetAndApplyDates(draftDateMode, ft.from, ft.to);
  };

  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: cancelBookingApi,
    onSuccess: (_, bookingId) => {
      setHistoryItems((prev) =>
        prev.map((item) =>
          (item.bookingId ?? item.BookingId) === bookingId
            ? { ...item, status: "CustomerCancelled", Status: "CustomerCancelled" }
            : item,
        ),
      );
      if (
        popupBooking &&
        (popupBooking.bookingId ?? popupBooking.id) === bookingId
      ) {
        setPopupBooking((prev) => ({ ...prev, status: "CustomerCancelled" }));
      }
      queryClient.invalidateQueries({ queryKey: ["bookingHistory"] });
    },
  });

  const {
    data: bookingHistoryData,
    isLoading: loadingList,
    error: listError,
  } = useQuery({
    queryKey: ["bookingHistory", { page, fromDate: activeFromDate, toDate: activeToDate }],
    queryFn: () =>
      getBookingHistory({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        ...(activeFromDate ? { fromDate: activeFromDate } : {}),
        ...(activeToDate ? { toDate: activeToDate } : {}),
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
    setDatePanelOpen(false);
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
        ...(activeFromDate ? { fromDate: activeFromDate } : {}),
        ...(activeToDate ? { toDate: activeToDate } : {}),
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

      <div className="bl-toolbar">
        <div className="bl-tabs" role="tablist" aria-label="Bộ lọc trạng thái">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`bl-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bl-date-filter-wrap">
          <div className="bl-date-filter-card">
            <button
              type="button"
              className="bl-date-filter-top"
              onClick={() => (datePanelOpen ? setDatePanelOpen(false) : openDatePanel())}
            >
              <span className="bl-date-filter-top-text">
                {activeDateMode === "all"
                  ? "Xem tất cả"
                  : activeDateMode === "range"
                    ? "Khoảng ngày"
                    : activeDateMode === "month"
                      ? "Theo tháng"
                      : "Theo năm"}
              </span>
              <span className="bl-date-filter-top-icon" aria-hidden>
                <span className="bl-date-filter-top-icon-dot" />
                <span className="bl-date-filter-top-icon-dot" />
                <span className="bl-date-filter-top-icon-dot" />
              </span>
            </button>

            <AnimatePresence>
              {datePanelOpen ? (
              <motion.div
                className="bl-date-filter-panel"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
              <button
                type="button"
                className={`bl-date-filter-item${draftDateMode === "range" ? " active" : ""}`}
                onClick={() => setDraftDateMode("range")}
              >
                Chọn khoảng ngày
              </button>
              <button
                type="button"
                className={`bl-date-filter-item${draftDateMode === "month" ? " active" : ""}`}
                onClick={() => setDraftDateMode("month")}
              >
                Chọn tháng
              </button>
              <button
                type="button"
                className={`bl-date-filter-item${draftDateMode === "year" ? " active" : ""}`}
                onClick={() => setDraftDateMode("year")}
              >
                Chọn năm
              </button>
              <button
                type="button"
                className={`bl-date-filter-item${draftDateMode === "all" ? " active" : ""}`}
                onClick={() => setDraftDateMode("all")}
              >
                Xem tất cả
              </button>

              <div className="bl-date-filter-controls">
                {draftDateMode === "range" ? (
                  <div className="bl-date-filter-row">
                    <label className="bl-date-filter-label">
                      Từ
                      <input
                        className="bl-date-filter-input"
                        type="date"
                        value={draftRangeFrom}
                        onChange={(e) => setDraftRangeFrom(e.target.value)}
                      />
                    </label>
                    <label className="bl-date-filter-label">
                      Đến
                      <input
                        className="bl-date-filter-input"
                        type="date"
                        value={draftRangeTo}
                        onChange={(e) => setDraftRangeTo(e.target.value)}
                      />
                    </label>
                  </div>
                ) : null}

                {draftDateMode === "month" ? (
                  <div className="bl-date-filter-row">
                    <label className="bl-date-filter-label">
                      Tháng
                      <input
                        className="bl-date-filter-input"
                        type="month"
                        value={draftMonth}
                        onChange={(e) => setDraftMonth(e.target.value)}
                      />
                    </label>
                  </div>
                ) : null}

                {draftDateMode === "year" ? (
                  <div className="bl-date-filter-row">
                    <label className="bl-date-filter-label">
                      Năm
                      <input
                        className="bl-date-filter-input"
                        type="number"
                        inputMode="numeric"
                        min="2000"
                        max="2100"
                        value={draftYear}
                        onChange={(e) => setDraftYear(e.target.value)}
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="bl-date-filter-actions">
                <button type="button" className="bl-btn secondary bl-btn-sm" onClick={() => setDatePanelOpen(false)}>
                  Đóng
                </button>
                <button type="button" className="bl-btn primary bl-btn-sm" onClick={applyDraftFilter}>
                  Áp dụng
                </button>
              </div>
              </motion.div>
            ) : null}
            </AnimatePresence>
          </div>
        </div>
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
                  <img
                    className="bl-empty-illustration"
                    src="/assets/images/empty-box.png"
                    alt="empty"
                  />
                  <p>Không có dữ liệu đơn hàng.</p>
                </div>
              );
            }
            return filtered.map((b, idx) => (
              <motion.div
                key={b.bookingId}
                className="bl-list-item"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="bl-list-info">
                  <div className="bl-badge-row">
                    <span
                      className="bl-list-badge"
                      data-status={(b.status || "").toLowerCase()}
                    >
                      {statusIcon(b.status)}
                      {translateStatus(b.status)}
                    </span>
                    <span className="bl-list-id">Mã #{b.bookingId}</span>
                  </div>
                  <h3 className="bl-list-venue">{b.venueName || "—"}</h3>
                  <div className="bl-list-meta">
                    <span className="bl-meta-item">
                      <Calendar size={14} /> {formatDate(b.bookingDate)}
                    </span>
                    {b.address && (
                      <span className="bl-meta-item">
                        <MapPin size={14} />
                        <span className="bl-ellipsis">{b.address}</span>
                      </span>
                    )}
                  </div>
                  {b.totalPrice && (
                    <div className="bl-list-price">
                      <Receipt size={14} /> {formatPrice(b.totalPrice)}
                    </div>
                  )}
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
                      <CreditCard size={16} className="bl-btn-icon" /> Thanh toán
                    </button>
                  )}
                  {(b.status || "").toLowerCase() === "booked" && (
                    <button type="button" className="bl-btn danger bl-btn-sm" onClick={() => handleCancelFromList(b.bookingId)} disabled={cancelMutation.isLoading}>
                      <XCircle size={16} className="bl-btn-icon" />
                      {cancelMutation.isLoading ? 'Đang huỷ...' : 'Hủy'}
                    </button>
                  )}
                  {(b.status || "").toLowerCase() === "completed" && (
                    <button
                      type="button"
                      className="bl-btn primary bl-btn-sm"
                      onClick={() => handleOpenRatingFromList(b.bookingId)}
                    >
                      <CheckCircle2 size={16} className="bl-btn-icon" /> Đánh giá
                    </button>
                  )}
                  <button
                    type="button"
                    className="bl-btn secondary bl-btn-sm"
                    onClick={() => {
                      setDatePanelOpen(false);
                      setDetailPopupId(b.bookingId);
                    }}
                  >
                    <AlertCircle size={16} className="bl-btn-icon" /> Xem chi tiết
                  </button>
                </div>
              </motion.div>
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
                {(() => {
                  const statusLower = String(popupBooking.status || "").toLowerCase();
                  const isCancelled =
                    statusLower === "ownercancelled" || statusLower === "customercancelled";
                  const cancelReason =
                    popupBooking.cancelReason ??
                    popupBooking.CancelReason ??
                    popupBooking.ownerCancelReason ??
                    popupBooking.OwnerCancelReason ??
                    null;
                  return (
                    <>
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
                {isCancelled ? (
                  <div className="bl-cancel-reason">
                    <h3>Lý do hủy</h3>
                    <p>{String(cancelReason || "Không có lý do cụ thể từ hệ thống.")}</p>
                  </div>
                ) : null}
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
                    <button type="button" className="bl-btn danger" onClick={() => handleCancelFromList(popupBooking.bookingId ?? popupBooking.id)} disabled={cancelMutation.isLoading}>
                      {cancelMutation.isLoading ? 'Đang huỷ...' : 'Hủy đặt sân'}
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
                    </>
                  );
                })()}
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
