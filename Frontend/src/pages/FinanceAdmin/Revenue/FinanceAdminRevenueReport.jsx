import React from "react";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminRevenueReport = () => {
  const exportCsv = () => {
    const header = ["Month", "GrossRevenue", "Payouts", "Refunds", "NetRevenue"];
    const body = financeAdminRevenueReport.map((item) =>
      [
        item.month,
        item.grossRevenue,
        item.payouts,
        item.refunds,
        item.grossRevenue - item.payouts - item.refunds,
      ].join(","),
    );
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "finance-admin-revenue-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="finance-admin-page">
      <div className="finance-admin-report-header">
        <h2 className="finance-admin-title">View revenue report</h2>
        <button type="button" className="finance-admin-link-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Gross revenue</th>
              <th>Payouts</th>
              <th>Refunds</th>
              <th>Net revenue</th>
            </tr>
          </thead>
          <tbody>
            {financeAdminRevenueReport.map((item) => {
              const netRevenue = item.grossRevenue - item.payouts - item.refunds;
              return (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{currency.format(item.grossRevenue)}</td>
                  <td>{currency.format(item.payouts)}</td>
                  <td>{currency.format(item.refunds)}</td>
                  <td>{currency.format(netRevenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminRevenueReport;
