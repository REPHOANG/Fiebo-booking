import React, { useEffect, useState } from "react";
import { getWithdrawalRequests } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUSES = ["", "Pending", "Completed", "Rejected"];

const FinanceAdminWithdrawalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getWithdrawalRequests({ status: status || undefined })
      .then(setRequests)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Yêu cầu rút tiền của khách hàng</h2>

      <div className="finance-admin-filters">
        <div />
        <select className="finance-admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div />
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Khách hàng</th>
              <th>Ngân hàng</th>
              <th>Số tài khoản</th>
              <th>Số dư ví</th>
              <th>Số tiền rút</th>
              <th>Ngày yêu cầu</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có dữ liệu</td></tr>
            ) : requests.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.customerName}</td>
                <td>{item.bankName || "—"}</td>
                <td>{item.bankAccountNumber || "—"}</td>
                <td>{currency.format(item.walletBalance)}</td>
                <td>{currency.format(item.amount)}</td>
                <td>{item.requestedAt ? new Date(item.requestedAt).toLocaleDateString("vi-VN") : "—"}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminWithdrawalRequests;
