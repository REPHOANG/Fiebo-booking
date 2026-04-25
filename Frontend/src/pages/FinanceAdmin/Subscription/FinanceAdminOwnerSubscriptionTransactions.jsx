import React from "react";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminOwnerSubscriptionTransactions = () => {
  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">View owner subscription transaction</h2>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Owner</th>
              <th>Package</th>
              <th>Amount</th>
              <th>Payment date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {financeAdminOwnerSubscriptions.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.owner}</td>
                <td>{item.packageName}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.paymentDate}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminOwnerSubscriptionTransactions;
