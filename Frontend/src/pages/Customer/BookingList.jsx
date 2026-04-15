import { useState, useEffect, useMemo, useRef } from "react";
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
  Ticket,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  cancelBookingApi,
  getBookingById,
  getBookingHistory,
  getCancelBookingPreview,
} from "../../services/bookingService";
import { getCustomerEventHistory } from "../../services/eventService";
import { searchVenues } from "../../services/fieldService";
import GiveRating from "./GiveRating/GiveRating";
import "./BookingList.css";
import Swal from "sweetalert2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatVND } from "../../utils/helperFunction";
import emptyImg from "../../assets/images/empty-box.png";

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

const TYPE_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "daily", label: "Đơn ngày" },
  { key: "event", label: "Sự kiện" },
];

// Icon cho trạng thái
const statusIcon = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return <Clock3 size={16} className="bl-status-icon" />;
  if (s === "booked")
    return <CreditCard size={16} className="bl-status-icon" />;
  if (s === "completed")
    return (
      <CheckCircle2 size={16} className="bl-status-icon bl-status-icon--ok" />
    );
  if (s === "customercancelled" || s === "ownercancelled")
    return (
      <XCircle size={16} className="bl-status-icon bl-status-icon--danger" />
    );
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
    totalPrice: it?.totalPrice ?? it?.TotalPrice,
  };
}

/** Lọc theo tháng dương lịch (khớp tiêu đề “Thống kê tháng …”). */
function isSameCalendarMonth(dateVal, year, month1to12) {
  if (dateVal == null || dateVal === "") return false;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month1to12;
}

/** Các năm cho bộ lọc (khớp min/max trước đây của ô nhập). */
const BOOKING_LIST_YEAR_OPTIONS = Array.from({ length: 101 }, (_, i) =>
  String(2000 + i),
);

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

/**
 * Trạng thái hiển thị/lọc cho vé sự kiện — gộp ParticipantStatus + EventStatus từ API.
 * Khớp styling với đơn sân: pending | booked | completed | cancelled
 */
function resolveEventListStatus(participantStatus, eventStatus) {
  const ps = String(participantStatus ?? "").toLowerCase();
  const es = String(eventStatus ?? "").toLowerCase();

  if (ps === "cancelled" || es === "cancelled") return "cancelled";
  if (ps === "pending") return "pending";
  if (es === "completed") return "completed";
  if (ps === "joined") return "booked";
  return "booked";
}

function getEventHistoryTab(participantStatus, eventStatus) {
  const key = resolveEventListStatus(participantStatus, eventStatus);
  if (key === "pending") return "pending";
  if (key === "booked") return "upcoming";
  if (key === "completed") return "completed";
  if (key === "cancelled") return "cancelled";
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

function getBookingTypeMeta(item) {
  const rawType = String(
    item?.bookingType ?? item?.type ?? item?.category ?? "",
  ).toLowerCase();
  const isEvent =
    rawType.includes("event") ||
    rawType.includes("sự kiện") ||
    rawType.includes("su kien");
  return isEvent
    ? { label: "Sự kiện", className: "bl-type-tag bl-type-tag--event" }
    : { label: "Đơn ngày", className: "bl-type-tag bl-type-tag--daily" };
}

const FALLBACK_VENUE_IMAGE = "/placeholder-venue.jpg";

function normEventHistoryItem(raw) {
  const ticketParticipantId =
    raw?.ticketParticipantId ??
    raw?.TicketParticipantId ??
    raw?.ticketId ??
    raw?.TicketId ??
    raw?.id ??
    raw?.Id;
  if (ticketParticipantId == null) return null;
  const slotsRaw = raw?.slots ?? raw?.Slots ?? [];
  const slots = Array.isArray(slotsRaw)
    ? slotsRaw.map((s) => ({
        fieldName: s?.fieldName ?? s?.FieldName ?? "",
        startTime: s?.startTime ?? s?.StartTime,
        endTime: s?.endTime ?? s?.EndTime,
      }))
    : [];
  return {
    ticketParticipantId,
    eventId: raw?.eventId ?? raw?.EventId,
    venueName: raw?.venueName ?? raw?.VenueName ?? "",
    eventDate: raw?.eventDate ?? raw?.EventDate,
    ticketQuantity:
      Number(raw?.ticketQuantity ?? raw?.TicketQuantity ?? 0) || 0,
    totalAmount: raw?.totalAmount ?? raw?.TotalAmount,
    participantStatus: raw?.participantStatus ?? raw?.ParticipantStatus ?? "",
    eventStatus: raw?.eventStatus ?? raw?.EventStatus ?? "",
    slots,
  };
}

function translateEventHistoryStatus(participantStatus, eventStatus) {
  const key = resolveEventListStatus(participantStatus, eventStatus);
  if (key === "pending") return "Chờ thanh toán";
  if (key === "cancelled") return "Đã hủy";
  if (key === "completed") return "Hoàn thành";
  if (key === "booked") return "Đã tham gia";
  return "—";
}

function eventHistoryStatusIcon(participantStatus, eventStatus) {
  const key = resolveEventListStatus(participantStatus, eventStatus);
  if (key === "pending") return <Clock3 size={16} className="bl-status-icon" />;
  if (key === "booked")
    return <CreditCard size={16} className="bl-status-icon" />;
  if (key === "completed")
    return (
      <CheckCircle2 size={16} className="bl-status-icon bl-status-icon--ok" />
    );
  if (key === "cancelled")
    return (
      <XCircle size={16} className="bl-status-icon bl-status-icon--danger" />
    );
  return <Ticket size={16} className="bl-status-icon" />;
}

const BookingList = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const [activeTab, setActiveTab] = useState("all");
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const typeFilterRef = useRef(null);
  const [list, setList] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [eventItems, setEventItems] = useState([]);
  const [eventPage, setEventPage] = useState(1);
  const [eventTotalItems, setEventTotalItems] = useState(0);
  const [eventLoadingMore, setEventLoadingMore] = useState(false);

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
    setTypeFilterOpen(false);
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

  const activeTypeLabel = useMemo(
    () =>
      TYPE_FILTERS.find((t) => t.key === activeTypeFilter)?.label ?? "Tất cả",
    [activeTypeFilter],
  );

  useEffect(() => {
    if (!typeFilterOpen) return;
    const onPointerDown = (e) => {
      if (typeFilterRef.current && !typeFilterRef.current.contains(e.target)) {
        setTypeFilterOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [typeFilterOpen]);

  const cancelMutation = useMutation({
    mutationFn: cancelBookingApi,
    onSuccess: (_, bookingId) => {
      setHistoryItems((prev) =>
        prev.map((item) =>
          (item.bookingId ?? item.BookingId) === bookingId
            ? {
                ...item,
                status: "CustomerCancelled",
                Status: "CustomerCancelled",
              }
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
    queryKey: [
      "bookingHistory",
      { page, fromDate: activeFromDate, toDate: activeToDate },
    ],
    queryFn: () =>
      getBookingHistory({
        pageNumber: 1,
        pageSize: PAGE_SIZE,
        ...(activeFromDate ? { fromDate: activeFromDate } : {}),
        ...(activeToDate ? { toDate: activeToDate } : {}),
      }),
    keepPreviousData: true,
    staleTime: 0,
    enabled: Boolean(isAuthenticated),
  });

  const { data: eventHistoryData, isLoading: loadingEventList } = useQuery({
    queryKey: ["customerEventHistory"],
    queryFn: () =>
      getCustomerEventHistory({
        pageIndex: 1,
        pageSize: PAGE_SIZE,
      }),
    keepPreviousData: true,
    staleTime: 0,
    enabled: Boolean(isAuthenticated),
  });

  const { data: venueCatalogData } = useQuery({
    queryKey: ["venueCatalogForBookingList"],
    queryFn: () => searchVenues({ page: 1, pageSize: 100 }),
    staleTime: 1000 * 60 * 5,
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

  useEffect(() => {
    if (!eventHistoryData) return;
    const items = eventHistoryData.items || [];
    if (eventPage === 1) {
      setEventItems(items);
      setEventTotalItems(eventHistoryData.totalItems ?? items.length);
    }
  }, [eventHistoryData, eventPage]);

  const combinedList = useMemo(() => {
    const filteredVenue =
      activeTab === "all"
        ? list
        : list.filter((b) => getTabForStatus(b.status) === activeTab);
    const venueRows = filteredVenue.map((b) => ({
      kind: "venue",
      id: `venue-${b.bookingId}`,
      sortDate: b.bookingDate,
      data: b,
    }));
    const filteredEvents = (eventItems || [])
      .map(normEventHistoryItem)
      .filter(Boolean)
      .filter((ev) =>
        activeTab === "all"
          ? true
          : getEventHistoryTab(ev.participantStatus, ev.eventStatus) ===
            activeTab,
      );
    const eventRows = filteredEvents.map((ev) => ({
      kind: "event",
      id: `event-${ev.ticketParticipantId}`,
      sortDate: ev.eventDate,
      data: ev,
    }));
    let rows = [...venueRows, ...eventRows];
    if (activeTypeFilter === "daily")
      rows = rows.filter((row) => row.kind === "venue");
    if (activeTypeFilter === "event")
      rows = rows.filter((row) => row.kind === "event");
    return rows.sort(
      (a, b) =>
        new Date(String(b.sortDate || 0)) - new Date(String(a.sortDate || 0)),
    );
  }, [list, eventItems, activeTab, activeTypeFilter]);

  /** Thống kê sidebar: chỉ đơn/vé hoàn thành trong tháng hiện tại (theo tiêu đề card). */
  const sideStatsCompleted = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const venueCompleted = list.filter(
      (b) =>
        String(b.status || "").toLowerCase() === "completed" &&
        isSameCalendarMonth(b.bookingDate, y, m),
    );
    const eventCompleted = (eventItems || [])
      .map(normEventHistoryItem)
      .filter(Boolean)
      .filter(
        (ev) =>
          resolveEventListStatus(ev.participantStatus, ev.eventStatus) ===
            "completed" && isSameCalendarMonth(ev.eventDate, y, m),
      );

    const count = venueCompleted.length + eventCompleted.length;
    const sum =
      venueCompleted.reduce((s, b) => s + Number(b.totalPrice ?? 0), 0) +
      eventCompleted.reduce((s, e) => s + Number(e.totalAmount ?? 0), 0);

    return { count, sum };
  }, [list, eventItems]);

  const venueCatalog = useMemo(() => {
    if (Array.isArray(venueCatalogData)) return venueCatalogData;
    return venueCatalogData?.items || venueCatalogData?.Items || [];
  }, [venueCatalogData]);

  const venueThumbById = useMemo(() => {
    const map = new Map();
    for (const v of venueCatalog) {
      const id = v?.venueId ?? v?.VenueId;
      const thumb = v?.thumbnailUrl ?? v?.ThumbnailUrl;
      if (id != null && thumb) map.set(Number(id), thumb);
    }
    return map;
  }, [venueCatalog]);

  const venueThumbByName = useMemo(() => {
    const map = new Map();
    for (const v of venueCatalog) {
      const name = String(v?.venueName ?? v?.VenueName ?? "")
        .trim()
        .toLowerCase();
      const thumb = v?.thumbnailUrl ?? v?.ThumbnailUrl;
      if (name && thumb && !map.has(name)) map.set(name, thumb);
    }
    return map;
  }, [venueCatalog]);

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
      setPage(nextPage); // chỉ để track UI, không ảnh hưởng queryKey
    } catch (e) {
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMoreEvents = async () => {
    if (eventLoadingMore) return;
    const nextPage = eventPage + 1;
    setEventLoadingMore(true);
    try {
      const res = await getCustomerEventHistory({
        pageIndex: nextPage,
        pageSize: PAGE_SIZE,
      });
      const items = res.items || [];
      setEventItems((prev) => [...prev, ...items]);
      setEventTotalItems(res.totalItems ?? eventItems.length + items.length);
      setEventPage(nextPage);
    } catch (e) {
    } finally {
      setEventLoadingMore(false);
    }
  };

  const handleContinuePaymentFromList = (venueId, bookingId) => {
    navigate(`/booking/${bookingId}/payment`, {
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
      className="bl-main"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bl-header">
        <button type="button" className="bl-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="bl-header-text">
          <h1 className="bl-title">Lịch sử đặt sân & sự kiện</h1>
          <p className="bl-subtitle">
            Theo dõi đơn ngày và vé sự kiện của bạn ở một nơi.
          </p>
        </div>
      </div>

      <div className="bl-toolbar">
        <div className="bl-tabs-rail">
          <div
            className="bl-tabs"
            role="tablist"
            aria-label="Bộ lọc trạng thái"
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`bl-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => {
                  setTypeFilterOpen(false);
                  setActiveTab(tab.key);
                }}
                role="tab"
                aria-selected={activeTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bl-toolbar-right">
          <div className="bl-type-filter" ref={typeFilterRef}>
            <span
              className="bl-type-filter-heading"
              id="booking-type-filter-label"
            >
              Loại
            </span>
            <div className="bl-type-filter-card">
              <button
                type="button"
                className={`bl-type-filter-trigger${typeFilterOpen ? " is-open" : ""}`}
                aria-expanded={typeFilterOpen}
                aria-haspopup="listbox"
                aria-labelledby="booking-type-filter-label"
                onClick={() => {
                  setDatePanelOpen(false);
                  setTypeFilterOpen((v) => !v);
                }}
              >
                <span className="bl-type-filter-value">{activeTypeLabel}</span>
                <ChevronDown
                  size={18}
                  className="bl-type-filter-chevron"
                  aria-hidden
                />
              </button>
              <AnimatePresence>
                {typeFilterOpen ? (
                  <motion.div
                    className="bl-type-filter-panel"
                    role="listbox"
                    aria-labelledby="booking-type-filter-label"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {TYPE_FILTERS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="option"
                        aria-selected={activeTypeFilter === opt.key}
                        className={`bl-type-filter-option${
                          activeTypeFilter === opt.key ? " active" : ""
                        }`}
                        onClick={() => {
                          setActiveTypeFilter(opt.key);
                          setTypeFilterOpen(false);
                        }}
                      >
                        <span className="bl-type-filter-option-label">
                          {opt.label}
                        </span>
                        {activeTypeFilter === opt.key ? (
                          <Check
                            size={18}
                            className="bl-type-filter-option-check"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                        ) : (
                          <span
                            className="bl-type-filter-option-check-placeholder"
                            aria-hidden
                          />
                        )}
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="bl-date-filter-wrap">
            <div className="bl-date-filter-card">
              <button
                type="button"
                className="bl-date-filter-top"
                onClick={() => {
                  setTypeFilterOpen(false);
                  if (datePanelOpen) setDatePanelOpen(false);
                  else openDatePanel();
                }}
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
                              onChange={(e) =>
                                setDraftRangeFrom(e.target.value)
                              }
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
                            <select
                              className={`bl-date-filter-input bl-date-filter-select${draftYear ? "" : " bl-date-filter-select--placeholder"}`}
                              value={draftYear}
                              onChange={(e) => setDraftYear(e.target.value)}
                            >
                              <option value="">Chọn năm</option>
                              {BOOKING_LIST_YEAR_OPTIONS.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}
                    </div>

                    <div className="bl-date-filter-actions">
                      <button
                        type="button"
                        className="bl-btn secondary bl-btn-sm"
                        onClick={() => setDatePanelOpen(false)}
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        className="bl-btn primary bl-btn-sm"
                        onClick={applyDraftFilter}
                      >
                        Áp dụng
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {loadingList && loadingEventList && page === 1 && eventPage === 1 ? (
        <div className="bl-loading">
          <Loader2 size={32} className="spin" />
          <span>Đang tải danh sách...</span>
        </div>
      ) : (
        <div className="bl-content-grid">
          <div className="bl-list">
            {(() => {
              if (combinedList.length === 0) {
                return (
                  <div className="bl-empty-state">
                    <img
                      className="bl-empty-illustration"
                      src={emptyImg}
                      alt="empty"
                    />
                    <p>Không có dữ liệu.</p>
                  </div>
                );
              }
              return combinedList.map((row, idx) => {
                if (row.kind === "event") {
                  const ev = row.data;
                  const stLower = resolveEventListStatus(
                    ev.participantStatus,
                    ev.eventStatus,
                  );
                  const slotLabel = (ev.slots || [])
                    .map(
                      (s) =>
                        `${formatTime(s.startTime)}–${formatTime(s.endTime)}`,
                    )
                    .join(", ");
                  const thumb =
                    venueThumbByName.get(
                      String(ev.venueName || "")
                        .trim()
                        .toLowerCase(),
                    ) || FALLBACK_VENUE_IMAGE;
                  return (
                    <motion.div
                      key={row.id}
                      className="bl-list-item bl-list-item--event"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <div className="bl-card-media">
                        <img src={thumb} alt={ev.venueName || "venue"} />
                      </div>
                      <div className="bl-list-info">
                        <span className="bl-type-tag bl-type-tag--event">
                          Sự kiện
                        </span>
                        <div className="bl-badge-row">
                          <span className="bl-list-badge" data-status={stLower}>
                            {eventHistoryStatusIcon(
                              ev.participantStatus,
                              ev.eventStatus,
                            )}
                            {translateEventHistoryStatus(
                              ev.participantStatus,
                              ev.eventStatus,
                            )}
                          </span>
                          <span className="bl-list-id">
                            Vé #{ev.ticketParticipantId}
                          </span>
                        </div>
                        <h3 className="bl-list-venue">{ev.venueName || "—"}</h3>
                        <div className="bl-list-meta">
                          <span className="bl-meta-item">
                            <Calendar size={14} /> {formatDate(ev.eventDate)}
                          </span>
                          {slotLabel ? (
                            <span className="bl-meta-item">
                              <Clock size={14} />
                              <span className="bl-ellipsis">{slotLabel}</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="bl-list-price">
                          <Receipt size={14} /> {ev.totalAmount} ·{" "}
                          {ev.ticketQuantity} vé
                        </div>
                      </div>
                      <div className="bl-list-actions">
                        {stLower === "pending" && (
                          <button
                            type="button"
                            className="bl-btn primary bl-btn-sm"
                            onClick={() =>
                              navigate(
                                `/event/ticket/${ev.ticketParticipantId}/payment`,
                              )
                            }
                          >
                            <CreditCard size={16} className="bl-btn-icon" />{" "}
                            Thanh toán
                          </button>
                        )}
                        <button
                          type="button"
                          className="bl-btn secondary bl-btn-sm"
                          onClick={() =>
                            navigate(`/event/ticket/${ev.ticketParticipantId}`)
                          }
                        >
                          <Ticket size={16} className="bl-btn-icon" /> Xem vé
                        </button>
                        {ev.eventId != null ? (
                          <button
                            type="button"
                            className="bl-btn outline bl-btn-sm"
                            onClick={() => navigate(`/event/${ev.eventId}`)}
                          >
                            <AlertCircle size={16} className="bl-btn-icon" /> Sự
                            kiện
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                }
                const b = row.data;
                const thumb =
                  venueThumbById.get(Number(b.venueId)) ||
                  venueThumbByName.get(
                    String(b.venueName || "")
                      .trim()
                      .toLowerCase(),
                  ) ||
                  FALLBACK_VENUE_IMAGE;
                return (
                  <motion.div
                    key={row.id}
                    className="bl-list-item bl-list-item--daily"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div className="bl-card-media">
                      <img src={thumb} alt={b.venueName || "venue"} />
                    </div>
                    <div className="bl-list-info">
                      <span className="bl-type-tag bl-type-tag--daily">
                        Đơn ngày
                      </span>
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
                          <Receipt size={14} /> {b.totalPrice}
                        </div>
                      )}
                    </div>
                    <div className="bl-list-actions">
                      {(b.status || "").toLowerCase() === "pending" && (
                        <button
                          type="button"
                          className="bl-btn primary bl-btn-sm"
                          onClick={() =>
                            handleContinuePaymentFromList(
                              b.venueId,
                              b.bookingId,
                            )
                          }
                        >
                          <CreditCard size={16} className="bl-btn-icon" /> Thanh
                          toán
                        </button>
                      )}
                      {(b.status || "").toLowerCase() === "booked" && (
                        <button
                          type="button"
                          className="bl-btn danger bl-btn-sm"
                          onClick={() => handleCancelFromList(b.bookingId)}
                          disabled={cancelMutation.isLoading}
                        >
                          <XCircle size={16} className="bl-btn-icon" />
                          {cancelMutation.isLoading ? "Đang huỷ..." : "Hủy"}
                        </button>
                      )}
                      {(b.status || "").toLowerCase() === "completed" && (
                        <button
                          type="button"
                          className="bl-btn primary bl-btn-sm"
                          onClick={() => handleOpenRatingFromList(b.bookingId)}
                        >
                          <CheckCircle2 size={16} className="bl-btn-icon" />{" "}
                          Đánh giá
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
                        <AlertCircle size={16} className="bl-btn-icon" /> Xem
                        chi tiết
                      </button>
                    </div>
                  </motion.div>
                );
              });
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
            {eventItems.length < eventTotalItems && (
              <div className="bl-load-more">
                <button
                  type="button"
                  className="bl-btn outline bl-load-btn"
                  onClick={handleLoadMoreEvents}
                  disabled={eventLoadingMore}
                >
                  {eventLoadingMore
                    ? "Đang tải thêm sự kiện..."
                    : "Tải thêm sự kiện"}
                </button>
              </div>
            )}
          </div>
         
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
                  const statusLower = String(
                    popupBooking.status || "",
                  ).toLowerCase();
                  const isCancelled =
                    statusLower === "ownercancelled" ||
                    statusLower === "customercancelled";
                  const cancelReason =
                    popupBooking.cancelReason ??
                    popupBooking.CancelReason ??
                    popupBooking.ownerCancelReason ??
                    popupBooking.OwnerCancelReason ??
                    null;
                  return (
                    <>
                      <div className="bl-ticket-header">
                        <div>
                          <h2 className="bl-ticket-title">Đơn ngày</h2>
                          <span
                            className="bl-badge"
                            data-status={(
                              popupBooking.status || ""
                            ).toLowerCase()}
                          >
                            {translateStatus(popupBooking.status)}
                          </span>
                        </div>
                        <div className="bl-ticket-top-actions"></div>
                      </div>
                      <div className="bl-ticket-body">
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">
                            <Receipt size={16} /> Mã đơn
                          </span>
                          <strong className="bl-ticket-value">
                            #{popupBooking.bookingId ?? popupBooking.id}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">
                            <Calendar size={16} /> Ngày đặt
                          </span>
                          <strong className="bl-ticket-value">
                            {formatDate(
                              popupBooking.date || popupBooking.bookingDate,
                            )}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">
                            <MapPin size={16} /> Sân
                          </span>
                          <strong className="bl-ticket-value">
                            {popupBooking.venueName || "—"}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">
                            <Clock3 size={16} /> Khung giờ
                          </span>
                          <strong className="bl-ticket-value">
                            {Array.isArray(popupBooking.details) &&
                            popupBooking.details.length
                              ? popupBooking.details
                                  .map(
                                    (slot) =>
                                      `${slot.fieldName ?? "Sân"} ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
                                  )
                                  .join(" | ")
                              : "—"}
                          </strong>
                        </div>
                        <div className="bl-ticket-row bl-ticket-row--total">
                          <span className="bl-ticket-label">
                            <Receipt size={16} /> Tổng tiền
                          </span>
                          <strong className="bl-ticket-value">
                            {formatVND(popupBooking.totalPrice)}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">Người đặt</span>
                          <strong className="bl-ticket-value">
                            {popupBooking.fullName ??
                              popupBooking.fullname ??
                              popupBooking.customerName ??
                              "—"}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">Số điện thoại</span>
                          <strong className="bl-ticket-value">
                            {popupBooking.phone ??
                              popupBooking.phoneNumber ??
                              popupBooking.customerPhone ??
                              "—"}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">Ghi chú</span>
                          <strong className="bl-ticket-value">
                            {popupBooking.note ??
                              popupBooking.bookingNote ??
                              "—"}
                          </strong>
                        </div>
                      </div>
                      {isCancelled ? (
                        <div className="bl-cancel-reason">
                          <h3>Lý do hủy</h3>
                          <p>
                            {String(
                              cancelReason ||
                                "Không có lý do cụ thể từ hệ thống.",
                            )}
                          </p>
                        </div>
                      ) : null}
                      <div className="bl-actions">
                        {(popupBooking.status || "").toLowerCase() ===
                          "booked" && (
                          <button
                            type="button"
                            className="bl-btn danger"
                            onClick={() =>
                              handleCancelFromList(
                                popupBooking.bookingId ?? popupBooking.id,
                              )
                            }
                            disabled={cancelMutation.isLoading}
                          >
                            {cancelMutation.isLoading
                              ? "Đang huỷ..."
                              : "Hủy đặt sân"}
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
