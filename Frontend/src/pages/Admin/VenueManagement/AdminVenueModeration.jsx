import React, { useState } from "react";
import { adminVenues } from "../adminData";
import "../adminPages.css";

const AdminVenueModeration = () => {
  const [venues, setVenues] = useState(adminVenues);

  const toggleLock = (venueId) => {
    setVenues((prev) =>
      prev.map((item) =>
        item.id === venueId
          ? { ...item, status: item.status === "Locked" ? "Open" : "Locked" }
          : item,
      ),
    );
  };

  return (
    <section className="admin-page">
      <h2 className="admin-title">Lock/unlock venue</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Venue ID</th>
              <th>Ten san</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.owner}</td>
                <td>
                  <span className={`admin-status admin-status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <button type="button" className="admin-btn" onClick={() => toggleLock(item.id)}>
                    {item.status === "Locked" ? "Unlock" : "Lock"}
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

export default AdminVenueModeration;
