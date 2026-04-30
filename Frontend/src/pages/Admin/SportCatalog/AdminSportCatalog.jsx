import React, { useState } from "react";
import { adminSports } from "../adminData";
import "../adminPages.css";

const initialForm = { id: "", name: "", icon: "" };

const AdminSportCatalog = () => {
  const [sports, setSports] = useState(adminSports);
  const [form, setForm] = useState(initialForm);

  const saveSport = () => {
    const id = form.id.trim();
    const name = form.name.trim();
    const icon = form.icon.trim();
    if (!id || !name) return;

    setSports((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (exists) {
        return prev.map((item) => (item.id === id ? { ...item, name, icon: icon || item.icon } : item));
      }
      return [{ id, name, icon: icon || "🎯", status: "Active" }, ...prev];
    });
    setForm(initialForm);
  };

  const editSport = (sport) => {
    setForm({ id: sport.id, name: sport.name, icon: sport.icon });
  };

  return (
    <section className="admin-page">
      <h2 className="admin-title">Sport catalog</h2>
      <p className="admin-subtitle">View / Create / Edit sport catalog.</p>

      <div className="admin-controls">
        <input
          className="admin-input"
          placeholder="ID (VD: SP-04)"
          value={form.id}
          onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
        />
        <input
          className="admin-input"
          placeholder="Ten mon the thao"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input
          className="admin-input"
          placeholder="Icon (emoji)"
          value={form.icon}
          onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
        />
        <button type="button" className="admin-btn admin-btn-primary" onClick={saveSport}>
          {sports.some((item) => item.id === form.id) ? "Edit sport catalog" : "Create sport catalog"}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Icon</th>
              <th>Ten mon</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sports.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.icon}</td>
                <td>{item.name}</td>
                <td>
                  <span className={`admin-status admin-status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <button type="button" className="admin-btn" onClick={() => editSport(item)}>
                    Edit
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

export default AdminSportCatalog;
