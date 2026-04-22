import React, { useEffect, useState } from "react";
import {
  completeWithdrawalRequest,
  getWithdrawalRequests,
  rejectWithdrawalRequest,
} from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminProcessWithdrawalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  // rejectState: { id, reason }
  const [rejectState, setRejectState] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getWithdrawalRequests({ status: "Pending" })
      .then(setRequests)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplete = async (id) => {
    setProcessing(id + ":complete");
    try {
      await completeWithdrawalRequest(id);
      setRequests((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: "Completed" } : item)
      );
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
    } catch (err) {
      alert(err?.response?.data?.message ?? "Từ chối thất bại.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <section className="finance-admin-page">
      <h2 className="finance-admin-title">Xử lý yêu cầu rút tiền</h2>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {/* Reject reason modal */}
      {rejectState && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 24, width: 400,
            display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ margin: 0 }}>Lý do từ chối</h3>
            <textarea
              style={{
                width: "100%", minHeight: 100, borderRadius: 10,
                border: "1px solid #d1d5db", padding: "10px 12px",
                fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box",
              }}
              placeholder="Nhập lý do từ chối..."
              value={rejectState.reason}
              onChange={(e) => setRejectState((s) => ({ ...s, reason: e.target.value }))}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="finance-admin-link-btn"
                onClick={() => setRejectState(null)}
              >
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

      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Khách hàng</th>
              <th>Ngân hàng</th>
              <th>Số tài khoản</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có yêu cầu đang chờ xử lý</td></tr>
            ) : requests.map((item) => {
              const isPending = item.status === "Pending";
              return (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.customerName}</td>
                  <td>{item.bankName || "—"}</td>
                  <td>{item.bankAccountNumber || "—"}</td>
                  <td>{currency.format(item.amount)}</td>
                  <td>{item.status}</td>
                  <td>
                    <div className="finance-admin-item-actions">
                      <button
                        type="button"
                        className="finance-admin-link-btn"
                        disabled={!isPending || processing === item.id + ":complete"}
                        onClick={() => handleComplete(item.id)}
                      >
                        {processing === item.id + ":complete" ? "Đang xử lý..." : "Hoàn tất"}
                      </button>
                      <button
                        type="button"
                        className="finance-admin-link-btn"
                        style={isPending ? { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" } : {}}
                        disabled={!isPending || processing === item.id + ":reject"}
                        onClick={() => setRejectState({ id: item.id, reason: "" })}
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminProcessWithdrawalRequests;
