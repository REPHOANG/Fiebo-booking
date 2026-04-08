import React from "react";
import { ArrowUpRight, Download, Filter, WalletCards } from "lucide-react";
import "./StaffHome.css";

const StaffHome = () => {
  const recentTransactions = [
    { name: "Marcus Thorne", note: "Court Rental #2841 • Today, 2:15 PM", method: "Transfer", amount: "$120.00", badge: "Paid", tone: "paid" },
    { name: "Elena Rodriguez", note: "Personal Training Pack • Yesterday", method: "Cash", amount: "$450.00", badge: "Partially Paid", tone: "partial" },
    { name: "Jordan Smith", note: "Membership Renewal • Oct 12, 2023", method: "Wallet", amount: "$85.00", badge: "Unpaid", tone: "unpaid" },
  ];

  return (
    <section className="staff-home">
      <div className="staff-home-grid">
        <article className="staff-hero-card">
          <p>Total Outstanding</p>
          <h2>$12,450.00</h2>
          <div className="staff-hero-actions">
            <button type="button">Process Payment</button>
            <button type="button" className="ghost">Send Reminders</button>
          </div>
        </article>

        <article className="staff-stat-card">
          <span><ArrowUpRight size={14} /></span>
          <h3>Revenue (30d)</h3>
          <strong>$48,290</strong>
          <small>+12% vs last month</small>
        </article>

        <article className="staff-stat-card">
          <span>⏱</span>
          <h3>Pending Approval</h3>
          <strong>14 Invoices</strong>
          <small>Review pending</small>
        </article>
      </div>

      <div className="staff-content-grid">
        <article className="staff-panel">
          <div className="staff-panel-head">
            <h3>Recent Transactions</h3>
            <div className="staff-panel-actions">
              <button type="button"><Filter size={14} /></button>
              <button type="button" className="export"><Download size={14} /> Export CSV</button>
            </div>
          </div>

          <div className="staff-rows">
            {recentTransactions.map((item) => (
              <div key={item.name} className="staff-row">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.note}</p>
                </div>
                <span>{item.method}</span>
                <strong>{item.amount}</strong>
                <span className={`staff-chip ${item.tone}`}>{item.badge}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="staff-side">
          <article className="staff-widget">
            <h4>Generate Invoice</h4>
            <label>
              Client name
              <input type="text" placeholder="Select client..." />
            </label>
            <div className="staff-widget-row">
              <label>
                Due date
                <input type="text" placeholder="mm/dd/yy" />
              </label>
              <label>
                Amount ($)
                <input type="number" placeholder="0.00" />
              </label>
            </div>
            <button type="button">Create Invoice</button>
          </article>

          <article className="staff-widget">
            <h4>Payment Mix</h4>
            <div className="staff-mix-item">
              <span>Transfer</span><span>65%</span>
            </div>
            <progress max="100" value="65" />
            <div className="staff-mix-item">
              <span>Wallet</span><span>25%</span>
            </div>
            <progress max="100" value="25" />
            <div className="staff-mix-item">
              <span>Cash</span><span>10%</span>
            </div>
            <progress max="100" value="10" />
          </article>
        </aside>
      </div>

      <div className="staff-footer-hint">
        <WalletCards size={15} />
        <span>Demo dashboard UI for staff role.</span>
      </div>
    </section>
  );
};

export default StaffHome;

