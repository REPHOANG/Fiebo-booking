import React, { useState } from "react";
import { adminFinanceAdmins } from "../adminData";
import "../adminPages.css";

const initialForm = { name: "", email: "" };

const AdminFinanceAdmins = () => {
  const [financeAdmins, setFinanceAdmins] = useState(adminFinanceAdmins);
  const [form, setForm] = useState(initialForm);

  const createFinanceAdmin = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email) return;

    const newItem = {
      id: `FA-${String(financeAdmins.length + 1).padStart(3, "0")}`,
      name,
      email,
      status: "Active",
    };
    setFinanceAdmins((prev) => [newItem, ...prev]);
    setForm(initialForm);
  };

  return (
    <section className="admin-page">
      <h2 className="admin-title">View finance admin list</h2>
      <p className="admin-subtitle">Create finance admin account ngay tren man hinh nay.</p>

      <div className="admin-controls">
        <input
          className="admin-input"
          placeholder="Ho ten finance admin"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input
          className="admin-input"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
        />
        <button type="button" className="admin-btn admin-btn-primary" onClick={createFinanceAdmin}>
          Create finance admin account
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ho ten</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {financeAdmins.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>
                  <span className={`admin-status admin-status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminFinanceAdmins;
