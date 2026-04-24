import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="finance-admin-title" style={{ margin: 0 }}>Chi tiết Payout #{payout.payoutId || payout.id}</h2>
        <button onClick={() => window.history.back()} className="finance-admin-link-btn">
          Quay lại
        </button>
      </div>

      <div className="finance-admin-card" style={{ padding: 24, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#374151" }}>Thông tin thanh toán</h3>
            <p><strong>Số tiền:</strong> <span style={{ color: "green", fontWeight: "bold" }}>{currency.format(payout.amount)}</span></p>
            <p><strong>Trạng thái:</strong> {payout.status}</p>
          </div>

          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#374151" }}>Chủ sân & Ngân hàng</h3>
            <p><strong>Chủ sân:</strong> {payout.ownerName}</p>
            <p><strong>Email:</strong> {payout.email}</p>
            <p><strong>Số điện thoại:</strong> {payout.phoneNumber}</p>
            <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f9fafb", borderRadius: 6 }}>
              <p style={{ margin: "0 0 8px 0" }}><strong>Tài khoản nhận tiền:</strong></p>
              <p>Ngân hàng: {payout.bankAccountName}</p>
              <p>Số tài khoản: {payout.bankAccountNumber}</p>
              <p>Chủ tài khoản: {payout.bankAccountHolderName}</p>
            </div>
          </div>
        </div>
      </div>

      <h3 className="finance-admin-title" style={{ fontSize: 18 }}>Danh sách Booking / Sự kiện trong Payout</h3>
      <div className="finance-admin-table-wrap">
        <table className="finance-admin-table">
          <thead>
            <tr>
              <th>Cơ sở</th>
              <th>Loại (Booking/Event)</th>
              <th>Mã tham chiếu</th>
              <th>Ngày</th>
              <th>Số tiền</th>
              <th>Trạng thái (Booking)</th>
            </tr>
          </thead>
          <tbody>
            {!payout.bookings || payout.bookings.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Không có chi tiết đặt sân.</td></tr>
            ) : payout.bookings.map((b, idx) => (
              <tr key={idx}>
                <td>{b.venueName}</td>
                <td>{b.payoutDetailType}</td>
                <td>{b.bookingId ? `Booking #${b.bookingId}` : (b.eventId ? `Event #${b.eventId}` : "—")}</td>
                <td>{b.date ? new Date(b.date).toLocaleDateString("vi-VN") : "—"}</td>
                <td>{currency.format(b.amount)}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FinanceAdminPayoutDetail;
