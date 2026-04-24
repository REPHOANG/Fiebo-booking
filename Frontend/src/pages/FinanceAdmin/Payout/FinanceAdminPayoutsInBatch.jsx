import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPayoutsInBatch } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUSES = ["", "Pending", "Processing", "Completed", "Failed"];

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const s = String(status).trim().toLowerCase();
    if (s === "pending") return <span className="finance-admin-status finance-admin-status-pending">Chờ xử lý</span>;
    if (s === "processing") return <span className="finance-admin-status finance-admin-status-pending" style={{ background: "#e0e7ff", color: "#3730a3" }}>Đang xử lý</span>;
    if (s === "completed" || s === "success") return <span className="finance-admin-status finance-admin-status-reconciled">Thành công</span>;
    if (s === "failed") return <span className="finance-admin-status finance-admin-status-failed">Thất bại</span>;
    return <span className="finance-admin-status">{String(status)}</span>;
  };

const FinanceAdminPayoutsInBatch = () => {
  const { id: batchId } = useParams();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getPayoutsInBatch(batchId, { page, pageSize, status: status || undefined, name: name || undefined })
      .then((data) => {
        setPayouts(data?.items ?? data?.Items ?? []);
        setTotalItems(data?.totalItems ?? data?.TotalItems ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được danh sách Payout."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [batchId, page, pageSize, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <section className="finance-admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="finance-admin-title" style={{ margin: 0 }}>Danh sách Payout trong Đợt #{batchId}</h2>
        <Link to="/finance-admin/payout-batches" className="finance-admin-link-btn">
          Quay lại Đợt thanh toán
        </Link>
      </div>

      <div className="finance-admin-filters" style={{ gridTemplateColumns: "1fr 200px" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            className="finance-admin-input"
            placeholder="Tìm kiếm chủ sân..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="finance-admin-link-btn" style={{ padding: "8px 16px", backgroundColor: "#f3f4f6" }}>
            Tìm
          </button>
        </form>
        <select className="finance-admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "100px" }}>Payout ID</th>
              <th>Chủ sân</th>
              <th style={{ textAlign: "right", width: "140px" }}>Số tiền</th>
              <th style={{ textAlign: "center", width: "160px" }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: "180px" }}>Ngày xử lý</th>
              <th style={{ textAlign: "center", width: "120px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có dữ liệu</td></tr>
            ) : payouts.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", fontWeight: "500" }}>{item.id}</td>
                <td>{item.ownerName}</td>
                <td style={{ textAlign: "right", color: "#16a34a", fontWeight: "600" }}>{currency.format(item.amount)}</td>
                <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                <td style={{ textAlign: "center" }}>{item.processedAt ? new Date(item.processedAt).toLocaleString("vi-VN") : "—"}</td>
                <td style={{ textAlign: "center" }}>
                  <Link to={`/finance-admin/payout/${item.id}`} className="finance-admin-link-btn" style={{ padding: "4px 10px", fontSize: "13px" }}>
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

export default FinanceAdminPayoutsInBatch;
