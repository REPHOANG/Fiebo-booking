import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { payEventTicket } from "../../services/eventService";
import "./EventTicketPayment.css";

const EventTicketPayment = () => {
  const { id } = useParams();
  const ticketId = id;
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  const onPay = async () => {
    if (!ticketId) return;
    setSubmitting(true);
    try {
      await payEventTicket(ticketId, { paymentMethod });
      toast.success("Thanh toán thành công!");
      navigate(`/event/ticket/${ticketId}`, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Thanh toán thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pay-page">
      <div className="pay-card">
        <h1 className="pay-title">Thanh toán vé</h1>
        <p className="pay-sub">Ticket ID: <strong>{ticketId}</strong></p>

        <div className="pay-form">
          <label className="pay-label">Phương thức</label>
          <select
            className="pay-select"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="wallet">Ví</option>
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>

          <div className="pay-actions">
            <button className="pay-primary" onClick={onPay} disabled={submitting}>
              {submitting ? "Đang thanh toán..." : "Thanh toán"}
            </button>
            <Link className="pay-secondary" to={`/event/ticket/${ticketId}`}>
              Quay lại vé
            </Link>
            <Link className="pay-secondary" to="/">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTicketPayment;

