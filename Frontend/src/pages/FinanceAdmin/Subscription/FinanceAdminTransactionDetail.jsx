import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTransactionDetail } from "../../../services/financeAdminService";
import "../financeAdminPages.css";
import { User, CreditCard, MapPin, CheckCircle2 } from "lucide-react";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const FinanceAdminTransactionDetail = () => {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getTransactionDetail(id)
      .then(setTransaction)
      .catch((err) => setError(err?.response?.data?.message ?? "Không tải được chi tiết giao dịch."))
      .finally(() => setLoading(false));
  }, [id]);

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

  const translateStatus = (status) => {
    if (!status) return "";
    const s = String(status).trim().toLowerCase();
    if (s === "pending") return "Chờ xử lý";
    if (s === "completed" || s === "success") return "Thành công";
    if (s === "failed") return "Thất bại";
    if (s === "cancelled" || s === "canceled") return "Đã hủy";
    return String(status);
  };

  const translateTransactionType = (type) => {
    if (!type) return "";
    const k = String(type).trim().toLowerCase();
    const map = {
      booking: "Đặt sân",
      eventbooking: "Sự kiện",
      refund: "Hoàn tiền",
      topup: "Nạp tiền",
      deposit: "Nạp tiền",
      withdraw: "Rút tiền",
      withdrawal: "Rút tiền",
      subscription: "Gói đăng ký",
      payout: "Thanh toán chủ sân",
    };
    return map[k] || String(type);
  };

  if (loading) {
    return (
      <section className="finance-admin-page">
        <p>Đang tải chi tiết giao dịch...</p>
      </section>
    );
  }

  if (error || !transaction) {
    return (
      <section className="finance-admin-page">
        <h2 className="finance-admin-title">Lỗi</h2>
        <p style={{ color: "#dc2626" }}>{error || "Không tìm thấy giao dịch."}</p>
        <Link to="/finance-admin/transactions" className="finance-admin-link-btn" style={{ marginTop: 20, display: "inline-block" }}>
          Quay lại
        </Link>
      </section>
    );
  }

  return (
    <section className="finance-admin-page">
      <div className="payout-header-row" style={{ marginBottom: 18 }}>
        <h2 className="finance-admin-title" style={{ margin: 0 }}>Chi tiết giao dịch #{transaction.id}</h2>
        <Link to="/finance-admin/transactions" className="finance-admin-link-btn">
          Quay lại danh sách
        </Link>
      </div>

      <div className="payout-top-grid">
        <div className="payout-card payout-payment">
          <div className="payout-card-inner">
            <div className="payout-info-left">
              <div className="payout-small-label">Thông tin giao dịch</div>
              <div className="payment-amount" style={{ color: normalizeDirectionIsIncoming(transaction.direction) ? undefined : '#ef4444' }}>
                {normalizeDirectionIsIncoming(transaction.direction) ? "+" : "-"}{currency.format(transaction.amount)}
              </div>

              <div className="payout-meta">
                <span className="payout-status-badge"><CheckCircle2 size={14} style={{ marginRight: 6 }} />{translateStatus(transaction.status)}</span>
                <div className="payout-date">Ngày tạo: <strong>{new Date(transaction.createdAt).toLocaleString("vi-VN")}</strong></div>
              </div>

              <div className="internal-note" style={{ marginTop: 12 }}>
                <div className="internal-note-title">Chi tiết</div>
                <div className="internal-note-body">
                  <div><strong>Loại giao dịch:</strong> {translateTransactionType(transaction.transactionType)}</div>
                  <div><strong>Chiều giao dịch:</strong> {translateDirection(transaction.direction)}</div>
                  <div><strong>Mô tả:</strong> {transaction.description || "Không có"}</div>
                  {transaction.referenceId && <div><strong>Mã tham chiếu:</strong> {transaction.referenceId}</div>}
                </div>
              </div>
            </div>

            <div className="payout-info-right" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/finance-admin/transactions/${transaction.id}/edit`} className="finance-admin-link-btn">Chỉnh sửa</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="payout-card payout-receiver">
          <h3 className="payout-receiver-title">Thông tin người dùng & Ngân hàng</h3>
          <div className="receiver-grid">
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><User size={14} /></div><div className="receiver-label">Họ tên</div></div><div className="receiver-value">{transaction.fullname || '—'}</div></div>
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><CreditCard size={14} /></div><div className="receiver-label">Email</div></div><div className="receiver-value">{transaction.email || '—'}</div></div>
            <div className="receiver-row"><div style={{display:'flex',alignItems:'center',gap:8}}><div className="receiver-icon"><MapPin size={14} /></div><div className="receiver-label">Số điện thoại</div></div><div className="receiver-value">{transaction.phoneNumber || '—'}</div></div>
            <div style={{ marginTop: 8, paddingTop: 8 }} />
            <div style={{ paddingTop: 6 }} className="receiver-bank">
              <div style={{ margin: '8px 0 6px 0', color: '#6b7280', fontWeight: 800 }}>Thông tin ngân hàng:</div>
              {transaction.bankAccountNumber ? (
                <div className="internal-note-body">
                  <div><strong>Ngân hàng:</strong> {transaction.bankName}</div>
                  <div><strong>Số tài khoản:</strong> {transaction.bankAccountNumber}</div>
                  <div><strong>Chủ tài khoản:</strong> {transaction.bankaccountHolder}</div>
                </div>
              ) : (
                <div className="internal-note" style={{ marginTop: 6 }}>
                  <div style={{ color: '#6b7280' }}>Không có thông tin ngân hàng</div>
                </div>
              )}
            </div>
          </div>
          <div className="receiver-footer">
            <div className="receiver-verified">● Verified Destination</div>
            <Link to="#" className="receiver-history">Xem lịch sử giao dịch người nhận</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinanceAdminTransactionDetail;
