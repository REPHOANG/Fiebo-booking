import React, { useEffect, useState } from "react";
import { getAllReportsAdmin, respondToReport } from "../../../services/adminService";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MessageSquare, 
  History, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  BarChart3,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "../adminPages.css";
import "./AdminReports.css";

const STATUS_MAP = {
  0: { label: "Chờ xử lý", color: "#f59e0b", bgColor: "#fef3c7", icon: <Clock size={14} /> },
  1: { label: "Đã phản hồi", color: "#10b981", bgColor: "#d1fae5", icon: <CheckCircle2 size={14} /> },
};

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Detail modal state
  const [reportDetail, setReportDetail] = useState(null);

  // Reply modal state
  const [replyState, setReplyState] = useState(null); // { id, response }
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      // Also update detail modal if open
      if (reportDetail?.id === replyState.id) {
        setReportDetail(prev => ({ 
          ...prev, 
          status: 1, 
          responseContent: replyState.response, 
          respondedAt: new Date().toISOString() 
        }));
      }
    } catch (err) {
      alert(err?.response?.data?.message ?? "Phản hồi thất bại.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchStatus = filterStatus === "all" || String(r.status) === filterStatus;
    const matchSearch =
      !search.trim() ||
      (r.venueName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.content ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(r.id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(r.bookingId ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    if (filteredReports.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    const headers = ["ID", "Tên sân", "Mã Booking", "Ngày gửi", "Trạng thái", "Nội dung"];
    const csvRows = [
      headers.join(","),
      ...filteredReports.map(r => [
        `RP-${r.id}`,
        `"${(r.venueName || "").replace(/"/g, '""')}"`,
        `BK-${r.bookingId}`,
        new Date(r.createdAt).toLocaleString("vi-VN"),
        STATUS_MAP[r.status]?.label || "N/A",
        `"${(r.content || "").replace(/"/g, '""')}"`
      ].join(","))
    ];

    const csvString = "\ufeff" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao-cao-Fiebo-${new Date().toLocaleDateString("vi-VN")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = reports.filter((r) => r.status === 0).length;
  const respondedCount = reports.filter((r) => r.status === 1).length;

  return (
    <div className="reports-container">
      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {reportDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setReportDetail(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="detail-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-title">
                  <h3>Chi tiết báo cáo #RP-{reportDetail.id}</h3>
                  <div className="status-badge" style={{ backgroundColor: STATUS_MAP[reportDetail.status]?.bgColor, color: STATUS_MAP[reportDetail.status]?.color }}>
                    {STATUS_MAP[reportDetail.status]?.label}
                  </div>
                </div>
                <button className="close-btn" onClick={() => setReportDetail(null)}>&times;</button>
              </div>
              <div className="modal-body detail-grid">
                <div className="detail-item full-width">
                  <span className="detail-label">Tiêu đề báo cáo</span>
                  <span className="detail-value" style={{ fontSize: 18, color: "var(--primary-blue)" }}>{reportDetail.title || "Không có tiêu đề"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Người báo cáo</span>
                  <span className="detail-value">{reportDetail.customerName || `Khách hàng #${reportDetail.customerId}`}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sân bị báo cáo</span>
                  <span className="detail-value">{reportDetail.venueName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mã Booking</span>
                  <span className="detail-value text-primary">BK-{reportDetail.bookingId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Thời gian gửi</span>
                  <span className="detail-value">{new Date(reportDetail.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                
                <div className="detail-item full-width">
                  <span className="detail-label">Nội dung báo cáo</span>
                  <div className="content-box">
                    {reportDetail.content}
                  </div>
                </div>

                {reportDetail.status === 1 && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Phản hồi từ hệ thống</span>
                    <div className="content-box response-box">
                      <p>{reportDetail.responseContent}</p>
                      <span className="response-time">
                        <Clock size={12} />
                        Phản hồi lúc: {new Date(reportDetail.respondedAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setReportDetail(null)}>Đóng</button>
                {reportDetail.status === 0 && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setReplyState({ id: reportDetail.id, content: reportDetail.content, response: "" });
                    }}
                  >
                    Phản hồi ngay
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reply Modal ── */}
      <AnimatePresence>
        {replyState && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="reply-modal"
            >
              <div className="modal-header">
                <h3>Phản hồi báo cáo #RP-{replyState.id}</h3>
                <button className="close-btn" onClick={() => setReplyState(null)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="report-content-preview">
                  <span className="preview-label">NỘI DUNG BÁO CÁO</span>
                  <p>{replyState.content}</p>
                </div>
                <div className="input-group">
                  <label>Nội dung phản hồi <span className="required">*</span></label>
                  <textarea
                    placeholder="Nhập phản hồi của bạn cho khách hàng..."
                    value={replyState.response}
                    onChange={(e) => setReplyState((s) => ({ ...s, response: e.target.value }))}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setReplyState(null)}>Hủy</button>
                <button 
                  className="btn-primary" 
                  onClick={handleReplySubmit}
                  disabled={replySubmitting}
                >
                  {replySubmitting ? "Đang gửi..." : "Gửi phản hồi"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="reports-header">
        <div className="pending-alert-card">
          <div className="alert-icon">
            <AlertTriangle color="#f97316" size={24} />
          </div>
          <div className="alert-info">
            <span className="alert-label">CHỜ PHẢN HỒI</span>
            <div className="alert-value">
              <span className="count">{pendingCount}</span>
              <span className="text">Báo cáo mới</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Card ── */}
      <div className="main-content-card">
        {/* Tabs & Top Actions */}
        <div className="table-header-actions">
          <div className="tabs">
            <button 
              className={`tab-item ${filterStatus === "all" ? "active" : ""}`}
              onClick={() => { setFilterStatus("all"); setCurrentPage(1); }}
            >
              Tất cả
            </button>
            <button 
              className={`tab-item ${filterStatus === "0" ? "active" : ""}`}
              onClick={() => { setFilterStatus("0"); setCurrentPage(1); }}
            >
              Chờ xử lý ({pendingCount})
            </button>
            <button 
              className={`tab-item ${filterStatus === "1" ? "active" : ""}`}
              onClick={() => { setFilterStatus("1"); setCurrentPage(1); }}
            >
              Đã phản hồi ({respondedCount})
            </button>
          </div>
          <div className="header-buttons">
            <div className="filter-group">
              <button 
                className={`btn-filter ${isFilterOpen ? "active" : ""}`}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter size={18} />
                Bộ lọc nâng cao
              </button>

              {isFilterOpen && (
                <>
                  <div className="filter-overlay" onClick={() => setIsFilterOpen(false)} />
                  <div className="filter-dropdown">
                    <div className="dropdown-label">TRẠNG THÁI</div>
                    <div 
                      className={`filter-option ${filterStatus === "all" ? "active" : ""}`}
                      onClick={() => { setFilterStatus("all"); setIsFilterOpen(false); setCurrentPage(1); }}
                    >
                      <span className="dot all"></span> Tất cả
                    </div>
                    <div 
                      className={`filter-option ${filterStatus === "0" ? "active" : ""}`}
                      onClick={() => { setFilterStatus("0"); setIsFilterOpen(false); setCurrentPage(1); }}
                    >
                      <span className="dot pending"></span> Chờ xử lý
                    </div>
                    <div 
                      className={`filter-option ${filterStatus === "1" ? "active" : ""}`}
                      onClick={() => { setFilterStatus("1"); setIsFilterOpen(false); setCurrentPage(1); }}
                    >
                      <span className="dot success"></span> Đã phản hồi
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="btn-export" onClick={handleExport}>
              <Download size={18} />
              Xuất báo cáo
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tiêu đề, nội dung báo cáo hoặc mã booking..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="reports-table">
            <thead>
              <tr>
                <th width="100">ID</th>
                <th>Tên sân</th>
                <th>Booking</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th width="120">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-loader">Đang tải dữ liệu...</td>
                </tr>
              ) : currentReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">Không tìm thấy báo cáo nào phù hợp.</td>
                </tr>
              ) : currentReports.map((report) => (
                <React.Fragment key={report.id}>
                  <tr>
                    <td className="report-id">#RP-{report.id}</td>
                    <td className="venue-name">{report.venueName || "N/A"}</td>
                    <td className="booking-id">BK-{report.bookingId}</td>
                    <td className="report-date">
                      <div className="date-time">
                        <span className="time">{report.createdAt ? new Date(report.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                        <span className="date">{report.createdAt ? new Date(report.createdAt).toLocaleDateString("vi-VN") : "--/--/----"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="status-badge" style={{ backgroundColor: STATUS_MAP[report.status]?.bgColor, color: STATUS_MAP[report.status]?.color }}>
                        <span className="status-dot" style={{ backgroundColor: STATUS_MAP[report.status]?.color }}></span>
                        {STATUS_MAP[report.status]?.label}
                      </div>
                    </td>
                    <td className="actions">
                      <div className="action-buttons">
                        <button 
                          className="action-btn view-btn" 
                          onClick={() => setReportDetail(report)}
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        {report.status === 0 ? (
                          <button 
                            className="action-btn reply-btn" 
                            onClick={() => setReplyState({ id: report.id, content: report.content, response: "" })}
                            title="Phản hồi"
                          >
                            <MessageSquare size={18} />
                          </button>
                        ) : (
                          <button className="action-btn history-btn" title="Lịch sử">
                            <History size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination-footer">
          <span className="pagination-info">
            Hiển thị {currentReports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredReports.length)} của {filteredReports.length} báo cáo
          </span>
          <div className="pagination-controls">
            <button 
              className="page-btn" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i + 1} 
                className={`page-number ${currentPage === i + 1 ? "active" : ""}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button 
              className="page-btn" 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
