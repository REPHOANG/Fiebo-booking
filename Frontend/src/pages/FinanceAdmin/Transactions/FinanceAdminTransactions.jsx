import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTransactions } from "../../../services/financeAdminService";
import "../financeAdminPages.css";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  CheckCircle2, 
  Clock,
  LayoutDashboard,
  CalendarDays
} from "lucide-react";

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
        const rawItems = data?.items ?? data?.Items ?? [];
        const normalized = rawItems.map(item => ({
          ...item,
          id: item?.id ?? item?.Id,
          amount: Number(item?.amount ?? item?.Amount ?? 0),
          status: item?.status ?? item?.Status,
          createdAt: item?.createdAt ?? item?.CreatedAt,
          direction: item?.direction ?? item?.Direction,
          transactionType: item?.transactionType ?? item?.TransactionType,
          fullname: item?.fullname ?? item?.Fullname ?? item?.fullName ?? item?.FullName,
        }));
        setTransactions(normalized);
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
    if (s === "pending") return <span className="status-badge-pill pending" style={{ fontSize: '11px', padding: '4px 10px' }}><Clock size={12} /> Chờ xử lý</span>;
    if (s === "completed" || s === "success") return <span className="status-badge-pill success" style={{ fontSize: '11px', padding: '4px 10px' }}><CheckCircle2 size={12} /> Thành công</span>;
    if (s === "failed") return <span className="status-badge-pill" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', padding: '4px 10px' }}>Thất bại</span>;
    if (s === "cancelled" || s === "canceled") return <span className="status-badge-pill" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', padding: '4px 10px' }}>Đã hủy</span>;
    return <span className="status-badge-pill" style={{ fontSize: '11px', padding: '4px 10px' }}>{String(status)}</span>;
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
      payout: "Thanh toán",
      payoutowner: "Thanh toán",
      payout_owner: "Thanh toán",
    };
    return map[k] || String(type);
  };

  return (
    <div className="payout-detail-container">

      {/* Filter Bar */}
      <div className="filter-bar-premium">
        <div className="search-box-premium">
          <Search className="search-icon" size={18} />
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </form>
        </div>
        
        <select className="select-premium" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">Tất cả loại</option>
          <option value="Deposit">Nạp tiền</option>
          <option value="Withdrawal">Rút tiền</option>
          <option value="Subscription">Gói đăng ký</option>
          <option value="Booking">Đặt sân</option>
          <option value="Refund">Hoàn tiền</option>
          <option value="Payout">Thanh toán</option>
        </select>

        <select className="select-premium" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ xử lý</option>
          <option value="Success">Thành công</option>
          <option value="Failed">Thất bại</option>
        </select>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

      {/* Table Section */}
      <div className="table-card-premium">
        <table className="table-premium">
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
              <th>Người dùng</th>
              <th style={{ textAlign: 'right' }}>Số tiền</th>
              <th style={{ textAlign: 'center' }}>Loại</th>
              <th style={{ textAlign: 'center' }}>Ngày tạo</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
              <th style={{ width: '80px', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Đang tải dữ liệu...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Không tìm thấy giao dịch nào.</td></tr>
            ) : transactions.map((item) => {
              const isIn = normalizeDirectionIsIncoming(item.direction);
              return (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center', fontWeight: '800', color: '#94a3b8' }}>#{item.id}</td>
                  <td>
                    <div className="user-cell-premium">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullname || "User")}&background=random&size=64`} 
                        alt="Avatar" 
                        className="user-avatar-small" 
                      />
                      <div className="user-info-text">
                        <span className="name">{item.fullname}</span>
                        <span className="sub">{item.email || 'Hệ thống'}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className={`amount-cell-premium ${isIn ? 'positive' : 'negative'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      {isIn ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      {isIn ? "+" : "-"}{currency.format(item.amount)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#475569' }}>{translateTransactionType(item.transactionType)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderStatusBadge(item.status)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link to={`/finance/transactions/${item.id}`} className="btn-view-detail">
                      <Eye size={18} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div className="pagination-bar-premium">
          <div className="pagination-info">
            Hiển thị <strong>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</strong> trong số <strong>{totalItems}</strong> giao dịch
          </div>
          <div className="pagination-actions">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="pagination-btn"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="pagination-page-indicator">Trang {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="pagination-btn"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceAdminTransactions;

