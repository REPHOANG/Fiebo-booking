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
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Clock3,
  CreditCard,
  Ticket,
  ChevronDown,
  Check,
  Flag,
} from "lucide-react";
import {
  cancelBookingApi,
  getBookingById,
  getBookingHistory,
  getCancelBookingPreview,
  sendBookingReport,
  getMyReportDetail,
} from "../../services/bookingService";
import {
  cancelEventTicket,
  getCustomerEventHistory,
} from "../../services/eventService";
import GiveRating from "./GiveRating/GiveRating";
import "./BookingList.css";
import Swal from "sweetalert2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate, formatTime, formatVND } from "../../utils/helperFunction";
import emptyImg from "../../assets/images/empty-box.png";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ thanh toán", statuses: ["Holding"] },
  { key: "upcoming", label: "Sắp tới", statuses: ["Booked", "Pending"] },
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
  if (s === "pending" || s === "holding")
    return <Clock3 size={16} className="bl-status-icon" />;
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
    thumbnailUrl: it?.thumbnailUrl ?? it?.ThumbnailUrl,
    address: it?.address ?? it?.Address,
    province: it?.province ?? it?.Province,
    ward: it?.ward ?? it?.Ward,
    venueId: it?.venueId ?? it?.VenueId,
    totalPrice: it?.totalPrice ?? it?.TotalPrice,
    canReview: Boolean(it?.canReview),
    canCancel: Boolean(it?.canCancel ?? it?.CanCancel),
  };
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
  return [...byId.values()];
}

function getTabForStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "holding") return "pending";
  if (s === "pending" || s === "booked") return "upcoming";
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
  if (s === "holding") return "Chờ thanh toán";
  if (s === "pending") return "Chờ xác nhận";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy (khách)";
  if (s === "ownercancelled") return "Đã hủy (chủ sân)";
  if (s === "cancelled") return "Đã hủy";
  if (s === "rejected") return "Đã từ chối";
  if (s === "expired") return "Hết hạn";
  return status || "—";
}

const FALLBACK_VENUE_IMAGE =
  "https://c.pxhere.com/photos/c0/3e/football_pitch_football_rush_american_football-976043.jpg!s2";
const handleImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_VENUE_IMAGE;
};

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
    thumbnailUrl: raw?.thumbnailUrl ?? raw?.ThumbnailUrl,
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
  const [cancellingEventTicketId, setCancellingEventTicketId] = useState(null);

  const [showRating, setShowRating] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState(null);
  const [detailPopupId, setDetailPopupId] = useState(null);
  const [popupBooking, setPopupBooking] = useState(null);
  const [loadingDetailPopup, setLoadingDetailPopup] = useState(false);

  // Report modal: { bookingId } | null
  const [reportModal, setReportModal] = useState(null);
  const [reportForm, setReportForm] = useState({ title: "", content: "" });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  // Report detail modal
  const [reportDetailModal, setReportDetailModal] = useState(null); // { reportId }
  const [reportDetail, setReportDetail] = useState(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  // Map bookingId -> reportId (sau khi đã gửi report)
  const [bookingReportMap, setBookingReportMap] = useState({});

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

  const cancelEventTicketMutation = useMutation({
    mutationFn: cancelEventTicket,
    onSuccess: (_, ticketParticipantId) => {
      setEventItems((prev) =>
        prev.map((item) => {
          const itemId = item?.ticketParticipantId ?? item?.TicketParticipantId;
          if (itemId !== ticketParticipantId) return item;
          return {
            ...item,
            participantStatus: "Cancelled",
            ParticipantStatus: "Cancelled",
          };
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["customerEventHistory"] });
    },
  });

  const { data: bookingHistoryData, isLoading: loadingList } = useQuery({
    queryKey: [
      "bookingHistory",
      { fromDate: activeFromDate, toDate: activeToDate },
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
    return rows;
  }, [list, eventItems, activeTab, activeTypeFilter]);

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

  const handleOpenReport = (bookingId) => {
    setReportForm({ title: "", content: "" });
    setReportModal({ bookingId });
  };

  const handleSubmitReport = async () => {
    if (!reportForm.title.trim() || !reportForm.content.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung báo cáo.");
      return;
    }
    setReportSubmitting(true);
    try {
      const res = await sendBookingReport({
        bookingId: reportModal.bookingId,
        title: reportForm.title.trim(),
        content: reportForm.content.trim(),
      });
      // Lưu reportId nếu API trả về
      const reportId = res?.data?.id ?? res?.id ?? res?.reportId ?? null;
      setBookingReportMap((prev) => ({
        ...prev,
        [reportModal.bookingId]: reportId ?? true,
      }));
      setReportModal(null);
      await Swal.fire({
        icon: "success",
        title: "Báo cáo đã được gửi!",
        text: "Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gửi báo cáo thất bại",
        text: err?.response?.data?.message ?? "Vui lòng thử lại sau.",
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleViewReportDetail = async (reportId) => {
    if (!reportId || reportId === true) {
      Swal.fire({
        icon: "info",
        title: "Đã gửi báo cáo",
        text: "Báo cáo đang được xử lý. Không thể xem chi tiết ngay lúc này.",
      });
      return;
    }
    setReportDetailModal({ reportId });
    setReportDetail(null);
    setReportDetailLoading(true);
    try {
      const data = await getMyReportDetail(reportId);
      setReportDetail(data);
    } catch (err) {
      setReportDetail(null);
    } finally {
      setReportDetailLoading(false);
    }
  };

  const handleCancelEventTicketFromList = async (ticketParticipantId) => {
    try {
      const result = await Swal.fire({
        icon: "warning",
        title: "Xác nhận huỷ vé sự kiện",
        text: "Bạn có chắc muốn hủy vé sự kiện này?",
        showCancelButton: true,
        confirmButtonText: "Huỷ vé",
        cancelButtonText: "Quay lại",
        confirmButtonColor: "#d33",
      });

      if (result.isConfirmed) {
        setCancellingEventTicketId(ticketParticipantId);
        await cancelEventTicketMutation.mutateAsync(ticketParticipantId);
        await Swal.fire({
          icon: "success",
          title: "Huỷ vé thành công",
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Huỷ vé thất bại",
        text:
          e?.response?.data?.message ||
          e?.data?.message ||
          e?.message ||
          "Không thể huỷ vé sự kiện",
      });
    } finally {
      setCancellingEventTicketId(null);
    }
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

  // Add/remove body class to blur global header when popup is open
  useEffect(() => {
    const openCls = "popup-open";
    const mobileCls = "popup-mobile";

    function updateBodyClass() {
      try {
        if (detailPopupId != null) {
          document.body.classList.add(openCls);
          document.body.style.overflow = "hidden";
          if (window.innerWidth <= 768) {
            document.body.classList.add(mobileCls);
          } else {
            document.body.classList.remove(mobileCls);
          }
        } else {
          document.body.classList.remove(openCls);
          document.body.classList.remove(mobileCls);
          document.body.style.overflow = "";
        }
      } catch (e) {
        // ignore
      }
    }

    updateBodyClass();

    function onResize() {
      try {
        if (detailPopupId != null) {
          if (window.innerWidth <= 768) document.body.classList.add(mobileCls);
          else document.body.classList.remove(mobileCls);
        }
      } catch (e) {}
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      try {
        document.body.classList.remove(openCls);
        document.body.classList.remove(mobileCls);
        document.body.style.overflow = "";
      } catch (e) {}
    };
  }, [detailPopupId]);

  // When popup opens on mobile, measure mobile bottom navigation height
  // and expose it as a CSS variable so popup can sit above the nav.
  useEffect(() => {
    if (detailPopupId == null) {
      try {
        document.documentElement.style.removeProperty(
          "--mobile-bottom-nav-height",
        );
      } catch (e) {}
      return;
    }

    function updateNavHeight() {
      try {
        const nav = document.querySelector(".bottom-nav");
        const h = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
        document.documentElement.style.setProperty(
          "--mobile-bottom-nav-height",
          `${h}px`,
        );
      } catch (e) {
        // ignore
      }
    }

    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    return () => {
      window.removeEventListener("resize", updateNavHeight);
      try {
        document.documentElement.style.removeProperty(
          "--mobile-bottom-nav-height",
        );
      } catch (e) {}
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
                  const thumb = ev.thumbnailUrl || FALLBACK_VENUE_IMAGE;
                  return (
                    <motion.div
                      key={row.id}
                      className="bl-list-item bl-list-item--event"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <div className="bl-card-media">
                        <img
                          src={thumb}
                          alt={ev.venueName || "venue"}
                          onError={handleImgError}
                        />
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
                          <Receipt size={14} /> {formatVND(ev.totalAmount)} ·{" "}
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
                        {["joined"].includes(
                          String(ev.participantStatus || "").toLowerCase(),
                        ) &&
                          ev.eventStatus.toLowerCase() === "pending" && (
                            <button
                              type="button"
                              className="bl-btn danger bl-btn-sm"
                              onClick={() =>
                                handleCancelEventTicketFromList(
                                  ev.ticketParticipantId,
                                )
                              }
                              disabled={
                                cancellingEventTicketId ===
                                ev.ticketParticipantId
                              }
                            >
                              <XCircle size={16} className="bl-btn-icon" />
                              {cancellingEventTicketId ===
                              ev.ticketParticipantId
                                ? "Đang huỷ..."
                                : "Hủy vé"}
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
                const thumb = b.thumbnailUrl || FALLBACK_VENUE_IMAGE;
                return (
                  <motion.div
                    key={row.id}
                    className="bl-list-item bl-list-item--daily"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div className="bl-card-media">
                      <img
                        src={thumb}
                        alt={b.venueName || "venue"}
                        onError={handleImgError}
                      />
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
                          <Receipt size={14} /> {formatVND(b.totalPrice)}
                        </div>
                      )}
                    </div>
                    <div className="bl-list-actions">
                      {(b.status || "").toLowerCase() === "holding" && (
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
                      {b.canCancel && (
                        <button
                          type="button"
                          className="bl-btn danger bl-btn-sm"
                          onClick={() => handleCancelFromList(b.bookingId)}
                          disabled={cancelMutation.isLoading}
                        >
                          <XCircle size={16} className="bl-btn-icon" />
                          {cancelMutation.isLoading ? "Đang huỷ..." : "Hủy đơn"}
                        </button>
                      )}
                      {b.canReview && (
                        <button
                          type="button"
                          className="bl-btn primary bl-btn-sm"
                          onClick={() => handleOpenRatingFromList(b.bookingId)}
                        >
                          <CheckCircle2 size={16} className="bl-btn-icon" />{" "}
                          Đánh giá
                        </button>
                      )}
                      {/* Report button — only for completed bookings */}
                      {(b.status || "").toLowerCase() === "completed" &&
                        (bookingReportMap[b.bookingId] ? (
                          <button
                            type="button"
                            className="bl-btn secondary bl-btn-sm"
                            title="Xem trạng thái báo cáo"
                            onClick={() =>
                              handleViewReportDetail(
                                bookingReportMap[b.bookingId],
                              )
                            }
                          >
                            <Flag
                              size={16}
                              className="bl-btn-icon"
                              style={{ color: "#f59e0b" }}
                            />{" "}
                            Báo cáo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="bl-btn outline bl-btn-sm"
                            title="Báo cáo vấn đề với đơn đặt này"
                            onClick={() => handleOpenReport(b.bookingId)}
                          >
                            <Flag size={16} className="bl-btn-icon" /> Báo cáo
                          </button>
                        ))}
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
                      <div className="bl-detail-header">
                        <div>
                          <div className="bl-popup-code">
                            Mã đơn{" "}
                            <strong>
                              #{popupBooking.bookingId ?? popupBooking.id}
                            </strong>
                          </div>
                          <div className="bl-meta" style={{ marginTop: 6 }}>
                            <span className="bl-meta-item">
                              <Calendar size={14} />{" "}
                              {formatDate(
                                popupBooking.date || popupBooking.bookingDate,
                              )}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span
                            className="bl-badge"
                            data-status={(
                              popupBooking.status || ""
                            ).toLowerCase()}
                          >
                            {translateStatus(popupBooking.status)}
                          </span>
                        </div>
                      </div>

                      <div className="bl-venue-card">
                        <div className="bl-card-media bl-venue-thumb">
                          <img
                            src={
                              popupBooking.thumbnailUrl ||
                              popupBooking.thumbnail ||
                              FALLBACK_VENUE_IMAGE
                            }
                            alt={popupBooking.venueName || "venue"}
                            onError={handleImgError}
                          />
                        </div>
                        <div className="bl-venue-card-body">
                          <h3 className="bl-venue-name">
                            {popupBooking.venueName || "—"}
                          </h3>
                          <div className="bl-meta">
                            <span className="bl-meta-item">
                              <Clock size={14} />
                              {Array.isArray(popupBooking.details) &&
                              popupBooking.details.length ? (
                                <span style={{ marginLeft: 6 }}>
                                  {popupBooking.details
                                    .map(
                                      (s) =>
                                        `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
                                    )
                                    .join(" • ")}
                                </span>
                              ) : (
                                <span style={{ marginLeft: 6 }}>—</span>
                              )}
                            </span>
                            <span className="bl-meta-item">
                              <MapPin size={14} />
                              <span
                                className="bl-ellipsis"
                                style={{ marginLeft: 6 }}
                              >
                                {popupBooking.address ||
                                  popupBooking.city ||
                                  popupBooking.province ||
                                  popupBooking.ward ||
                                  "—"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bl-ticket-body">
                        <div className="bl-ticket-row bl-ticket-row--total">
                          <span className="bl-ticket-label">
                            <Receipt size={16} /> Tổng thanh toán
                          </span>
                          <strong className="bl-ticket-value">
                            {formatVND(popupBooking.totalPrice)}
                          </strong>
                        </div>
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">
                            Thông tin khách hàng
                          </span>
                          {/* <div className="bl-ticket-value bl-contact"> */}
                          {/* <div className="bl-contact-card"> */}
                          <div className="bl-contact-line bl-contact-name">
                            <User size={14} className="bl-contact-icon" />
                            <span
                              className="bl-contact-text"
                              title={
                                popupBooking.fullName ??
                                popupBooking.fullname ??
                                popupBooking.customerName ??
                                ""
                              }
                            >
                              {popupBooking.fullName ??
                                popupBooking.fullname ??
                                popupBooking.customerName ??
                                "—"}
                            </span>
                          </div>
                          <div className="bl-contact-line bl-contact-phone">
                            <Phone size={14} className="bl-contact-icon" />
                            <span className="bl-contact-text">
                              {popupBooking.phone ??
                                popupBooking.phoneNumber ??
                                popupBooking.customerPhone ??
                                "—"}
                            </span>
                          </div>
                          {/* </div> */}
                          {/* </div> */}
                        </div>
                        {/* Removed duplicate phone row — phone already shown in customer info above */}
                        <div className="bl-ticket-row">
                          <span className="bl-ticket-label">Ghi chú</span>
                          <strong className="bl-ticket-value">
                            {popupBooking.bookingNote ??
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
                          "holding" && (
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
                        {["booked", "pending"].includes(
                          (popupBooking.status || "").toLowerCase(),
                        ) && (
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

      {/* ── Report Form Modal ── */}
      {reportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              boxShadow: "0 32px 64px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  🚩 Báo cáo đơn đặt #{reportModal.bookingId}
                </h3>
                <p
                  style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}
                >
                  Mô tả vấn đề bạn gặp phải với đơn đặt sân này.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
              >
                Tiêu đề <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Sân không đúng mô tả, Bị hủy không có lý do..."
                value={reportForm.title}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, title: e.target.value }))
                }
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                maxLength={200}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
              >
                Nội dung chi tiết <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                value={reportForm.content}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, content: e.target.value }))
                }
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  minHeight: 110,
                  resize: "vertical",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                maxLength={2000}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  alignSelf: "flex-end",
                }}
              >
                {reportForm.content.length}/2000
              </span>
            </div>

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={() => setReportModal(null)}
                disabled={reportSubmitting}
                style={{
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  borderRadius: 12,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "10px 24px",
                  cursor: reportSubmitting ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: reportSubmitting ? 0.7 : 1,
                }}
              >
                {reportSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Detail Modal ── */}
      {reportDetailModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 500,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 32px 64px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                🚩 Chi tiết báo cáo
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReportDetailModal(null);
                  setReportDetail(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                }}
              >
                <X size={22} />
              </button>
            </div>

            {reportDetailLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "#6b7280",
                }}
              >
                <Loader2 size={28} className="spin" />
                <p>Đang tải...</p>
              </div>
            ) : reportDetail ? (
              <>
                <div
                  style={{
                    background: "#f9fafb",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Tiêu đề
                  </p>
                  <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>
                    {reportDetail.title}
                  </p>
                </div>

                <div
                  style={{
                    background: "#f9fafb",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Nội dung báo cáo
                  </p>
                  <p style={{ margin: 0, lineHeight: 1.6, color: "#374151" }}>
                    {reportDetail.content}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      background:
                        reportDetail.status === 1 ? "#d1fae5" : "#fef3c7",
                      color: reportDetail.status === 1 ? "#065f46" : "#92400e",
                    }}
                  >
                    {reportDetail.status === 1
                      ? "✓ Đã phản hồi"
                      : "⏳ Chờ xử lý"}
                  </div>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    Gửi lúc:{" "}
                    {reportDetail.createdAt
                      ? new Date(reportDetail.createdAt).toLocaleString("vi-VN")
                      : "—"}
                  </span>
                </div>

                {reportDetail.status === 1 && reportDetail.responseContent ? (
                  <div
                    style={{
                      background: "#f0fdf4",
                      borderRadius: 12,
                      padding: "14px 16px",
                      borderLeft: "4px solid #6ee7b7",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#065f46",
                        textTransform: "uppercase",
                      }}
                    >
                      Phản hồi từ Admin
                    </p>
                    <p
                      style={{
                        margin: "0 0 8px",
                        lineHeight: 1.6,
                        color: "#374151",
                      }}
                    >
                      {reportDetail.responseContent}
                    </p>
                    {reportDetail.respondedAt && (
                      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                        Phản hồi lúc:{" "}
                        {new Date(reportDetail.respondedAt).toLocaleString(
                          "vi-VN",
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "#9ca3af",
                      fontSize: 14,
                      fontStyle: "italic",
                    }}
                  >
                    Chưa có phản hồi từ Admin. Vui lòng chờ trong thời gian tới.
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: "#dc2626", textAlign: "center" }}>
                Không thể tải chi tiết báo cáo.
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BookingList;
