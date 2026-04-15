import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Filter, MapPin, User } from "lucide-react";
import "./OwnerBookingsCompact.css";
import { getOwnerBookingList } from "../../../services/bookingService";
import { getOwnerVenueSelectOptions } from "../../../services/venueService";

const filterSchema = yup.object({
  venueId: yup.string(),
});

const PAGE_SIZE = 10;
const WEEK_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const BOOKING_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Booked", label: "Đã đặt" },
  { value: "Completed", label: "Hoàn thành" },
  { value: "Cancelled", label: "Đã hủy" },
];

const formatDate = (d) => {
  if (d == null || d === "") return "—";
  if (typeof d === "object" && d.year != null) {
    const day = String(d.day ?? 0).padStart(2, "0");
    const month = String(d.month ?? 0).padStart(2, "0");
    return `${day}/${month}/${d.year}`;
  }
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}/${m}/${y}` : String(d);
};

const formatPrice = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n));
};

const translateStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy";
  if (s === "ownercancelled") return "Đã hủy";
  return status || "—";
};

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateKey = (raw) => {
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && raw.year != null) {
    const y = String(raw.year);
    const m = String(raw.month ?? 0).padStart(2, "0");
    const d = String(raw.day ?? 0).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

const pickThumb = (booking) =>
  booking?.thumbnailUrl ||
  booking?.ThumbnailUrl ||
  booking?.venueThumbnailUrl ||
  booking?.VenueThumbnailUrl ||
  booking?.imageUrl ||
  booking?.ImageUrl ||
  "";

const getVenueOptionId = (venue) => venue?.venueId ?? venue?.VenueId ?? venue?.id ?? venue?.Id;

const getVenueOptionName = (venue) => venue?.name ?? venue?.Name ?? "";

const OwnerBookings = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);

  const { register, watch, reset } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: { venueId: "" },
  });

  const selectedVenueId = watch("venueId") ?? "";

  const venueOptions = useMemo(
    () =>
      [...venues].sort((a, b) =>
        String(getVenueOptionName(a)).localeCompare(String(getVenueOptionName(b)), "vi", {
          sensitivity: "base",
        }),
      ),
    [venues],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVenuesLoading(true);
      try {
        const list = await getOwnerVenueSelectOptions();
        if (!cancelled) setVenues(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách cơ sở.");
          setVenues([]);
        }
      } finally {
        if (!cancelled) setVenuesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = { pageNumber: page, pageSize: PAGE_SIZE };
      const venueId = selectedVenueId !== "" ? Number(String(selectedVenueId)) : NaN;
      if (Number.isFinite(venueId) && venueId > 0) baseParams.venueId = venueId;
      else if (selectedVenueId) {
        const matchedVenue = venueOptions.find((venue) => String(getVenueOptionId(venue)) === String(selectedVenueId));
        const venueName = String(getVenueOptionName(matchedVenue)).trim();
        if (venueName) baseParams.venueName = venueName;
      }

      if (selectedDate) {
        baseParams.fromDate = selectedDate;
        baseParams.toDate = selectedDate;
      }

      if (statusFilter) {
        if (statusFilter === "Cancelled") {
          const [customerCancelledRes, ownerCancelledRes] = await Promise.all([
            getOwnerBookingList({ ...baseParams, status: "CustomerCancelled" }),
            getOwnerBookingList({ ...baseParams, status: "OwnerCancelled" }),
          ]);

          const merged = [
            ...(Array.isArray(customerCancelledRes?.items) ? customerCancelledRes.items : []),
            ...(Array.isArray(ownerCancelledRes?.items) ? ownerCancelledRes.items : []),
          ];

          const dedup = [];
          const seen = new Set();
          for (const item of merged) {
            const id = item?.bookingId ?? item?.BookingId;
            const key = id != null ? `id:${id}` : `${item?.bookingDate ?? item?.BookingDate ?? ""}|${item?.customerName ?? item?.CustomerName ?? ""}|${item?.venueName ?? item?.VenueName ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            dedup.push(item);
          }

          setItems(dedup);
          setTotalItems(dedup.length);
          return;
        }
      }

      const result = await getOwnerBookingList({ ...baseParams, status: statusFilter || undefined });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalItems(Number(result?.totalItems) || 0);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách đơn.");
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [page, selectedVenueId, selectedDate, statusFilter, venueOptions]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE) || 1);

  const monthLabel = useMemo(
    () =>
      calendarMonth.toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      }),
    [calendarMonth],
  );

  const dateCountMap = useMemo(() => {
    const map = new Map();
    items.forEach((b) => {
      const key = parseDateKey(b.bookingDate ?? b.BookingDate);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [items]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = toDateKey(date);
      cells.push({
        key,
        day,
        isToday: key === toDateKey(new Date()),
        isSelected: key === selectedDate,
        count: dateCountMap.get(key) || 0,
      });
    }
    return cells;
  }, [calendarMonth, selectedDate, dateCountMap]);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const close = () => setFilterMenuOpen(false);
    const onPointerDown = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterMenuOpen]);

  const statusFilterLabel = useMemo(
    () => BOOKING_STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "",
    [statusFilter],
  );

  return (
    <div className="owner-home owner-bookings-page">
      <div className="owner-home-content">
        <div className="ob-shell">
          <div className="ob-toolbar">
            <button
              type="button"
              className="ob-tool-btn"
              onClick={() => setShowCalendar((v) => !v)}
            >
              <CalendarDays size={16} />
              {showCalendar ? "Ẩn lịch" : "Mở lịch"}
            </button>

            <select
              className="ob-tool-select"
              disabled={venuesLoading}
              {...register("venueId", { onChange: () => setPage(1) })}
            >
              <option value="">{venuesLoading ? "Đang tải cơ sở..." : "Tất cả cơ sở"}</option>
              {venueOptions.map((v) => {
                const id = getVenueOptionId(v);
                const name = getVenueOptionName(v) || `Cơ sở #${id}`;
                return (
                  <option key={id} value={String(id)}>
                    {name}
                  </option>
                );
              })}
            </select>

            <div className="ob-filter-dropdown-wrap" ref={filterMenuRef}>
              <button
                type="button"
                className={`ob-filter-btn${filterMenuOpen ? " is-open" : ""}${statusFilter ? " has-value" : ""}`}
                aria-expanded={filterMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setFilterMenuOpen((o) => !o)}
              >
                <Filter size={15} aria-hidden />
                <span className="ob-filter-btn-text">
                  <span className="ob-filter-btn-title">Lọc đơn</span>
                  {statusFilter ? (
                    <span className="ob-filter-btn-sub">{statusFilterLabel}</span>
                  ) : null}
                </span>
                <ChevronDown size={16} className="ob-filter-chevron" aria-hidden />
              </button>
              {filterMenuOpen ? (
                <ul className="ob-filter-menu" role="listbox" aria-label="Lọc theo trạng thái đơn">
                  {BOOKING_STATUS_FILTER_OPTIONS.map((opt) => (
                    <li key={opt.value || "all"} role="none">
                      <button
                        type="button"
                        role="option"
                        className={`ob-filter-menu-item${statusFilter === opt.value ? " is-active" : ""}`}
                        aria-selected={statusFilter === opt.value}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setFilterMenuOpen(false);
                          setPage(1);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {showCalendar ? (
            <div className="ob-calendar">
              <div className="ob-calendar-head">
                <button
                  type="button"
                  className="ob-calendar-nav-btn"
                  onClick={() =>
                    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>{monthLabel}</strong>
                <button
                  type="button"
                  className="ob-calendar-nav-btn"
                  onClick={() =>
                    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="ob-calendar-weekdays">
                {WEEK_DAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="ob-calendar-grid">
                {calendarCells.map((cell, idx) =>
                  cell ? (
                    <button
                      key={cell.key}
                      type="button"
                      className={`ob-day-cell${cell.isToday ? " is-today" : ""}${cell.isSelected ? " is-selected" : ""}`}
                      onClick={() => {
                        setSelectedDate(cell.isSelected ? "" : cell.key);
                        setPage(1);
                      }}
                    >
                      <span>{cell.day}</span>
                      {cell.count > 0 ? <small>{cell.count}</small> : null}
                    </button>
                  ) : (
                    <span key={`empty-${idx}`} className="ob-day-cell is-empty" aria-hidden />
                  ),
                )}
              </div>
            </div>
          ) : null}

          {selectedDate ? (
            <div className="ob-active-filter">
              Đang lọc ngày <strong>{formatDate(selectedDate)}</strong>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate("");
                  setPage(1);
                }}
              >
                Bỏ lọc ngày
              </button>
            </div>
          ) : null}

          {statusFilter ? (
            <div className="ob-active-filter">
              Trạng thái: <strong>{statusFilterLabel}</strong>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPage(1);
                }}
              >
                Bỏ lọc trạng thái
              </button>
            </div>
          ) : null}

          <div className="ob-meta-line">
            {loading ? "Đang tải..." : `${totalItems} đơn · Trang ${page}/${totalPages}`}
          </div>

          {loading ? (
            <div className="ob-empty">Đang tải danh sách đơn...</div>
          ) : items.length === 0 ? (
            <div className="ob-empty">Không có đơn phù hợp.</div>
          ) : (
            <div className="ob-list">
              {items.map((b) => {
                const bid = b.bookingId ?? b.BookingId;
                const status = b.status ?? b.Status;
                const venueName = b.venueName ?? b.VenueName ?? "—";
                const customerName = b.customerName ?? b.CustomerName ?? "—";
                const bookingDate = b.bookingDate ?? b.BookingDate;
                const total = b.totalPrice ?? b.TotalPrice;
                const ward = b.ward ?? b.Ward;
                const province = b.province ?? b.Province;
                const location = [ward, province].filter(Boolean).join(", ") || "—";
                const thumb = pickThumb(b);

                return (
                  <div key={bid} className="ob-item">
                    <div className="ob-item-left">
                      {thumb ? (
                        <img src={thumb} alt="" className="ob-thumb" />
                      ) : (
                        <div className="ob-thumb ob-thumb-placeholder" />
                      )}
                      <div className="ob-item-main">
                        <div className="ob-item-title-row">
                          <h3>{venueName}</h3>
                          <span className="ob-status" data-status={String(status || "").toLowerCase()}>
                            {translateStatus(status)}
                          </span>
                        </div>
                        <div className="ob-item-sub">
                          <span>#{bid}</span>
                          <span>
                            <User size={13} /> {customerName}
                          </span>
                          <span>
                            <MapPin size={13} /> {location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ob-item-time">
                      <span>THỜI GIAN</span>
                      <strong>{formatDate(bookingDate)}</strong>
                    </div>

                    <div className="ob-item-price">
                      <span>THANH TOÁN</span>
                      <strong>{formatPrice(total)}</strong>
                    </div>

                    <button
                      type="button"
                      className="ob-detail-btn"
                      onClick={() => navigate(`/owner/bookings/${bid}`)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && totalPages > 1 ? (
            <div className="ob-footer-actions">
              {page > 1 ? (
                <button type="button" className="ob-more-btn muted" onClick={() => setPage((p) => p - 1)}>
                  Trang trước
                </button>
              ) : null}
              {page < totalPages ? (
                <button type="button" className="ob-more-btn" onClick={() => setPage((p) => p + 1)}>
                  Xem thêm đơn đặt sân
                </button>
              ) : (
                <span className="ob-end-text">Bạn đã xem hết danh sách.</span>
              )}
            </div>
          ) : null}

          <div className="ob-reset-line">
            <button
              type="button"
              onClick={() => {
                reset({ venueId: "" });
                setSelectedDate("");
                setStatusFilter("");
                setFilterMenuOpen(false);
                setPage(1);
              }}
            >
              Xóa toàn bộ bộ lọc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerBookings;

