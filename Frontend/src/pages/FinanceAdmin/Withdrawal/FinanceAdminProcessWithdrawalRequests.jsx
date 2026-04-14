import React, { useState } from "react";
import { financeAdminWithdrawalRequests } from "../financeAdminData";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminProcessWithdrawalRequests = () => {
  const [requests, setRequests] = useState(financeAdminWithdrawalRequests);

  const processRequest = (id, status) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    );
  };

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Process customer's withdrawal request</h2>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.customer}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.status}</td>
                <td>
                  <div className="finance-admin-item-actions">
                    <button
                      type="button"
                      className="finance-admin-link-btn"
                      onClick={() => processRequest(item.id, "Approved")}
                      disabled={item.status !== "Pending"}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="finance-admin-link-btn"
                      onClick={() => processRequest(item.id, "Rejected")}
                      disabled={item.status !== "Pending"}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminProcessWithdrawalRequests;
