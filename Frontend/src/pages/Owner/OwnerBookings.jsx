import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./OwnerBookings.css";
import { getOwnerBookingList } from "../../services/bookingService";
import { getOwnerVenues } from "../../services/venueService";

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
  if (s === "pending") return "Chờ thanh toán";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy (khách)";
  if (s === "ownercancelled") return "Đã hủy (chủ sân)";
  if (s === "expired") return "Hết hạn";
  return status || "—";
};

const PAGE_SIZE = 10;

const OwnerBookings = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const venueOptions = useMemo(
    () =>
      [...venues].sort((a, b) =>
        String(a?.name ?? a?.Name ?? "").localeCompare(String(b?.name ?? b?.Name ?? ""), "vi", {
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
        const list = await getOwnerVenues();
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
      const params = { pageNumber: page, pageSize: PAGE_SIZE };
      const vid = selectedVenueId !== "" ? Number(selectedVenueId) : NaN;
      if (Number.isFinite(vid) && vid > 0) params.venueId = vid;
      const result = await getOwnerBookingList(params);
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalItems(Number(result?.totalItems) || 0);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách đơn.");
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [selectedVenueId, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE) || 1);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (page !== 1) setPage(1);
    else loadList();
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
              Lọc theo cơ sở (tuỳ chọn)
              <select
                className="ob-filter-select"
                value={selectedVenueId}
                disabled={venuesLoading}
                onChange={(e) => {
                  setSelectedVenueId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">
                  {venuesLoading ? "Đang tải cơ sở…" : "Tất cả cơ sở"}
                </option>
                {venueOptions.map((v) => {
                  const id = v?.venueId ?? v?.VenueId;
                  const name = v?.name ?? v?.Name ?? `Cơ sở #${id}`;
                  return (
                    <option key={id} value={String(id)}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>
            <button type="submit" className="ob-btn primary ob-btn-sm">
              Lọc
            </button>
            <button
              type="button"
              className="ob-btn outline ob-btn-sm"
              onClick={() => {
                setSelectedVenueId("");
                setPage(1);
              }}
            >
              Xóa lọc
            </button>
          </form>

          {!loading && totalItems > 0 ? (
            <p className="ob-meta-count">
              {totalItems} đơn
              {totalPages > 1 ? ` · Trang ${page}/${totalPages}` : ""}
            </p>
          ) : null}

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

          {!loading && items.length > 0 && totalPages > 1 ? (
            <div className="ob-pagination">
              <button
                type="button"
                className="ob-btn outline ob-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trước
              </button>
              <span className="ob-pagination-info">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="ob-btn outline ob-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau →
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OwnerBookings;
