import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPayoutBatches } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUSES = ["", "Pending", "Processing", "Completed"];

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const s = String(status).trim().toLowerCase();
    if (s === "pending") return <span className="finance-admin-status finance-admin-status-pending">Chờ xử lý</span>;
    if (s === "processing") return <span className="finance-admin-status finance-admin-status-pending" style={{ background: "#e0e7ff", color: "#3730a3" }}>Đang xử lý</span>;
    if (s === "completed" || s === "success") return <span className="finance-admin-status finance-admin-status-reconciled">Thành công</span>;
    if (s === "failed") return <span className="finance-admin-status finance-admin-status-failed">Thất bại</span>;
    return <span className="finance-admin-status">{String(status)}</span>;
  };

const FinanceAdminPayoutBatches = () => {
  const now = new Date();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getPayoutBatches({ page, pageSize, status: status || undefined, year: year || undefined, month: month || undefined })
      .then((data) => {
        setBatches(data?.items ?? data?.Items ?? []);
        setTotalItems(data?.totalItems ?? data?.TotalItems ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được danh sách đợt thanh toán."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, status, year, month]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Quản lý đợt thanh toán (Payout Batches)</h2>

      <div className="finance-admin-filters">
        <div />
        <select className="finance-admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="finance-admin-select" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}>
            <option value="">Tất cả tháng</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
          <input className="finance-admin-input" type="number" placeholder="Năm" value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }} style={{ width: 90 }} />
        </div>
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "80px" }}>Batch ID</th>
              <th style={{ textAlign: "center", width: "220px" }}>Chu kỳ thanh toán</th>
              <th style={{ textAlign: "right", width: "150px" }}>Tổng tiền</th>
              <th style={{ textAlign: "center", width: "140px" }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: "180px" }}>Ngày tạo</th>
              <th style={{ textAlign: "center", width: "120px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có dữ liệu</td></tr>
            ) : batches.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", fontWeight: "500" }}>{item.id}</td>
                <td style={{ textAlign: "center" }}>
                  {new Date(item.fromDate).toLocaleDateString("vi-VN")} - {new Date(item.toDate).toLocaleDateString("vi-VN")}
                </td>
                <td style={{ textAlign: "right", color: "#16a34a", fontWeight: "600" }}>{currency.format(item.totalAmount)}</td>
                <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                <td style={{ textAlign: "center" }}>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                <td style={{ textAlign: "center" }}>
                  <Link to={`/finance-admin/payout-batches/${item.id}/payouts`} className="finance-admin-link-btn" style={{ padding: "4px 10px", fontSize: "13px" }}>
                    Xem chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <div className="finance-admin-pagination" style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Tổng số: {totalItems}</span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="finance-admin-link-btn"
              style={{ opacity: page <= 1 ? 0.5 : 1 }}
            >
              Trang trước
            </button>
            <span style={{ padding: "8px" }}>Trang {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="finance-admin-link-btn"
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

export default FinanceAdminPayoutBatches;
