import React from "react";
import { adminMonthlyAnalytics } from "../adminData";
import "../adminPages.css";

const toCsv = (rows) => {
  const header = ["Month", "Bookings", "Revenue", "ActiveUsers"];
  const body = rows.map((item) =>
    [item.month, item.bookings, item.revenue, item.activeUsers].join(","),
  );
  return [header.join(","), ...body].join("\n");
};

const AdminReports = () => {
  const exportCsv = () => {
    const csv = toCsv(adminMonthlyAnalytics);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "admin-analytics-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-page">
      <h2 className="admin-title">Export report</h2>
      <p className="admin-subtitle">Xuat bao cao tong hop analytics theo thang.</p>
      <div className="admin-controls">
        <button type="button" className="admin-btn admin-btn-primary" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
    </section>
  );
};

export default AdminReports;
