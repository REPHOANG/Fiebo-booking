import React, { useEffect, useState } from "react";
import { getWithdrawalRequests } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Success", label: "Thành công" },
  { value: "Failed", label: "Thất bại" },
  { value: "Rejected", label: "Từ chối" },
];

const renderStatusBadge = (status) => {
  if (!status) return null;
  const s = String(status).trim().toLowerCase();
  if (s === "pending") return <span className="finance-admin-status finance-admin-status-pending">Chờ xử lý</span>;
  if (s === "success" || s === "completed") return <span className="finance-admin-status finance-admin-status-reconciled">Thành công</span>;
  if (s === "failed") return <span className="finance-admin-status finance-admin-status-failed">Thất bại</span>;
  if (s === "rejected") return <span className="finance-admin-status finance-admin-status-failed">Từ chối</span>;
  return <span className="finance-admin-status">{String(status)}</span>;
};

const FinanceAdminWithdrawalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getWithdrawalRequests({ status: status || undefined, page, pageSize })
      .then((data) => {
        setRequests(data.items ?? []);
        setTotalItems(data.totalItems ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  }, [status, page, pageSize]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Yêu cầu rút tiền của khách hàng</h2>

      <div className="finance-admin-filters" style={{ gridTemplateColumns: "1fr 200px" }}>
        <div />
        <select
          className="finance-admin-select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: 80 }}>ID</th>
              <th>Khách hàng</th>
              <th style={{ textAlign: "right", width: 150 }}>Số tiền rút</th>
              <th style={{ textAlign: "center", width: 180 }}>Ngày yêu cầu</th>
              <th style={{ textAlign: "center", width: 140 }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32 }}>Đang tải...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Không có dữ liệu</td></tr>
            ) : requests.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", fontWeight: 500 }}>{item.id}</td>
                <td>{item.customerName}</td>
                <td style={{ textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                  -{currency.format(item.amount)}
                </td>
                <td style={{ textAlign: "center" }}>
                  {item.requestedAt ? new Date(item.requestedAt).toLocaleString("vi-VN") : "—"}
                </td>
                <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: 14 }}>Tổng số: {totalItems}</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="finance-admin-link-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{ opacity: page <= 1 ? 0.5 : 1 }}
            >
              Trang trước
            </button>
            <span style={{ fontSize: 14 }}>Trang {page} / {totalPages}</span>
            <button
              className="finance-admin-link-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              style={{ opacity: page >= totalPages ? 0.5 : 1 }}
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default FinanceAdminWithdrawalRequests;
