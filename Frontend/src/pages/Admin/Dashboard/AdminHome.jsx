import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminMonthlyAnalytics } from "../adminData";
import { ADMIN_PENDING_VENUES_QUERY_KEY, getPendingVenues } from "../../../services/adminService";
import { formatDate } from "../../../utils/helperFunction";
import "../adminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const AdminHome = () => {
  const latestMonth = adminMonthlyAnalytics[adminMonthlyAnalytics.length - 1];
  const totalBookings = adminMonthlyAnalytics.reduce((sum, item) => sum + item.bookings, 0);
  const totalRevenue = adminMonthlyAnalytics.reduce((sum, item) => sum + item.revenue, 0);
  const { data: pendingVenueData } = useQuery({
    queryKey: [...ADMIN_PENDING_VENUES_QUERY_KEY, 1, 5],
    queryFn: () => getPendingVenues({ page: 1, pageSize: 5 }),
  });

  const pendingVenues = pendingVenueData?.items ?? [];
  const pendingVenueCount = Number(pendingVenueData?.totalItems ?? 0);

  return (
    <section className="admin-page">
      <h2 className="admin-title">Analytics dashboard</h2>
      <p className="admin-subtitle">Theo doi booking, doanh thu, user active va dang ky san cho duyet.</p>

      <div className="admin-grid">
        <article className="admin-card">
          <p className="admin-card-label">Booking tong (YTD)</p>
          <p className="admin-card-value">{totalBookings}</p>
        </article>
        <article className="admin-card">
          <p className="admin-card-label">Doanh thu tong (YTD)</p>
          <p className="admin-card-value">{currency.format(totalRevenue)}</p>
        </article>
        <article className="admin-card">
          <p className="admin-card-label">Active users (thang gan nhat)</p>
          <p className="admin-card-value">{latestMonth?.activeUsers || 0}</p>
        </article>
        <article className="admin-card">
          <p className="admin-card-label">Venue registrations pending</p>
          <p className="admin-card-value">{pendingVenueCount}</p>
        </article>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Hồ sơ chờ duyệt mới nhất</th>
              <th>Chủ sân</th>
              <th>Ngày gửi</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pendingVenues.map((venue) => (
              <tr key={venue.venueId}>
                <td>{venue.venueName}</td>
                <td>{venue.ownerName}</td>
                <td>{formatDate(venue.submittedDate)}</td>
                <td>{venue.status}</td>
                <td>
                  <Link className="admin-btn admin-btn-primary" to={`/admin/venue-registrations/${venue.venueId}`}>
                    Xem hồ sơ
                  </Link>
                </td>
              </tr>
            ))}
            {!pendingVenues.length && (
              <tr>
                <td colSpan="5">Không có hồ sơ đăng ký sân đang chờ duyệt.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-controls">
        <Link className="admin-btn admin-btn-primary" to="/admin/venue-registrations">
          Mở danh sách duyệt sân
        </Link>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Thang</th>
              <th>Bookings</th>
              <th>Revenue</th>
              <th>Active users</th>
            </tr>
          </thead>
          <tbody>
            {adminMonthlyAnalytics.map((item) => (
              <tr key={item.month}>
                <td>{item.month}</td>
                <td>{item.bookings}</td>
                <td>{currency.format(item.revenue)}</td>
                <td>{item.activeUsers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminHome;

