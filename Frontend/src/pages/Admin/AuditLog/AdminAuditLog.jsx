import React from "react";
import { adminAuditLogs } from "../adminData";
import "../adminPages.css";

const AdminAuditLog = () => {
  return (
    <section className="admin-page">
      <h2 className="admin-title">View audit log</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {adminAuditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.actor}</td>
                <td>{log.action}</td>
                <td>{log.target}</td>
                <td>{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminAuditLog;
