import React, { useState } from "react";
import { adminPolicies } from "../adminData";
import "../adminPages.css";

const AdminPolicies = () => {
  const [policies, setPolicies] = useState(adminPolicies);
  const [activeKey, setActiveKey] = useState(adminPolicies[0]?.key || "");
  const [draft, setDraft] = useState(adminPolicies[0]?.content || "");

  const activePolicy = policies.find((item) => item.key === activeKey);

  const handleSelect = (key) => {
    const next = policies.find((item) => item.key === key);
    setActiveKey(key);
    setDraft(next?.content || "");
  };

  const savePolicy = () => {
    setPolicies((prev) =>
      prev.map((item) =>
        item.key === activeKey
          ? {
              ...item,
              content: draft,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : item,
      ),
    );
  };

  return (
    <section className="admin-page">
      <h2 className="admin-title">View policies / Update policies</h2>
      <div className="admin-controls">
        <select
          className="admin-select"
          value={activeKey}
          onChange={(e) => handleSelect(e.target.value)}
        >
          {policies.map((item) => (
            <option key={item.key} value={item.key}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        <p className="admin-card-label">
          Last updated: {activePolicy?.updatedAt || "--/--/----"}
        </p>
        <textarea
          className="admin-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="admin-controls" style={{ marginTop: 10 }}>
          <button type="button" className="admin-btn admin-btn-primary" onClick={savePolicy}>
            Update policies
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdminPolicies;
