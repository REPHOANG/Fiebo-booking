import React from "react";
import { financeAdminOwnerPayouts } from "../financeAdminData";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminOwnerPayouts = () => {
  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">View owners' payout</h2>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Owner</th>
              <th>Venue</th>
              <th>Cycle</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {financeAdminOwnerPayouts.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.owner}</td>
                <td>{item.venue}</td>
                <td>{item.cycle}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminOwnerPayouts;
