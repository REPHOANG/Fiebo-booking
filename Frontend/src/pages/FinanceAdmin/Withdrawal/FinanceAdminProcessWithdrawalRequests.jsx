import React, { useEffect, useState } from "react";
import {
  completeWithdrawalRequest,
  getWithdrawalRequestDetail,
  getWithdrawalRequests,
  rejectWithdrawalRequest,
} from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const renderStatusBadge = (status) => {
  if (!status) return null;
  const s = String(status).trim().toLowerCase();
  if (s === "pending") return <span className="finance-admin-status finance-admin-status-pending">Chờ xử lý</span>;
  if (s === "success" || s === "completed") return <span className="finance-admin-status finance-admin-status-reconciled">Thành công</span>;
  if (s === "failed") return <span className="finance-admin-status finance-admin-status-failed">Thất bại</span>;
  if (s === "rejected") return <span className="finance-admin-status finance-admin-status-failed">Từ chối</span>;
  return <span className="finance-admin-status">{String(status)}</span>;
};

const FinanceAdminProcessWithdrawalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [rejectState, setRejectState] = useState(null); // { id, reason }
  const [detail, setDetail] = useState(null); // expanded detail view
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getWithdrawalRequests({ status: "Pending", page, pageSize })
      .then((data) => {
        setRequests(data.items ?? []);
        setTotalItems(data.totalItems ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleViewDetail = async (id) => {
    if (detail?.id === id) { setDetail(null); return; }
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

  const handleComplete = async (id) => {
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
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Xử lý yêu cầu rút tiền</h2>

      {/* ── Reject Modal ── */}
      {rejectState && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: 440,
            display: "flex", flexDirection: "column", gap: 16,
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Lý do từ chối</h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              Lý do này sẽ được gửi thông báo đến khách hàng và số tiền sẽ được hoàn trả vào ví.
            </p>
            <textarea
              style={{
                width: "100%", minHeight: 100, borderRadius: 10,
                border: "1px solid #d1d5db", padding: "10px 12px",
                fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box",
              }}
              placeholder="Nhập lý do từ chối..."
              value={rejectState.reason}
              onChange={(e) => setRejectState((s) => ({ ...s, reason: e.target.value }))}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="finance-admin-link-btn" onClick={() => setRejectState(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="finance-admin-link-btn"
                style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
                onClick={handleRejectConfirm}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

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
              <th style={{ textAlign: "center", width: 220 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}>Đang tải...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Không có yêu cầu đang chờ xử lý</td></tr>
            ) : requests.map((item) => {
              const isPending = String(item.status).toLowerCase() === "pending";
              const isExpanded = detail?.id === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr style={{ backgroundColor: isExpanded ? "#f0fdf4" : undefined }}>
                    <td style={{ textAlign: "center", fontWeight: 500 }}>{item.id}</td>
                    <td>{item.customerName}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                      -{currency.format(item.amount)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.requestedAt ? new Date(item.requestedAt).toLocaleString("vi-VN") : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>{renderStatusBadge(item.status)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          type="button"
                          className="finance-admin-link-btn"
                          style={{ padding: "4px 10px", fontSize: 13, backgroundColor: "#f3f4f6" }}
                          onClick={() => handleViewDetail(item.id)}
                          disabled={detailLoading}
                        >
                          {isExpanded ? "Thu gọn" : "Chi tiết"}
                        </button>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="finance-admin-link-btn"
                              style={{ padding: "4px 10px", fontSize: 13, background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }}
                              disabled={processing === item.id + ":complete"}
                              onClick={() => handleComplete(item.id)}
                            >
                              {processing === item.id + ":complete" ? "..." : "Hoàn tất"}
                            </button>
                            <button
                              type="button"
                              className="finance-admin-link-btn"
                              style={{ padding: "4px 10px", fontSize: 13, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
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

                  {/* ── Expanded detail row ── */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderTop: "none" }}>
                        <div style={{
                          margin: "0 0 4px 0", padding: "16px 24px",
                          background: "#f9fafb", borderTop: "1px solid #e5e7eb",
                          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px",
                        }}>
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>THÔNG TIN NGÂN HÀNG</p>
                            <p style={{ margin: "0 0 2px" }}><strong>Ngân hàng:</strong> {detail?.bankName || "—"}</p>
                            <p style={{ margin: "0 0 2px" }}><strong>Số TK:</strong> {detail?.bankAccountNumber || "—"}</p>
                            <p style={{ margin: 0 }}><strong>Chủ TK:</strong> {detail?.accountHolderName || "—"}</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>SỐ DƯ & MÔ TẢ</p>
                            <p style={{ margin: "0 0 2px" }}><strong>Số dư ví:</strong> {currency.format(detail?.walletBalance ?? 0)}</p>
                            <p style={{ margin: 0 }}><strong>Mô tả:</strong> {detail?.description || "—"}</p>
                          </div>
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>XỬ LÝ</p>
                            {detail?.processedBy && <p style={{ margin: "0 0 2px" }}><strong>Người xử lý:</strong> {detail.processedBy}</p>}
                            {detail?.processedAt && <p style={{ margin: "0 0 2px" }}><strong>Ngày xử lý:</strong> {new Date(detail.processedAt).toLocaleString("vi-VN")}</p>}
                            {detail?.rejectionReason && (
                              <p style={{ margin: 0, color: "#b91c1c" }}><strong>Lý do từ chối:</strong> {detail.rejectionReason}</p>
                            )}
                            {!detail?.processedBy && !detail?.rejectionReason && (
                              <p style={{ margin: 0, color: "#6b7280" }}>Chưa xử lý</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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

export default FinanceAdminProcessWithdrawalRequests;
