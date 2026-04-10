import React from "react";
import { adminOwners } from "../adminData";
import "../adminPages.css";

const AdminOwners = () => {
  return (
    <section className="admin-page">
      <h2 className="admin-title">View owner profile</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Owner ID</th>
              <th>Ho ten</th>
              <th>Email</th>
              <th>Phone</th>
              <th>So venue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {adminOwners.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.phone}</td>
                <td>{item.venues}</td>
                <td>
                  <span className={`admin-status admin-status-${item.status.toLowerCase().replace(" ", "-")}`}>
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

export default AdminOwners;
