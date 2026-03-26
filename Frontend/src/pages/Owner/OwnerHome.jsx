import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, Building2, ReceiptText, MapPin } from "lucide-react";
import { toast } from "react-toastify";
import "./OwnerHome.css";
import { getOwnerVenues } from "../../services/venueService";
import { getOwnerBookingList } from "../../services/bookingService";

const OwnerHome = () => {
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [v, b] = await Promise.all([
          getOwnerVenues(),
          getOwnerBookingList(),
        ]);
        if (!mounted) return;
        setVenues(Array.isArray(v) ? v : []);
        setBookings(Array.isArray(b) ? b : []);
      } catch (e) {
        if (!mounted) return;
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được dữ liệu dashboard.");
        setVenues([]);
        setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const v = venues || [];
    const b = bookings || [];
    const active = v.filter((x) => String(x?.status ?? x?.Status ?? "").toLowerCase() === "active").length;
    const inactive = v.filter((x) => String(x?.status ?? x?.Status ?? "").toLowerCase() === "inactive").length;
    const totalFields = v.reduce((sum, x) => sum + Number(x?.totalFields ?? x?.TotalFields ?? 0), 0);
    return {
      venuesTotal: v.length,
      venuesActive: active,
      venuesInactive: inactive,
      fieldsTotal: totalFields,
      bookingsTotal: b.length,
    };
  }, [venues, bookings]);

  const topVenues = useMemo(() => (venues || []).slice(0, 5), [venues]);
  const recentBookings = useMemo(() => (bookings || []).slice(0, 8), [bookings]);

  return (
    <div className="owner-home">
      <div className="owner-home-header">
        <div>
          <h1>Trang chủ Owner</h1>
          <p className="oh-subtitle">Tổng quan nhanh và thao tác thường dùng.</p>
        </div>
        <div className="oh-header-actions">
          <Link to="/owner/offline-booking" className="oh-secondary-btn">
            <Calendar size={16} />
            Đặt sân offline
          </Link>
          <Link to="/owner/create-venue" className="oh-create-btn">
            <Plus size={16} />
            <span> Tạo cơ sở mới</span>
          </Link>
        </div>
      </div>

      <div className="owner-home-content">
        {loading ? (
          <div className="oh-loading">Đang tải dashboard...</div>
        ) : (
          <>
            <div className="oh-kpis">
              <div className="oh-kpi">
                <div className="oh-kpi-icon"><Building2 size={18} /></div>
                <div>
                  <div className="oh-kpi-label">Cơ sở</div>
                  <div className="oh-kpi-value">{stats.venuesTotal}</div>
                  <div className="oh-kpi-sub">
                    {stats.venuesActive} hoạt động · {stats.venuesInactive} vô hiệu hóa
                  </div>
                </div>
              </div>
              <div className="oh-kpi">
                <div className="oh-kpi-icon"><MapPin size={18} /></div>
                <div>
                  <div className="oh-kpi-label">Số sân</div>
                  <div className="oh-kpi-value">{stats.fieldsTotal}</div>
                  <div className="oh-kpi-sub">Tổng số sân trong các cơ sở</div>
                </div>
              </div>
              <div className="oh-kpi">
                <div className="oh-kpi-icon"><ReceiptText size={18} /></div>
                <div>
                  <div className="oh-kpi-label">Đơn đặt sân</div>
                  <div className="oh-kpi-value">{stats.bookingsTotal}</div>
                  <div className="oh-kpi-sub">Tổng đơn (theo API owner)</div>
                </div>
              </div>
              <div className="oh-kpi oh-kpi--cta">
                <div>
                  <div className="oh-kpi-label">Thao tác nhanh</div>
                  <div className="oh-kpi-sub">Tạo booking walk-in cho khách.</div>
                </div>
                <Link to="/owner/offline-booking" className="oh-kpi-btn">
                  <Calendar size={16} /> Đặt offline
                </Link>
              </div>
            </div>

            <div className="oh-grid">
              <div className="oh-panel">
                <div className="oh-panel-head">
                  <h2>Cơ sở của bạn</h2>
                  <Link to="/owner/venues" className="oh-panel-link">Xem tất cả</Link>
                </div>
                {topVenues.length === 0 ? (
                  <div className="oh-empty">
                    Chưa có cơ sở nào. Hãy tạo cơ sở mới để bắt đầu.
                    <div style={{ marginTop: 10 }}>
                      <Link to="/owner/create-venue" className="oh-create-btn">
                        <Plus size={16} /> Tạo cơ sở
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="oh-venue-list">
                    {topVenues.map((v) => {
                      const id = v?.venueId ?? v?.VenueId ?? v?.id;
                      const name = v?.name ?? v?.Name ?? `Cơ sở #${id}`;
                      const status = v?.status ?? v?.Status;
                      const statusLower = String(status || "").toLowerCase();
                      const totalFields = v?.totalFields ?? v?.TotalFields ?? 0;
                      return (
                        <div key={id ?? name} className="oh-venue-row">
                          <div className="oh-venue-main">
                            <div className="oh-venue-name">{name}</div>
                            <div className="oh-venue-sub">
                              <span className="oh-chip" data-status={statusLower}>{status ?? "—"}</span>
                              <span className="oh-dot">•</span>
                              <span>{totalFields} sân</span>
                            </div>
                          </div>
                          {id ? (
                            <Link className="oh-mini-btn" to={`/owner/venues/${id}`}>
                              Chi tiết
                            </Link>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="oh-panel">
                <div className="oh-panel-head">
                  <h2>Đơn gần đây</h2>
                  <Link to="/owner/bookings" className="oh-panel-link">Xem tất cả</Link>
                </div>
                {recentBookings.length === 0 ? (
                  <div className="oh-empty">Chưa có đơn nào.</div>
                ) : (
                  <div className="oh-booking-list">
                    {recentBookings.map((b) => {
                      const bid = b?.bookingId ?? b?.BookingId;
                      const venueName = b?.venueName ?? b?.VenueName ?? "—";
                      const status = b?.status ?? b?.Status ?? "—";
                      const statusLower = String(status || "").toLowerCase();
                      const date = String(b?.bookingDate ?? b?.BookingDate ?? "").slice(0, 10);
                      const total = b?.totalPrice ?? b?.TotalPrice;
                      const totalLabel =
                        total != null && !Number.isNaN(Number(total))
                          ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(total))
                          : "—";
                      return (
                        <div key={bid ?? `${venueName}-${date}`} className="oh-booking-row">
                          <div className="oh-booking-main">
                            <div className="oh-booking-top">
                              <span className="oh-booking-venue">{venueName}</span>
                              <span className="oh-chip" data-status={statusLower}>{status}</span>
                            </div>
                            <div className="oh-booking-sub">
                              <span>{date || "—"}</span>
                              <span className="oh-dot">•</span>
                              <span>{totalLabel}</span>
                            </div>
                          </div>
                          {bid ? (
                            <Link className="oh-mini-btn" to={`/owner/bookings/${bid}`}>
                              Xem
                            </Link>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OwnerHome;
