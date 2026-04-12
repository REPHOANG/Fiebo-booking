import React from "react";
import { Link } from "react-router-dom";
import {
  financeAdminOwnerPayouts,
  financeAdminOwnerSubscriptions,
  financeAdminRevenueReport,
  financeAdminWithdrawalRequests,
} from "../financeAdminData";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminHome = () => {
  const totalRevenue = financeAdminRevenueReport.reduce(
    (sum, item) => sum + item.grossRevenue,
    0,
  );
  const totalPayout = financeAdminRevenueReport.reduce(
    (sum, item) => sum + item.payouts,
    0,
  );
  const pendingPayoutCount = financeAdminOwnerPayouts.filter(
    (item) => item.status === "Pending",
  ).length;
  const subscriptionTotal = financeAdminOwnerSubscriptions.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const pendingWithdrawals = financeAdminWithdrawalRequests.filter(
    (item) => item.status === "Pending",
  ).length;

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Tong quan tai chinh</h2>
      <p className="finance-admin-subtitle">
        Theo doi payout owner, giao dich subscription, bao cao doanh thu va withdrawal.
      </p>

      <div className="finance-admin-kpi-grid">
        <article className="finance-admin-kpi-card">
          <p className="finance-admin-kpi-label">Tong doanh thu (YTD)</p>
          <p className="finance-admin-kpi-value">{currency.format(totalRevenue)}</p>
        </article>
        <article className="finance-admin-kpi-card">
          <p className="finance-admin-kpi-label">Tong payout</p>
          <p className="finance-admin-kpi-value">{currency.format(totalPayout)}</p>
        </article>
        <article className="finance-admin-kpi-card">
          <p className="finance-admin-kpi-label">Payout owner pending</p>
          <p className="finance-admin-kpi-value">{pendingPayoutCount}</p>
        </article>
        <article className="finance-admin-kpi-card">
          <p className="finance-admin-kpi-label">Subscription doanh thu</p>
          <p className="finance-admin-kpi-value">{currency.format(subscriptionTotal)}</p>
        </article>
        <article className="finance-admin-kpi-card">
          <p className="finance-admin-kpi-label">Withdrawal requests pending</p>
          <p className="finance-admin-kpi-value">{pendingWithdrawals}</p>
        </article>
      </div>

      <div className="finance-admin-quick-actions">
        <Link to="/finance-admin/owner-payouts" className="finance-admin-link-btn">
          View owners' payout
        </Link>
        <Link
          to="/finance-admin/process-owner-payouts"
          className="finance-admin-link-btn"
        >
          Process owners' payout
        </Link>
        <Link to="/finance-admin/revenue-reports" className="finance-admin-link-btn">
          View revenue report
        </Link>
      </div>

      <div className="finance-admin-section">
        <h3>Canh bao can xu ly</h3>
        <ul className="finance-admin-alert-list">
          <li>{pendingPayoutCount} payout owner dang o trang thai pending.</li>
          <li>{pendingWithdrawals} withdrawal request cua customer cho duyet.</li>
          <li>{financeAdminOwnerSubscriptions.length} giao dich subscription cua owner can doi soat.</li>
          <li>Kiem tra revenue report truoc khi chot ky thanh toan.</li>
        </ul>
      </div>
    </section>
  );
};

export default FinanceAdminHome;
