import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, Building2, ReceiptText, MapPin, Activity } from "lucide-react";
import { toast } from "react-toastify";
import "./OwnerHome.css";
import { getOwnerVenues } from "../../services/venueService";
import { getOwnerBookingList } from "../../services/bookingService";

const normalizeStatus = (raw) => {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "1") return "active";
  if (s === "0") return "inactive";
  if (s === "2") return "pending";
  if (s === "3") return "rejected";
  if (s === "4") return "draft";
  return s;
};

const formatPrice = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n));
};

const formatDate = (d) => {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}/${m}/${y}` : s;
};

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
    const active = v.filter((x) => normalizeStatus(x?.status ?? x?.Status) === "active").length;
    const inactive = v.filter((x) => normalizeStatus(x?.status ?? x?.Status) === "inactive").length;
    const pending = v.filter((x) => normalizeStatus(x?.status ?? x?.Status) === "pending").length;
    const draft = v.filter((x) => normalizeStatus(x?.status ?? x?.Status) === "draft").length;
    const totalFields = v.reduce((sum, x) => sum + Number(x?.totalFields ?? x?.TotalFields ?? 0), 0);
    const totalRevenue = b.reduce((sum, x) => sum + Number(x?.totalPrice ?? x?.TotalPrice ?? 0), 0);
    return {
      venuesTotal: v.length,
      venuesActive: active,
      venuesInactive: inactive,
      venuesPending: pending,
      venuesDraft: draft,
      fieldsTotal: totalFields,
      bookingsTotal: b.length,
      totalRevenue,
    };
  }, [venues, bookings]);

  const recentBookings = useMemo(() => (bookings || []).slice(0, 7), [bookings]);

  const historyData = useMemo(() => {
    const labels = [];
    const counts = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
      counts.push(
        bookings.filter((b) => String(b?.bookingDate ?? b?.BookingDate ?? "").slice(0, 10) === key).length
      );
    }
    return labels.map((label, idx) => ({ label, value: counts[idx] }));
  }, [bookings]);

  const historyPath = useMemo(() => {
    if (!historyData.length) return "";
    const max = Math.max(...historyData.map((x) => x.value), 1);
    const width = 430;
    const height = 170;
    const stepX = width / Math.max(historyData.length - 1, 1);
    return historyData
      .map((p, i) => {
        const x = i * stepX;
        const y = height - (p.value / max) * (height - 20) - 10;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [historyData]);

  const venueBreakdown = useMemo(() => {
    const total = Math.max(stats.venuesTotal, 1);
    const active = stats.venuesActive;
    const pending = stats.venuesPending + stats.venuesDraft;
    const inactive = stats.venuesInactive;
    const rejected = Math.max(stats.venuesTotal - active - pending - inactive, 0);
    return {
      active,
      pending,
      inactive,
      rejected,
      activeRate: Math.round((active / total) * 100),
    };
  }, [stats]);

  const donutStyle = useMemo(() => {
    const total = Math.max(stats.venuesTotal, 1);
    const a = (venueBreakdown.active / total) * 360;
    const p = (venueBreakdown.pending / total) * 360;
    const i = (venueBreakdown.inactive / total) * 360;
    return {
      background: `conic-gradient(
        #16a34a 0deg ${a}deg,
        #0ea5e9 ${a}deg ${a + p}deg,
        #f59e0b ${a + p}deg ${a + p + i}deg,
        #ef4444 ${a + p + i}deg 360deg
      )`,
    };
  }, [stats.venuesTotal, venueBreakdown]);

  return (
    <div className="owner-home">
      <div className="owner-home-header">
        <div>
          <h1>Tổng quan owner</h1>
          <p className="oh-subtitle">Theo dõi cơ sở, đơn đặt sân và hiệu suất vận hành.</p>
        </div>
        <div className="oh-header-actions">
          <Link to="/owner/offline-booking" className="oh-secondary-btn">
            <Calendar size={16} />
            Đặt sân offline
          </Link>
          <Link to="/owner/create-venue" className="oh-create-btn">
            <Plus size={16} />
            Tạo cơ sở mới
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="owner-loading">
          <span className="owner-spinner" />
        </div>
      ) : (
        <>
          <div className="oh-top-grid">
            <div className="oh-card">
              <div className="oh-card-title">Cơ sở</div>
              <div className="oh-card-value">{stats.venuesTotal}</div>
              <div className="oh-card-sub">{stats.venuesActive} đang hoạt động</div>
              <div className="oh-meter">
                <span style={{ width: `${Math.min(100, (stats.venuesActive / Math.max(stats.venuesTotal, 1)) * 100)}%` }} />
              </div>
            </div>
            <div className="oh-card">
              <div className="oh-card-title">Số sân</div>
              <div className="oh-card-value">{stats.fieldsTotal}</div>
              <div className="oh-card-sub">Tổng sân đang quản lý</div>
              <MapPin size={16} className="oh-card-icon" />
            </div>
            <div className="oh-card">
              <div className="oh-card-title">Đơn đặt sân</div>
              <div className="oh-card-value">{stats.bookingsTotal}</div>
              <div className="oh-card-sub">Toàn bộ booking đã tạo</div>
              <ReceiptText size={16} className="oh-card-icon" />
            </div>
            <div className="oh-card">
              <div className="oh-card-title">Doanh thu</div>
              <div className="oh-card-value oh-money">{formatPrice(stats.totalRevenue)}</div>
              <div className="oh-card-sub">Tổng từ danh sách booking</div>
              <Building2 size={16} className="oh-card-icon" />
            </div>
          </div>

          <div className="oh-main-grid">
            <div className="oh-panel oh-panel--history">
              <div className="oh-panel-head">
                <h2>Lịch sử 7 ngày</h2>
                <span className="oh-panel-note">Số booking theo ngày</span>
              </div>
              <div className="oh-chart-wrap">
                <svg className="oh-chart" viewBox="0 0 430 170" preserveAspectRatio="none" aria-hidden>
                  <path d={historyPath} />
                </svg>
                <div className="oh-chart-labels">
                  {historyData.map((x) => (
                    <span key={x.label}>{x.label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="oh-panel oh-panel--donut">
              <div className="oh-panel-head">
                <h2>Tình trạng cơ sở</h2>
                <Activity size={16} />
              </div>
              <div className="oh-donut-wrap">
                <div className="oh-donut" style={donutStyle}>
                  <div className="oh-donut-center">
                    <strong>{venueBreakdown.activeRate}%</strong>
                    <span>Active</span>
                  </div>
                </div>
                <div className="oh-legend">
                  <div><i className="dot dot-green" /> Active: {venueBreakdown.active}</div>
                  <div><i className="dot dot-blue" /> Pending + Draft: {venueBreakdown.pending}</div>
                  <div><i className="dot dot-yellow" /> Inactive: {venueBreakdown.inactive}</div>
                  <div><i className="dot dot-red" /> Rejected: {venueBreakdown.rejected}</div>
                </div>
              </div>
            </div>

            <div className="oh-panel oh-panel--table">
              <div className="oh-panel-head">
                <h2>Đơn gần đây</h2>
                <Link to="/owner/bookings" className="oh-panel-link">Xem tất cả</Link>
              </div>
              {recentBookings.length === 0 ? (
                <div className="oh-empty">Chưa có đơn nào.</div>
              ) : (
                <div className="oh-table-wrap">
                  <table className="oh-table">
                    <thead>
                      <tr>
                        <th>Cơ sở</th>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((b) => {
                        const bid = b?.bookingId ?? b?.BookingId;
                        const venueName = b?.venueName ?? b?.VenueName ?? "—";
                        const status = String(b?.status ?? b?.Status ?? "—");
                        const statusLower = status.toLowerCase();
                        const date = b?.bookingDate ?? b?.BookingDate;
                        const total = b?.totalPrice ?? b?.TotalPrice;
                        return (
                          <tr key={bid ?? `${venueName}-${date}`}>
                            <td>{venueName}</td>
                            <td>{formatDate(date)}</td>
                            <td>{formatPrice(total)}</td>
                            <td>
                              <span className="oh-chip" data-status={statusLower}>{status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerHome;
