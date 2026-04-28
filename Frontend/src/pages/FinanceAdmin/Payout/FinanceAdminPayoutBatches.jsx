import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import { getPayoutBatches, completePayoutBatch, processPayoutBatch } from "../../../services/financeAdminService";
import "../financeAdminPages.css";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  CalendarDays,
  ArrowUpRight,
  Filter,
  PlayCircle
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
  { value: "Completed", label: "Hoàn tất" }
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

  const handleProcessBatch = async (id) => {
    const result = await Swal.fire({
      title: 'Xác nhận xử lý đợt',
      text: `Xác nhận chuyển toàn bộ các yêu cầu thanh toán 'Chờ xử lý' trong đợt #${id} sang trạng thái 'Đang xử lý'?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
      await processPayoutBatch(id);
      Swal.fire({ title: 'Thành công!', text: 'Đã chuyển đợt thanh toán sang trạng thái Đang xử lý.', icon: 'success', timer: 1800, showConfirmButton: false });
      setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'Processing' } : b));
    } catch (err) {
      Swal.fire({ title: 'Lỗi!', text: err?.response?.data?.message ?? "Xử lý thất bại.", icon: 'error' });
    }
  };

  const handleCompleteBatch = async (id) => {
    const result = await Swal.fire({
      title: 'Xác nhận hoàn tất đợt',
      text: `Xác nhận hoàn tất toàn bộ đợt thanh toán #${id}? Tất cả các yêu cầu thanh toán 'Đang xử lý' hoặc 'Chờ xử lý' sẽ được đánh dấu là Thành công (trừ các giao dịch đã Thất bại).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
      await completePayoutBatch(id);
      Swal.fire({
        title: 'Thành công!',
        text: 'Đợt thanh toán đã được hoàn tất.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'Completed' } : b));
    } catch (err) {
      Swal.fire({
        title: 'Lỗi!',
        text: err?.response?.data?.message ?? "Xử lý thất bại.",
        icon: 'error'
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, status, year, month]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="payout-detail-container">
      {/* Filter Bar */}
      <div className="filter-bar-premium">
        <div style={{ position: 'relative', flex: 0.3 }}>
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

        <div style={{ display: "flex", gap: 12, flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <CalendarDays size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', zIndex: 1 }} />
            <select className="select-premium" style={{ paddingLeft: 40 }} value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}>
              <option value="">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Tháng {String(m).padStart(2, "0")}</option>
              ))}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <CalendarDays size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', zIndex: 1 }} />
            <input
              className="select-premium"
              type="number"
              placeholder="Năm"
              value={year}
              onChange={(e) => { setYear(e.target.value); setPage(1); }}
              style={{ width: 140, paddingLeft: 40 }}
            />
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

      {/* Table Section */}
      <div className="table-card-premium">
        <table className="table-premium">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "100px" }}>ID Đợt</th>
              <th style={{ textAlign: "center" }}>Chu kỳ thanh toán</th>
              <th style={{ textAlign: "right", width: "200px" }}>Tổng tiền chi trả</th>
              <th style={{ textAlign: "center", width: "160px" }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: "180px" }}>Ngày tạo</th>
              <th style={{ textAlign: "center", width: "100px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Đang tải dữ liệu...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Không tìm thấy đợt thanh toán nào.</td></tr>
            ) : batches.map((item) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", fontWeight: "800", color: '#94a3b8' }}>#{item.id}</td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(item.fromDate).toLocaleDateString("vi-VN")}</span>
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(item.toDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="amount-cell-premium positive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    <ArrowUpRight size={14} />
                    {currency.format(item.totalAmount)}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <Link to={`/finance/payout-batches/${item.id}/payouts`} className="btn-view-detail" title="Xem chi tiết">
                      <Eye size={18} />
                    </Link>
                    {item.status === 'Pending' && (
                      <button
                        onClick={() => handleProcessBatch(item.id)}
                        className="btn-view-detail"
                        style={{ color: '#6366f1', borderColor: '#6366f1' }}
                        title="Bắt đầu xử lý đợt"
                      >
                        <PlayCircle size={18} />
                      </button>
                    )}
                    {(item.status === 'Pending' || item.status === 'Processing') && (
                      <button
                        onClick={() => handleCompleteBatch(item.id)}
                        className="btn-view-detail"
                        style={{ color: '#10b981', borderColor: '#10b981' }}
                        title="Hoàn tất đợt"
                      >
                        <CheckCircle2 size={18} />
                      </button>
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
            Hiển thị <strong>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</strong> trong số <strong>{totalItems}</strong> đợt thanh toán
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

export default FinanceAdminPayoutBatches;

