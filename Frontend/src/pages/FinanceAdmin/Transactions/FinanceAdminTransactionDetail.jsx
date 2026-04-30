import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTransactionDetail } from "../../../services/financeAdminService";
import "../financeAdminPages.css";
import { 
  User, 
  CreditCard, 
  CheckCircle2, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

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
      .then((data) => {
        const normalized = {
          ...data,
          id: data?.id ?? data?.Id,
          amount: Number(data?.amount ?? data?.Amount ?? 0),
          status: data?.status ?? data?.Status,
          createdAt: data?.createdAt ?? data?.CreatedAt,
          direction: data?.direction ?? data?.Direction,
          transactionType: data?.transactionType ?? data?.TransactionType,
          description: data?.description ?? data?.Description,
          referenceId: data?.referenceId ?? data?.ReferenceId,
          paymentMethod: data?.paymentMethod ?? data?.PaymentMethod,
          fullname: data?.fullname ?? data?.Fullname ?? data?.fullName ?? data?.FullName,
          email: data?.email ?? data?.Email,
          phoneNumber: data?.phoneNumber ?? data?.PhoneNumber,
          userId: data?.userId ?? data?.UserId,
          avatarUrl: data?.avatarUrl ?? data?.AvatarUrl,
          bankName: data?.bankName ?? data?.BankName,
          bankAccountNumber: data?.bankAccountNumber ?? data?.BankAccountNumber,
          bankaccountHolder: data?.bankaccountHolder ?? data?.BankaccountHolder ?? data?.accountHolderName ?? data?.AccountHolderName,
        };
        setTransaction(normalized);
      })
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
    if (s === "pending") return "Đang xử lý";
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
      <div className="payout-detail-container">
        <p>Đang tải chi tiết giao dịch...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="payout-detail-container">
        <h2 className="finance-admin-title">Lỗi</h2>
        <p style={{ color: "#dc2626" }}>{error || "Không tìm thấy giao dịch."}</p>
        <Link to="/finance/transactions" className="btn-premium outline" style={{ marginTop: 20, display: "inline-flex" }}>
          <ArrowLeft size={18} /> Quay lại
        </Link>
      </div>
    );
  }

  const isIncoming = normalizeDirectionIsIncoming(transaction.direction);

  return (
    <div className="payout-detail-container">
      {/* Header Section */}
      <header className="payout-header-section">
        <div className="header-left-group">
          <Link to="/finance/transactions" className="back-btn-circle">
            <ArrowLeft size={20} />
          </Link>
          <div className="header-title-area">
            <h2>Chi tiết giao dịch #{transaction.id}</h2>
          </div>
        </div>
      </header>

      <div className="payout-main-grid">
        {/* Left Column - Main Transaction Info */}
        <div className="premium-card">
          <div className="amount-section">
            <div className="amount-group">
              <div className="payout-small-label">Số tiền giao dịch</div>
              <div className={`amount-display ${isIncoming ? 'positive' : 'negative'}`}>
                {isIncoming ? "+" : "-"}{currency.format(transaction.amount)}
              </div>
            </div>
            <div className="status-group" style={{ textAlign: 'right' }}>
              <div className={`status-badge-pill ${
                String(transaction.status || '').toLowerCase() === 'success' || String(transaction.status || '').toLowerCase() === 'completed' ? 'success' : 'pending'
              }`}>
                <CheckCircle2 size={16} /> {translateStatus(transaction.status)}
              </div>
              <div className="payout-date" style={{ marginTop: 8, fontSize: 13 }}>
                {new Date(transaction.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })} {new Date(transaction.createdAt).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>

          <div className="detail-info-grid">
            <div className="detail-item">
              <div className="label">Loại giao dịch</div>
              <div className="value">{translateTransactionType(transaction.transactionType)}</div>
            </div>
            <div className="detail-item">
              <div className="label">Luồng tiền</div>
              <div className="value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isIncoming ? <ArrowUpRight size={16} color="#10b981" /> : <ArrowDownLeft size={16} color="#ef4444" />}
                <span style={{ color: isIncoming ? '#10b981' : '#ef4444' }}>{translateDirection(transaction.direction)}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="label">Mã tham chiếu</div>
              <div className="value" style={{ color: '#64748b',  padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                #{transaction.referenceId || transaction.id}
              </div>
            </div>
            <div className="detail-item">
              <div className="label">Phương thức</div>
              <div className="value">{transaction.paymentMethod || "Chuyển khoản nội bộ"}</div>
            </div>
          </div>

          <div className="system-note-box">
            <h4>Ghi chú hệ thống</h4>
            <p>
              "{transaction.description || "Giao dịch được hệ thống ghi nhận tự động. Không có mô tả bổ sung từ người dùng."}"
            </p>
          </div>
        </div>

        {/* Right Column - User & Bank Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Recipient Information */}
          <div className="premium-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Thông tin người nhận</h3>
            </div>

            <div className="user-profile-header">
              <img 
                src={transaction.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(transaction.fullname || "User")}&background=random`} 
                alt="Avatar" 
                className="avatar-large" 
              />
              <div className="user-name-id">
                <h4>{transaction.fullname || "Hoàng Công Đạo"}</h4>
              </div>
            </div>

            <div className="user-contact-info">
              <div className="contact-row">
                <div className="icon-box"><Mail size={16} /></div>
                <div className="contact-text">
                  <div className="label">Email</div>
                  <div className="value">{transaction.email || "daocong@gmail.com"}</div>
                </div>
              </div>
              <div className="contact-row">
                <div className="icon-box"><Phone size={16} /></div>
                <div className="contact-text">
                  <div className="label">Số điện thoại</div>
                  <div className="value">{transaction.phoneNumber || "0355666777"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="premium-card">
            <h3>Thông tin ngân hàng</h3>
            {transaction.bankAccountNumber ? (
              <div className="user-contact-info">
                <div className="contact-row">
                  <div className="icon-box"><Building2 size={16} /></div>
                  <div className="contact-text">
                    <div className="label">Ngân hàng</div>
                    <div className="value">{transaction.bankName}</div>
                  </div>
                </div>
                <div className="contact-row">
                  <div className="icon-box"><CreditCard size={16} /></div>
                  <div className="contact-text">
                    <div className="label">Số tài khoản</div>
                    <div className="value">{transaction.bankAccountNumber}</div>
                  </div>
                </div>
                <div className="contact-row">
                  <div className="icon-box"><User size={16} /></div>
                  <div className="contact-text">
                    <div className="label">Chủ tài khoản</div>
                    <div className="value">{transaction.bankaccountHolder}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bank-empty-state">
                <div className="bank-empty-icon">
                  <Building2 size={24} />
                </div>
                <h5>Chưa cập nhật tài khoản</h5>
                <p>Người dùng này chưa liên kết tài khoản ngân hàng chính thức.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceAdminTransactionDetail;

