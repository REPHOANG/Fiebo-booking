import React, { useEffect, useState } from "react";
import { getAllReportsAdmin, respondToReport } from "../../../services/adminService";
import "../adminPages.css";

const STATUS_MAP = {
  0: { label: "Chờ xử lý", cls: "admin-status-pending" },
  1: { label: "Đã phản hồi", cls: "admin-status-approved" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "0", label: "Chờ xử lý" },
  { value: "1", label: "Đã phản hồi" },
];

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  // Reply modal state
  const [replyState, setReplyState] = useState(null); // { id, response }
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Expanded row
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAllReportsAdmin()
      .then(setReports)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được danh sách báo cáo."))
      .finally(() => setLoading(false));
  }, []);

  const handleReplySubmit = async () => {
    if (!replyState?.response?.trim()) {
      alert("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setReplySubmitting(true);
    try {
      await respondToReport(replyState.id, replyState.response);
      setReports((prev) =>
        prev.map((r) =>
          r.id === replyState.id
            ? { ...r, status: 1, responseContent: replyState.response, respondedAt: new Date().toISOString() }
            : r
        )
      );
      setReplyState(null);
    } catch (err) {
      alert(err?.response?.data?.message ?? "Phản hồi thất bại.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const filtered = reports.filter((r) => {
    const matchStatus = filterStatus === "all" || String(r.status) === filterStatus;
    const matchSearch =
      !search.trim() ||
      (r.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.content ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(r.customerId ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = reports.filter((r) => r.status === 0).length;

  return (
    <section className="admin-page">
      {/* ── Reply Modal ── */}
      {replyState && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: 480,
            display: "flex", flexDirection: "column", gap: 16,
            boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Phản hồi báo cáo #{replyState.id}</h3>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid #d1d5db" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>NỘI DUNG BÁO CÁO</p>
              <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>{replyState.content}</p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Nội dung phản hồi <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                className="admin-textarea"
                style={{ boxSizing: "border-box", fontSize: 14 }}
                placeholder="Nhập phản hồi của bạn cho khách hàng..."
                value={replyState.response}
                onChange={(e) => setReplyState((s) => ({ ...s, response: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setReplyState(null)}
                disabled={replySubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleReplySubmit}
                disabled={replySubmitting}
              >
                {replySubmitting ? "Đang gửi..." : "Gửi phản hồi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 className="admin-title">Danh sách báo cáo</h2>
          <p className="admin-subtitle">Quản lý và phản hồi các báo cáo từ khách hàng</p>
        </div>
        {pendingCount > 0 && (
          <div style={{
            background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10,
            padding: "8px 16px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#92400e" }}>{pendingCount}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>Chờ phản hồi</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm kiếm theo tiêu đề, nội dung..."
          style={{ minWidth: 260, flex: 1 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`admin-venue-filter${filterStatus === opt.value ? " is-active" : ""}`}
              onClick={() => setFilterStatus(opt.value)}
            >
              {opt.label}
              {opt.value !== "all" && (
                <span style={{
                  marginLeft: 6, background: "rgba(255,255,255,0.35)",
                  borderRadius: 999, padding: "1px 7px", fontSize: 11,
                }}>
                  {reports.filter((r) => String(r.status) === opt.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>}

      {/* ── Table ── */}
      <div className="admin-table-wrap">
        <table className="admin-table" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: 70, borderBottom: "2px solid #e5e7eb", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>ID</th>
              <th style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>Tiêu đề</th>
              <th style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>Nội dung</th>
              <th style={{ textAlign: "center", width: 100, borderBottom: "2px solid #e5e7eb", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>Booking</th>
              <th style={{ textAlign: "center", width: 170, borderBottom: "2px solid #e5e7eb", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>Ngày gửi</th>
              <th style={{ textAlign: "center", width: 150, borderBottom: "2px solid #e5e7eb", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>Trạng thái</th>
              <th style={{ textAlign: "center", width: 160, borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Đang tải...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  {reports.length === 0 ? "Không có báo cáo nào." : "Không tìm thấy kết quả phù hợp."}
                </td>
              </tr>
            ) : filtered.map((item) => {
              const statusInfo = STATUS_MAP[item.status] ?? { label: String(item.status), cls: "" };
              const isExpanded = expanded === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr
                    style={{ cursor: "pointer", backgroundColor: isExpanded ? "#f0fdf4" : undefined }}
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                  >
                    <td style={{ textAlign: "center", fontWeight: 600, border: "1px solid #f0f0f0" }}>{item.id}</td>
                    <td style={{ border: "1px solid #f0f0f0", fontWeight: 500, maxWidth: 200 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title || "—"}
                      </span>
                    </td>
                    <td style={{ border: "1px solid #f0f0f0", maxWidth: 280 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: 13 }}>
                        {item.content || "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #f0f0f0" }}>
                      #{item.bookingId}
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #f0f0f0", fontSize: 13 }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "—"}
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #f0f0f0" }}>
                      <span className={`admin-status ${statusInfo.cls}`}>{statusInfo.label}</span>
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #f0f0f0" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          type="button"
                          className="admin-btn"
                          style={{ padding: "4px 10px", fontSize: 12, borderRadius: 8 }}
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                        >
                          {isExpanded ? "Thu gọn" : "Xem"}
                        </button>
                        {item.status === 0 && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            style={{ padding: "4px 10px", fontSize: 12, borderRadius: 8 }}
                            onClick={() => setReplyState({ id: item.id, content: item.content, response: "" })}
                          >
                            Phản hồi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ── Expanded detail row ── */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div style={{
                          padding: "16px 24px",
                          background: "#f9fafb",
                          borderTop: "1px solid #e5e7eb",
                          borderBottom: "1px solid #e5e7eb",
                          display: "grid",
                          gridTemplateColumns: item.status === 1 ? "1fr 1fr" : "1fr",
                          gap: 24,
                        }}>
                          <div>
                            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nội dung báo cáo đầy đủ</p>
                            <p style={{ margin: "0 0 12px", lineHeight: 1.6, color: "#374151" }}>{item.content}</p>
                            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                              Khách hàng ID: <strong>{item.customerId}</strong> · Booking: <strong>#{item.bookingId}</strong>
                            </p>
                          </div>
                          {item.status === 1 && (
                            <div style={{ borderLeft: "3px solid #6ee7b7", paddingLeft: 16 }}>
                              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phản hồi của Admin</p>
                              <p style={{ margin: "0 0 12px", lineHeight: 1.6, color: "#374151" }}>
                                {item.responseContent || "—"}
                              </p>
                              {item.respondedAt && (
                                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                                  Phản hồi lúc: {new Date(item.respondedAt).toLocaleString("vi-VN")}
                                </p>
                              )}
                            </div>
                          )}
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

      <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
        Hiển thị {filtered.length} / {reports.length} báo cáo
      </p>
    </section>
  );
};

export default AdminReports;
