import React, { useState } from "react";
import { financeAdminOwnerPayouts } from "../financeAdminData";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminProcessOwnerPayouts = () => {
  const [payouts, setPayouts] = useState(financeAdminOwnerPayouts);

  const processPayout = (id) => {
    setPayouts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Paid" } : item,
      ),
    );
  };

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Process owners' payout</h2>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Owner</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.owner}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.status}</td>
                <td>
                  <button
                    type="button"
                    className="finance-admin-link-btn"
                    disabled={item.status === "Paid"}
                    onClick={() => processPayout(item.id)}
                  >
                    Mark as paid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminProcessOwnerPayouts;
