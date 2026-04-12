import React from "react";
import { adminCustomers } from "../adminData";
import "../adminPages.css";

const AdminCustomers = () => {
  return (
    <section className="admin-page">
      <h2 className="admin-title">View customer list</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Ho ten</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {adminCustomers.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.phone}</td>
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

export default AdminCustomers;
