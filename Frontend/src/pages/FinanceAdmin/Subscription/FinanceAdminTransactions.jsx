import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTransactions } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [name, setName] = useState("");

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getTransactions({ page, pageSize, status: status || undefined, type: type || undefined, name: name || undefined })
      .then((data) => {
        setTransactions(data?.items ?? data?.Items ?? []);
        setTotalItems(data?.totalItems ?? data?.TotalItems ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu giao dịch."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, status, type]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const normalizeDirectionIsIncoming = (dir) => {
    if (!dir) return false;
    const d = String(dir).trim().toLowerCase();
    return d === "in" || d === "credit" || d === "incoming";
  };

  const translateDirection = (dir) => {
    if (!dir) return "";
    const d = String(dir).trim().toLowerCase();
    if (d === "in" || d === "credit" || d === "incoming") return "Tiền vào";
    if (d === "out" || d === "debit" || d === "outgoing") return "Tiền ra";
    return String(dir);
  };

  const renderStatusBadge = (status) => {
    if (!status) return null;
    const s = String(status).trim().toLowerCase();
    if (s === "pending") return <span className="finance-admin-status finance-admin-status-pending">Chờ xử lý</span>;
    if (s === "completed" || s === "success") return <span className="finance-admin-status finance-admin-status-reconciled">Thành công</span>;
    if (s === "failed") return <span className="finance-admin-status finance-admin-status-failed">Thất bại</span>;
    if (s === "cancelled" || s === "canceled") return <span className="finance-admin-status finance-admin-status-failed">Đã hủy</span>;
    return <span className="finance-admin-status">{String(status)}</span>;
  };

  const translateTransactionType = (type) => {
    if (!type) return "";
    const k = String(type).trim().toLowerCase();
    const map = {
      booking: "Đặt sân",
      eventbooking: "Sự kiện",
      refund: "Hoàn tiền",
      topup: "Nạp tiền",
      topUp: "Nạp tiền",
      deposit: "Nạp tiền",
      withdraw: "Rút tiền",
      withdrawal: "Rút tiền",
      subscription: "Gói đăng ký",
      payout: "Thanh toán chủ sân",
      payoutowner: "Thanh toán chủ sân",
      payout_owner: "Thanh toán chủ sân",
    };
    return map[k] || String(type);
  };

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Danh sách giao dịch</h2>

      <div className="finance-admin-filters" style={{ gridTemplateColumns: "1fr 200px 200px" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            className="finance-admin-input"
            placeholder="Tìm kiếm theo tên..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="finance-admin-link-btn" style={{ padding: "8px 16px", backgroundColor: "#f3f4f6" }}>
            Tìm
          </button>
        </form>
        <select className="finance-admin-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">Tất cả loại giao dịch</option>
          <option value="Deposit">Nạp tiền</option>
          <option value="Withdrawal">Rút tiền</option>
          <option value="Subscription">Gói đăng ký</option>
          <option value="Booking">Đặt sân</option>
          <option value="Refund">Hoàn tiền</option>
          <option value="Payout">Thanh toán chủ sân</option>
        </select>
        <select className="finance-admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ xử lý</option>
          <option value="Success">Thành công</option>
          <option value="Failed">Thất bại</option>
        </select>
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "60px" }}>ID</th>
              <th>Người dùng</th>
              <th style={{ textAlign: "right", width: "130px" }}>Số tiền</th>
              <th style={{ textAlign: "center", width: "160px" }}>Loại giao dịch</th>
              <th style={{ textAlign: "center", width: "120px" }}>Chiều</th>
              <th style={{ textAlign: "center", width: "160px" }}>Ngày tạo</th>
              <th style={{ textAlign: "center", width: "140px" }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: "100px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có giao dịch nào.</td></tr>
            ) : transactions.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", fontWeight: "500" }}>{item.id}</td>
                <td>{item.fullname}</td>
                <td style={{ textAlign: "right", color: normalizeDirectionIsIncoming(item.direction) ? "#16a34a" : "#dc2626", fontWeight: "600" }}>
                  {normalizeDirectionIsIncoming(item.direction) ? "+" : "-"}{currency.format(item.amount)}
                </td>
                <td style={{ textAlign: "center" }}>{translateTransactionType(item.transactionType)}</td>
                <td style={{ textAlign: "center" }}>{translateDirection(item.direction)}</td>
                <td style={{ textAlign: "center" }}>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                <td style={{ textAlign: "center" }}>
                  <Link to={`/finance-admin/transactions/${item.id}`} className="finance-admin-link-btn" style={{ padding: "4px 10px", fontSize: "13px" }}>
                    Chi tiết
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

export default FinanceAdminTransactions;
