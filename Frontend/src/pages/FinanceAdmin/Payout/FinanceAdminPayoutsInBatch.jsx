import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, Link } from "react-router-dom";
import { getPayoutsInBatch, completePayout, startProcessingPayout, markPayoutAsFailed } from "../../../services/financeAdminService";
import "../financeAdminPages.css";
import {
  Search,
  ArrowLeft,
  Filter,
  Clock,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertCircle,
  PlayCircle,
} from "lucide-react";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Completed", label: "Hoàn tất" },
  { value: "Failed", label: "Thất bại" },
];

const renderStatusBadge = (status) => {
  if (!status) return null;
  const s = String(status).trim().toLowerCase();
  if (s === "pending") return <span className="status-badge-pill pending" style={{ fontSize: '11px', padding: '4px 10px' }}><Clock size={12} /> Chờ xử lý</span>;
  if (s === "processing") return <span className="status-badge-pill" style={{ background: "#e0e7ff", color: "#3730a3", fontSize: '11px', padding: '4px 10px' }}><Clock size={12} /> Đang xử lý</span>;
  if (s === "completed" || s === "success") return <span className="status-badge-pill success" style={{ fontSize: '11px', padding: '4px 10px' }}><CheckCircle2 size={12} /> Thành công</span>;
  if (s === "failed") return <span className="status-badge-pill" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', padding: '4px 10px' }}>Thất bại</span>;
  return <span className="status-badge-pill" style={{ fontSize: '11px', padding: '4px 10px' }}>{String(status)}</span>;
};

const FinanceAdminPayoutsInBatch = () => {
  const { id: batchId } = useParams();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("");
  const [name, setName] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [failState, setFailState] = useState(null); // { id, reason }
  const [processingId, setProcessingId] = useState(null);

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

  const handleStartProcessing = async (id) => {
    const result = await Swal.fire({
      title: 'Bắt đầu xử lý',
      text: `Xác nhận bắt đầu xử lý payout #${id}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });
    if (!result.isConfirmed) return;
    setProcessingId(id + ":process");
    try {
      await startProcessingPayout(id);
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Processing' } : p));
      Swal.fire({ title: 'Thành công!', text: 'Đã chuyển sang trạng thái Đang xử lý.', icon: 'success', timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: 'Lỗi!', text: err?.response?.data?.message ?? "Xử lý thất bại.", icon: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompletePayout = async (id) => {
    const result = await Swal.fire({
      title: 'Xác nhận hoàn tất',
      text: `Bạn có chắc chắn muốn hoàn tất thanh toán #${id}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;
    setProcessingId(id + ":complete");
    try {
      await completePayout(id);
      Swal.fire({ title: 'Thành công!', text: 'Thanh toán đã được đánh dấu là hoàn tất.', icon: 'success', timer: 2000, showConfirmButton: false });
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Completed', processedAt: new Date().toISOString() } : p));
    } catch (err) {
      Swal.fire({ title: 'Lỗi!', text: err?.response?.data?.message ?? "Xử lý thất bại.", icon: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFailConfirm = async () => {
    if (!failState?.reason?.trim()) {
      Swal.fire({ title: 'Thiếu thông tin', text: 'Vui lòng nhập lý do thất bại.', icon: 'warning' });
      return;
    }
    const { id, reason } = failState;
    setFailState(null);
    setProcessingId(id + ":fail");
    try {
      await markPayoutAsFailed(id, reason);
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Failed', processedAt: new Date().toISOString() } : p));
      Swal.fire({ title: 'Thành công!', text: 'Đã đánh dấu payout thất bại.', icon: 'success', timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: 'Lỗi!', text: err?.response?.data?.message ?? "Xử lý thất bại.", icon: 'error' });
    } finally {
      setProcessingId(null);
    }
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
    <div className="payout-detail-container">

      {/* Fail Modal */}
      {failState && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: 32, width: 480,
            display: "flex", flexDirection: "column", gap: 20,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: 10, borderRadius: 12 }}>
                <AlertCircle size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Đánh dấu payout thất bại</h3>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
              Vui lòng nhập lý do payout #{failState.id} thất bại. Thông tin này sẽ được ghi nhận trong hệ thống.
            </p>
            <textarea
              style={{
                width: "100%", minHeight: 120, borderRadius: 12,
                border: "1px solid #e2e8f0", padding: "12px 16px",
                fontFamily: "inherit", fontSize: 14, resize: "none", boxSizing: "border-box",
                background: '#f8fafc'
              }}
              placeholder="Ví dụ: Chuyển khoản ngân hàng thất bại do số tài khoản không đúng..."
              value={failState.reason}
              onChange={(e) => setFailState((s) => ({ ...s, reason: e.target.value }))}
              autoFocus
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn-action outline" style={{ padding: '10px 20px' }} onClick={() => setFailState(null)}>Hủy bỏ</button>
              <button type="button" className="btn-action dark" style={{ background: "#ef4444", color: "#fff", padding: '10px 20px' }} onClick={handleFailConfirm}>Xác nhận thất bại</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>Danh sách Payout trong Đợt #{batchId}</h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 15 }}>Chi tiết thanh toán cho chủ sân trong kỳ này</p>
        </div>
        <Link to="/finance/payout-batches" className="btn-action outline" style={{ background: '#fff', padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={18} /> Quay lại
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar-premium">
        <form onSubmit={handleSearch} style={{ position: 'relative', flex: 1 }}>
          <Search className="search-icon" size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="finance-admin-input"
            placeholder="Tìm kiếm theo tên chủ sân..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', height: 44, paddingLeft: 44, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}
          />
        </form>
        <div style={{ position: 'relative', width: 240 }}>
          <Filter size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', zIndex: 1 }} />
          <select
            className="select-premium"
            style={{ width: '100%', paddingLeft: 40 }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

      {/* Table Section */}
      <div className="table-card-premium">
        <table className="table-premium">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "100px" }}>ID</th>
              <th>Chủ sân</th>
              <th style={{ textAlign: "right", width: "200px" }}>Số tiền</th>
              <th style={{ textAlign: "center", width: "180px" }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: "180px" }}>Ngày xử lý</th>
              <th style={{ textAlign: "center", width: "100px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Đang tải dữ liệu...</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Không tìm thấy Payout nào.</td></tr>
            ) : payouts.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", fontWeight: "800", color: '#94a3b8' }}>#{item.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#475569' }}>
                      {item.ownerName?.charAt(0) || "U"}
                    </div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.ownerName}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="amount-cell-premium positive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    <ArrowUpRight size={14} />
                    {currency.format(item.amount)}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {item.processedAt ? new Date(item.processedAt).toLocaleDateString("vi-VN") : "Chưa xử lý"}
                  </div>
                  {item.processedAt && (
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(item.processedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </td>
                 <td style={{ textAlign: "center" }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to={`/finance/payout/${item.id}`} className="btn-view-detail" title="Xem chi tiết">
                      <Eye size={18} />
                    </Link>
                    {String(item.status).toLowerCase() === 'pending' && (
                      <button
                        onClick={() => handleStartProcessing(item.id)}
                        className="btn-view-detail"
                        style={{ color: '#6366f1', borderColor: '#6366f1' }}
                        title="Bắt đầu xử lý"
                        disabled={processingId === item.id + ":process"}
                      >
                        <PlayCircle size={18} />
                      </button>
                    )}
                    {String(item.status).toLowerCase() === 'processing' && (
                      <>
                        <button
                          onClick={() => handleCompletePayout(item.id)}
                          className="btn-view-detail"
                          style={{ color: '#10b981', borderColor: '#10b981' }}
                          title="Hoàn tất payout"
                          disabled={processingId === item.id + ":complete"}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => setFailState({ id: item.id, reason: "" })}
                          className="btn-view-detail"
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          title="Đánh dấu thất bại"
                          disabled={processingId === item.id + ":fail"}
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div className="pagination-bar-premium">
          <div className="pagination-info">
            Hiển thị <strong>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</strong> trong số <strong>{totalItems}</strong> Payout
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

export default FinanceAdminPayoutsInBatch;
