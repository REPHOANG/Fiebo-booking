import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { User, CreditCard, MapPin, CheckCircle2 } from "lucide-react";
import { getPayoutDetail } from "../../../services/financeAdminService";
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
      return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) {
      return String(d).slice(0, 10);
    }
  };

  if (loading) {
    return (
      <section className="finance-admin-page">
        <p>Đang tải chi tiết thanh toán...</p>
      </section>
    );
  }

  if (error || !payout) {
    return (
      <section className="finance-admin-page">
        <h2 className="finance-admin-title">Lỗi</h2>
        <p style={{ color: "#dc2626" }}>{error || "Không tìm thấy thanh toán."}</p>
        <button onClick={() => window.history.back()} className="finance-admin-link-btn" style={{ marginTop: 20 }}>
          Quay lại
        </button>
      </section>
    );
  }

  return (
    <section className="finance-admin-page">
      <div className="payout-header-row">
        <div>
          <h2 className="finance-admin-title" style={{ margin: 0 }}>Chi tiết Payout #{payout.payoutId || payout.id}</h2>
          <p className="finance-admin-subtitle">Chi tiết thanh toán và danh sách booking liên quan</p>
        </div>
        <div>
          <button onClick={() => window.history.back()} className="finance-admin-link-btn">Quay lại</button>
        </div>
      </div>

      <div className="payout-top-grid">
        <div className="payout-card payout-payment">
          <div className="payout-card-inner">
            <div className="payout-info-left">
              <div className="payout-top-labels">
                <div className="payout-small-label">TOTAL AMOUNT</div>
                <div className="payout-source-icon" aria-hidden />
              </div>
              <div className="payment-amount">{currency.format(payout.amount)}</div>
              <div className="payout-meta">
                <span className={`payout-status-badge`}> <CheckCircle2 size={14} style={{ marginRight: 6 }} /> {payout.status || "—"}</span>
                <div className="payout-date">Payout date: <strong>{formatPayoutDate(payout)}</strong></div>
              </div>
              <div className="internal-note" style={{ marginTop: 12 }}>
                <div className="internal-note-title">INTERNAL NOTE</div>
                <div className="internal-note-body">{payout.internalNote || payout.note || "—"}</div>
              </div>
            </div>
            <div className="payout-info-right" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="finance-admin-link-btn">Xuất hóa đơn</button>
                <button className="finance-admin-link-btn" style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }}>Tải báo cáo</button>
              </div>
            </div>
          </div>
        </div>

        <div className="payout-card payout-receiver">
          <h3 className="payout-receiver-title">Receiver Account</h3>
          <div className="receiver-grid">
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><User size={14} /></div><div className="receiver-label">Account holder</div></div><div className="receiver-value">{payout.ownerName || "—"}</div></div>
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><CreditCard size={14} /></div><div className="receiver-label">Bank name</div></div><div className="receiver-value">{payout.bankAccountName || "—"}</div></div>
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><CreditCard size={14} /></div><div className="receiver-label">Account number</div></div><div className="receiver-value">{maskAccount(payout.bankAccountNumber)}</div></div>
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><MapPin size={14} /></div><div className="receiver-label">Branch</div></div><div className="receiver-value">{payout.bankBranch || payout.bankBranchName || "—"}</div></div>
          </div>
          <div className="receiver-footer">
            <div className="receiver-verified">● Verified Destination</div>
            <Link to="#" className="receiver-history">Xem lịch sử giao dịch người nhận</Link>
          </div>
        </div>
      </div>

      <div className="payout-booking-list">
        <h3 className="finance-admin-title" style={{ fontSize: 18 }}>Booking List</h3>
        <div className="finance-admin-table-wrap">
          <table className="finance-admin-table">
            <thead>
              <tr>
                <th>Cơ sở</th>
                <th>Loại</th>
                <th>Mã tham chiếu</th>
                <th>Ngày</th>
                <th style={{ textAlign: "right" }}>Số tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {!payout.bookings || payout.bookings.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có chi tiết đặt sân.</td></tr>
              ) : payout.bookings.map((b, idx) => (
                <tr key={idx}>
                  <td>{b.venueName}</td>
                  <td>{b.payoutDetailType}</td>
                  <td>{b.bookingId ? `#BK-${b.bookingId}` : (b.eventId ? `#EV-${b.eventId}` : "—")}</td>
                  <td>{b.date ? new Date(b.date).toLocaleDateString("vi-VN") : "—"}</td>
                  <td style={{ textAlign: "right" }}>{currency.format(b.amount)}</td>
                  <td><span className="finance-admin-status finance-admin-status-reconciled">{b.status || "Success"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="payout-summary-row">
          <div />
          <div className="payout-summary">Tổng cộng cộng dồn: <strong style={{ color: "#059669" }}>{currency.format(payout.amount)}</strong></div>
        </div>
      </div>
    </section>
  );
};

export default FinanceAdminPayoutDetail;
