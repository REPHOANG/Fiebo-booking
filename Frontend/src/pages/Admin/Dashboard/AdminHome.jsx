import React from "react";
import { adminMonthlyAnalytics, adminVenueRegistrations } from "../adminData";
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
          <p className="admin-card-value">{adminVenueRegistrations.length}</p>
        </article>
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

