import React, { useState } from "react";
import { adminVenueRegistrations } from "../adminData";
import "../adminPages.css";

const AdminVenueRegistrations = () => {
  const [registrations, setRegistrations] = useState(adminVenueRegistrations);

  const updateStatus = (id, status) => {
    setRegistrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  return (
    <section className="admin-page">
      <h2 className="admin-title">Process Venue Registration</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reg ID</th>
              <th>Venue</th>
              <th>Owner</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.venueName}</td>
                <td>{item.owner}</td>
                <td>{item.submittedAt}</td>
                <td>
                  <span className={`admin-status admin-status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <div className="admin-inline-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => updateStatus(item.id, "Approved")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => updateStatus(item.id, "Rejected")}
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

export default AdminVenueRegistrations;
