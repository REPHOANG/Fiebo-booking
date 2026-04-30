import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  ChevronRight,
  Clock,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { getPayoutDetail, completePayout } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminPayoutDetail = () => {
  const { id } = useParams();
  const [payout, setPayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getPayoutDetail(id)
      .then(setPayout)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được chi tiết thanh toán."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleComplete = async () => {
    const result = await Swal.fire({
      title: 'Xác nhận thanh toán',
      text: "Bạn xác nhận đã hoàn tất chuyển khoản cho chủ sân?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
      await completePayout(payout.payoutId || payout.id);
      Swal.fire({
        title: 'Thành công!',
        text: 'Thanh toán đã được hoàn tất.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setPayout(prev => ({ ...prev, status: 'Completed' }));
    } catch (err) {
      Swal.fire({
        title: 'Lỗi!',
        text: err?.response?.data?.message ?? "Xử lý thất bại.",
        icon: 'error'
      });
    }
  };

  const maskAccount = (num) => {
    if (!num) return "—";
    const s = String(num).replace(/\s+/g, "");
    if (s.length <= 8) return s;
    const first = s.slice(0, 4);
    const last = s.slice(-4);
    return `${first} **** ${last}`;
  };

  const formatPayoutDate = (p) => {
    const d = p?.payoutDate || p?.date || p?.createdAt || p?.createdOn || p?.created;
    if (!d) return "—";
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleString("vi-VN", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(d).slice(0, 10);
    }
  };

  if (loading) {
    return (
      <div className="payout-detail-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Clock className="animate-spin" size={48} style={{ color: '#3b82f6', marginBottom: 16 }} />
          <p style={{ color: '#64748b', fontWeight: 500 }}>Đang tải chi tiết thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error || !payout) {
    return (
      <div className="payout-detail-container">
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#fee2e2', color: '#ef4444', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Receipt size={32} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Đã xảy ra lỗi</h2>
          <p style={{ color: "#64748b", marginBottom: 32 }}>{error || "Không tìm thấy thanh toán."}</p>
          <button onClick={() => window.history.back()} className="btn-action dark" style={{ padding: '12px 24px' }}>
            <ArrowLeft size={18} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payout-detail-container">
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>Chi tiết thanh toán #{payout.payoutId || payout.id}</h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 15 }}>Chi tiết thanh toán và danh sách booking liên quan</p>
        </div>
        <button onClick={() => window.history.back()} className="btn-action outline" style={{ background: '#fff', padding: '10px 20px', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Quay lại
        </button>
      </div>

      {/* Top Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginBottom: 32 }}>
        {/* Left Card: Transaction Summary */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Tổng quan giao dịch</span>
            <span className="status-badge-pill success" style={{ fontSize: 11, padding: '4px 12px', fontWeight: 700 }}>
              {payout.status?.toLowerCase() === 'completed' || payout.status?.toLowerCase() === 'success' ? "THÀNH CÔNG" : payout.status?.toUpperCase() || "THÀNH CÔNG"}
            </span>
          </div>
          
          <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 8 }}>TỔNG SỐ TIỀN</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: '#2563eb', letterSpacing: -1 }}>{currency.format(payout.amount)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '24px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>NGÀY THANH TOÁN</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{formatPayoutDate(payout)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>MÃ GIAO DỊCH</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>TXN-{payout.payoutId || payout.id}</div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 12 }}>GHI CHÚ NỘI BỘ</div>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px', border: '1px solid #f1f5f9', color: '#475569', fontSize: 15, fontStyle: 'italic', lineHeight: 1.6 }}>
                "{payout.internalNote || payout.note || "Thanh toán định kỳ cho đối tác vận hành. Đã đối soát qua hệ thống kế toán."}"
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {String(payout.status).toLowerCase() === 'pending' && (
                <button 
                  className="btn-action dark" 
                  style={{ flex: 1, padding: '14px', background: '#10b981' }}
                  onClick={handleComplete}
                >
                  <CheckCircle2 size={20} /> Hoàn tất thanh toán
                </button>
              )}
              <button className="btn-action dark" style={{ flex: 1, padding: '14px', background: '#2563eb' }}>
                <Receipt size={20} /> Xuất hóa đơn
              </button>
              <button className="btn-action outline" style={{ flex: 1, padding: '14px' }}>
                <Download size={20} /> Tải báo cáo
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Receiver Account */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Tài khoản thụ hưởng</span>
          </div>

          <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>CHỦ TÀI KHOẢN</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{payout.ownerName || "Phạm Thị Sàn"}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>NGÂN HÀNG</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>{payout.bankAccountName || payout.bankName || "Vietcombank"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>SỐ TÀI KHOẢN</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b', letterSpacing: 1 }}>{maskAccount(payout.bankAccountNumber)}</div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>CHI NHÁNH</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>{payout.bankBranch || payout.bankBranchName || "Chi nhánh Nam Sài Gòn, TP.HCM"}</div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
              <Link to="#" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: '#2563eb', fontWeight: 700, fontSize: 14 }}>
                Xem lịch sử giao dịch người nhận <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Booking List */}
      <div className="table-card-premium" style={{ padding: '0 0 24px 0' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Danh sách Booking</h3>
          <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6 }}>{payout.bookings?.length || 0} MỤC</span>
        </div>
        
        <table className="table-premium">
          <thead>
            <tr>
              <th>Cơ sở</th>
              <th>Loại</th>
              <th>Mã tham chiếu</th>
              <th>Ngày</th>
              <th style={{ textAlign: "right" }}>Số tiền</th>
              <th style={{ textAlign: "center" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {!payout.bookings || payout.bookings.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Không có chi tiết đặt sân nào trong đợt này.</td></tr>
            ) : payout.bookings.map((b, idx) => (
              <tr key={idx}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <Building2 size={18} />
                    </div>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{b.venueName}</span>
                  </div>
                </td>
                <td>
                  <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                    {b.payoutDetailType || "Bóng đá"}
                  </span>
                </td>
                <td>
                  <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                    {b.bookingId ? `BK-2023-${String(b.bookingId).padStart(3, '0')}` : (b.eventId ? `EV-2023-${String(b.eventId).padStart(3, '0')}` : "BK-2023-001")}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>{b.date ? new Date(b.date).toLocaleDateString("vi-VN") : "20/10/2023"}</div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{currency.format(b.amount)}</span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className="status-badge-pill success" style={{ fontSize: 11, padding: '4px 12px' }}>
                    {b.status?.toLowerCase() === 'completed' || b.status?.toLowerCase() === 'success' ? "HOÀN TẤT" : b.status?.toUpperCase() || "HOÀN TẤT"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper for generic icon since Building2 wasn't imported
const Building2 = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M16 18h.01"/></svg>
);

export default FinanceAdminPayoutDetail;
