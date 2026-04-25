import React, { useEffect, useState } from "react";
import {
  getWithdrawalRequests,
  getWithdrawalRequestDetail,
  completeWithdrawalRequest,
  rejectWithdrawalRequest,
} from "../../../services/financeAdminService";
import "../financeAdminPages.css";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Wallet, 
  AlertCircle,
  Building2,
  ArrowDownLeft
} from "lucide-react";

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
  if (s === "pending") return <span className="status-badge-pill pending" style={{ fontSize: '11px', padding: '4px 10px' }}><Clock size={12} /> Chờ xử lý</span>;
  if (s === "success" || s === "completed") return <span className="status-badge-pill success" style={{ fontSize: '11px', padding: '4px 10px' }}><CheckCircle2 size={12} /> Thành công</span>;
  if (s === "failed" || s === "rejected") return <span className="status-badge-pill" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', padding: '4px 10px' }}><XCircle size={12} /> {s === "rejected" ? "Từ chối" : "Thất bại"}</span>;
  return <span className="status-badge-pill" style={{ fontSize: '11px', padding: '4px 10px' }}>{String(status)}</span>;
};

const FinanceAdminWithdrawalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  const [processing, setProcessing] = useState(null);
  const [rejectState, setRejectState] = useState(null); // { id, reason }
  const [detail, setDetail] = useState(null); // expanded detail view
  const [detailLoading, setDetailLoading] = useState(false);

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

  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const data = await getWithdrawalRequestDetail(id);
      setDetail(data);
    } catch (e) {
      alert(e?.response?.data?.message ?? "Không tải được chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetail = async (id) => {
    await fetchDetail(id);
  };

  const handleComplete = async (id) => {
    if (!window.confirm("Xác nhận đã hoàn tất chuyển khoản cho khách hàng?")) return;
    setProcessing(id + ":complete");
    try {
      await completeWithdrawalRequest(id);
      setRequests((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: "Success" } : item)
      );
      if (detail?.id === id) setDetail((d) => ({ ...d, status: "Success" }));
    } catch (err) {
      alert(err?.response?.data?.message ?? "Xử lý thất bại.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectState?.reason?.trim()) {
      alert("Vui lòng nhập lý do từ chối.");
      return;
    }
    const { id, reason } = rejectState;
    setProcessing(id + ":reject");
    setRejectState(null);
    try {
      await rejectWithdrawalRequest(id, reason);
      setRequests((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: "Rejected" } : item)
      );
      if (detail?.id === id) setDetail((d) => ({ ...d, status: "Rejected", rejectionReason: reason }));
    } catch (err) {
      alert(err?.response?.data?.message ?? "Từ chối thất bại.");
    } finally {
      setProcessing(null);
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="payout-detail-container">
      {/* Filter Bar */}
      <div className="filter-bar-premium">
        <div className="search-box-premium">
          <Search className="search-icon" size={18} />
          <input type="text" placeholder="Tìm theo tên khách hàng..." />
        </div>
        <div style={{ position: 'relative', width: 240 }}>
          <Clock size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', zIndex: 1 }} />
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

      {/* Reject Modal */}
      {rejectState && (
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
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Từ chối yêu cầu rút tiền</h3>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
              Vui lòng cung cấp lý do từ chối. Khách hàng sẽ nhận được thông báo này và số tiền sẽ được hoàn trả vào ví của họ.
            </p>
            <textarea
              style={{
                width: "100%", minHeight: 120, borderRadius: 12,
                border: "1px solid #e2e8f0", padding: "12px 16px",
                fontFamily: "inherit", fontSize: 14, resize: "none", boxSizing: "border-box",
                background: '#f8fafc'
              }}
              placeholder="Ví dụ: Thông tin tài khoản ngân hàng không chính xác..."
              value={rejectState.reason}
              onChange={(e) => setRejectState((s) => ({ ...s, reason: e.target.value }))}
              autoFocus
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              <button 
                type="button" 
                className="btn-action outline" 
                style={{ padding: '10px 20px' }}
                onClick={() => setRejectState(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-action dark"
                style={{ background: "#ef4444", color: "#fff", padding: '10px 20px' }}
                onClick={handleRejectConfirm}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110,
          backdropFilter: 'blur(4px)', padding: 20
        }}>
          <div style={{
            background: "#fff", borderRadius: 24, width: "100%", maxWidth: 800,
            display: "flex", flexDirection: "column", overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Chi tiết yêu cầu rút tiền #{detail.id}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Thông tin chi tiết về khách hàng và tài khoản nhận tiền</p>
              </div>
              <button 
                onClick={() => setDetail(null)}
                style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div className="info-column">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#2563eb' }}>
                  <Building2 size={18} />
                  <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Thông tin ngân hàng</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 15 }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>NGÂN HÀNG</div>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>{detail?.bankName || "—"}</div>
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>SỐ TÀI KHOẢN</div>
                    <div style={{ color: '#2563eb', fontWeight: 700, letterSpacing: 0.5, fontSize: 18 }}>{detail?.bankAccountNumber || "—"}</div>
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>CHỦ TÀI KHOẢN</div>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>{detail?.accountHolderName || "—"}</div>
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>CHI NHÁNH</div>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>{detail?.bankBranch || "—"}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div className="info-column">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#10b981' }}>
                    <Wallet size={18} />
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Số dư & Mô tả</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 15 }}>
                      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>SỐ DƯ VÍ HIỆN TẠI</div>
                      <div style={{ color: '#10b981', fontWeight: 700, fontSize: 18 }}>{currency.format(detail?.walletBalance ?? 0)}</div>
                    </div>
                    <div style={{ fontSize: 15 }}>
                      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>GHI CHÚ TỪ KHÁCH</div>
                      <div style={{ color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                        "{detail?.description || "Không có mô tả"}"
                      </div>
                    </div>
                  </div>
                </div>

                <div className="info-column">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#64748b' }}>
                    <AlertCircle size={18} />
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trạng thái xử lý</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {detail?.rejectionReason && (
                      <div style={{ fontSize: 15 }}>
                        <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>LÝ DO TỪ CHỐI</div>
                        <div style={{ color: '#ef4444', fontWeight: 600 }}>{detail.rejectionReason}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>KẾT QUẢ:</div>
                      {renderStatusBadge(detail?.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 32px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                type="button" 
                className="btn-action outline" 
                style={{ padding: '10px 24px', background: '#fff' }}
                onClick={() => setDetail(null)}
              >
                Đóng
              </button>
              {String(detail.status).toLowerCase() === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn-action outline-danger"
                    style={{ padding: '10px 24px' }}
                    onClick={() => { setRejectState({ id: detail.id, reason: "" }); setDetail(null); }}
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    className="btn-action dark"
                    style={{ padding: '10px 24px', background: '#10b981' }}
                    onClick={() => { handleComplete(detail.id); setDetail(null); }}
                  >
                    Hoàn tất chuyển khoản
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

      {/* Table Section */}
      <div className="table-card-premium">
        <table className="table-premium">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: 80 }}>ID</th>
              <th>Khách hàng</th>
              <th style={{ textAlign: "right", width: 180 }}>Số tiền rút</th>
              <th style={{ textAlign: "center", width: 180 }}>Ngày yêu cầu</th>
              <th style={{ textAlign: "center", width: 160 }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: 220 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Đang tải dữ liệu...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: '#94a3b8' }}>Không tìm thấy yêu cầu nào.</td></tr>
            ) : requests.map((item) => {
              const isPending = String(item.status).toLowerCase() === "pending";
              return (
                <tr key={item.id}>
                  <td style={{ textAlign: "center", fontWeight: "800", color: '#94a3b8' }}>#{item.id}</td>
                  <td>
                    <div className="user-cell-premium">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.customerName || "User")}&background=random&size=64`} 
                        alt="Avatar" 
                        className="user-avatar-small" 
                      />
                      <div className="user-info-text">
                        <span className="name">{item.customerName}</span>
                        <span className="sub">ID: {item.customerId}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="amount-cell-premium negative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <ArrowDownLeft size={14} />
                      -{currency.format(item.amount)}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString("vi-VN") : "—"}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {item.requestedAt ? new Date(item.requestedAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn-view-detail"
                        onClick={() => handleViewDetail(item.id)}
                        disabled={detailLoading}
                        title="Xem chi tiết"
                        style={{ height: 36, width: 36 }}
                      >
                        <Eye size={18} />
                      </button>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="btn-action dark"
                            style={{ 
                              padding: '0 16px', 
                              fontSize: 12, 
                              background: '#10b981', 
                              height: 36, 
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: 0
                            }}
                            disabled={processing === item.id + ":complete"}
                            onClick={() => handleComplete(item.id)}
                          >
                            {processing === item.id + ":complete" ? "..." : "Hoàn tất"}
                          </button>
                          <button
                            type="button"
                            className="btn-action outline-danger"
                            style={{ 
                              padding: '0 16px', 
                              fontSize: 12, 
                              height: 36, 
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: 0
                            }}
                            disabled={processing === item.id + ":reject"}
                            onClick={() => setRejectState({ id: item.id, reason: "" })}
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
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
            Hiển thị <strong>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</strong> trong số <strong>{totalItems}</strong> yêu cầu
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

export default FinanceAdminWithdrawalRequests;
