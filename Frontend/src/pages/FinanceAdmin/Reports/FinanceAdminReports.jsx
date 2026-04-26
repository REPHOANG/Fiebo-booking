import React from "react";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const toCsv = (rows) => {
  const header = ["Month", "GrossRevenue", "Payouts", "Refunds"];
  const body = rows.map((item) =>
    [item.month, item.grossRevenue, item.payouts, item.refunds].join(","),
  );
  return [header.join(","), ...body].join("\n");
};

const FinanceAdminReports = () => {
  const exportCsv = () => {
    const csv = toCsv(financeAdminMonthlySummary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "finance-admin-monthly-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="finance-admin-page">
      <div className="finance-admin-report-header">
        <h2 className="finance-admin-title">Bao cao tai chinh theo thang</h2>
        <button
          type="button"
          className="finance-admin-link-btn"
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Thang</th>
              <th>Tong doanh thu</th>
              <th>Tong payout</th>
              <th>Refund</th>
              <th>Loi nhuan tam tinh</th>
            </tr>
          </thead>
          <tbody>
            {financeAdminMonthlySummary.map((item) => {
              const estimatedProfit =
                item.grossRevenue - item.payouts - item.refunds;
              return (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{currency.format(item.grossRevenue)}</td>
                  <td>{currency.format(item.payouts)}</td>
                  <td>{currency.format(item.refunds)}</td>
                  <td>{currency.format(estimatedProfit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminReports;
