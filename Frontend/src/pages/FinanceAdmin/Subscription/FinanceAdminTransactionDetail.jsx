import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTransactionDetail } from "../../../services/financeAdminService";
import "../financeAdminPages.css";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="finance-admin-title" style={{ margin: 0 }}>Chi tiết giao dịch #{transaction.id}</h2>
        <Link to="/finance-admin/transactions" className="finance-admin-link-btn">
          Quay lại danh sách
        </Link>
      </div>

      <div className="finance-admin-card" style={{ padding: 24, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#374151" }}>Thông tin giao dịch</h3>
            <p><strong>Loại giao dịch:</strong> {translateTransactionType(transaction.transactionType)}</p>
            <p><strong>Chiều giao dịch:</strong> {translateDirection(transaction.direction)}</p>
            <p><strong>Số tiền:</strong> <span style={{ color: normalizeDirectionIsIncoming(transaction.direction) ? "green" : "red", fontWeight: "bold" }}>
              {normalizeDirectionIsIncoming(transaction.direction) ? "+" : "-"}{currency.format(transaction.amount)}
            </span></p>
            <p><strong>Trạng thái:</strong> {translateStatus(transaction.status)}</p>
            <p><strong>Ngày tạo:</strong> {new Date(transaction.createdAt).toLocaleString("vi-VN")}</p>
            <p><strong>Mô tả:</strong> {transaction.description || "Không có"}</p>
            {transaction.referenceId && <p><strong>Mã tham chiếu (Reference ID):</strong> {transaction.referenceId}</p>}
          </div>

          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#374151" }}>Thông tin người dùng & Ngân hàng</h3>
            <p><strong>Họ tên:</strong> {transaction.fullname}</p>
            <p><strong>Email:</strong> {transaction.email}</p>
            <p><strong>Số điện thoại:</strong> {transaction.phoneNumber}</p>
            <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f9fafb", borderRadius: 6 }}>
              <p style={{ margin: "0 0 8px 0" }}><strong>Thông tin ngân hàng:</strong></p>
              {transaction.bankAccountNumber ? (
                <>
                  <p>Ngân hàng: {transaction.bankName}</p>
                  <p>Số tài khoản: {transaction.bankAccountNumber}</p>
                  <p>Chủ tài khoản: {transaction.bankaccountHolder}</p>
                </>
              ) : (
                <p style={{ color: "#6b7280" }}>Không có thông tin ngân hàng</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinanceAdminTransactionDetail;
