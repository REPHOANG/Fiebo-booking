import React from "react";
import { financeAdminWithdrawalRequests } from "../financeAdminData";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminWithdrawalRequests = () => {
  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">View customer's withdrawal request</h2>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Customer</th>
              <th>Wallet</th>
              <th>Amount</th>
              <th>Requested at</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {financeAdminWithdrawalRequests.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.customer}</td>
                <td>{item.walletId}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.requestedAt}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminWithdrawalRequests;
