import React, { useMemo, useState } from "react";
import { financeAdminPayouts } from "../financeAdminData";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminPayoutReconciliation = () => {
  const [payouts, setPayouts] = useState(financeAdminPayouts);

  const pendingTotal = useMemo(
    () =>
      payouts
        .filter((item) => item.status === "Pending")
        .reduce((sum, item) => sum + item.amount, 0),
    [payouts],
  );

  const markReconciled = (id) => {
    setPayouts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Reconciled" } : item,
      ),
    );
  };

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Doi soat payout</h2>
      <p className="finance-admin-subtitle">
        Tong tien cho payout pending: <strong>{currency.format(pendingTotal)}</strong>
      </p>

      <div className="finance-admin-card-list">
        {payouts.map((item) => (
          <article key={item.id} className="finance-admin-item-card">
            <div>
              <p className="finance-admin-item-title">
                {item.id} - {item.venue}
              </p>
              <p className="finance-admin-item-meta">
                Owner: {item.owner} | Chu ky: {item.cycle}
              </p>
              <p className="finance-admin-item-amount">{currency.format(item.amount)}</p>
            </div>
            <div className="finance-admin-item-actions">
              <span
                className={`finance-admin-status finance-admin-status-${item.status.toLowerCase()}`}
              >
                {item.status}
              </span>
              <button
                type="button"
                className="finance-admin-link-btn"
                disabled={item.status === "Reconciled"}
                onClick={() => markReconciled(item.id)}
              >
                Xac nhan doi soat
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FinanceAdminPayoutReconciliation;
