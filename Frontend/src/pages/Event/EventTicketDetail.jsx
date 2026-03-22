import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Calendar, Clock, User, Receipt, Phone } from "lucide-react";
import { getEventTicketById } from "../../services/eventService";
import "./EventTicketDetail.css";

const formatPrice = (n) =>
  Number(n) > 0 ? `${Number(n).toLocaleString("vi-VN")} đ` : "—";

const formatDate = (d) => {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}/${m}/${y}` : s;
};

const formatTime = (t) => {
  const s = String(t ?? "").trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const EventTicketDetail = () => {
  const { id } = useParams();
  const ticketId = useMemo(() => id, [id]);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEventTicketById(ticketId);
        if (!cancelled) setTicket(data);
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message ?? e?.message ?? "Không tải được vé");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (ticketId) run();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(ticketId));
      toast.success("Đã copy mã vé");
    } catch {
      toast.info(String(ticketId));
    }
  };

  if (loading) return <div className="ticket-page">Đang tải...</div>;
  if (error) return <div className="ticket-page">Lỗi: {error}</div>;

  const status = ticket?.status ?? ticket?.Status ?? "—";
  const fullname = ticket?.fullname ?? ticket?.fullName ?? ticket?.Fullname ?? "—";
  const phoneNumber = ticket?.phoneNumber ?? ticket?.phone ?? ticket?.PhoneNumber ?? "—";
  const eventDate = ticket?.eventDate ?? ticket?.EventDate;
  const slots = Array.isArray(ticket?.slots) ? ticket.slots : (ticket?.Slots ?? []);
  const ticketQuantity = Number(ticket?.ticketQuantity ?? ticket?.TicketQuantity ?? 0) || "—";
  const pricePerTicket = ticket?.pricePerTicket ?? ticket?.PricePerTicket ?? ticket?.price ?? null;
  const totalAmount = ticket?.totalAmount ?? ticket?.TotalAmount ?? ticket?.totalPrice ?? null;

  return (
    <div className="ticket-page">
      <div className="ticket-card">
        <div className="ticket-card-inner">
          <div className="ticket-stripe" aria-hidden="true" />
          <div className="ticket-header">
            <div className="ticket-header-left">
              <h1 className="ticket-title">Vé sự kiện</h1>
              <span className={`ticket-badge ticket-badge--${String(status).toLowerCase()}`}>
                {String(status)}
              </span>
            </div>
            <div className="ticket-actions">
              <button className="ticket-btn-secondary" onClick={handleCopy} type="button">
                Copy mã vé
              </button>
              <Link className="ticket-btn-secondary" to="/">
                Về trang chủ
              </Link>
            </div>
          </div>

          <div className="ticket-body">
            <div className="ticket-row">
              <span className="ticket-label">
                <Receipt size={16} /> Mã vé
              </span>
              <span className="ticket-value">#{ticketId}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">
                <Calendar size={16} /> Ngày sự kiện
              </span>
              <span className="ticket-value">{formatDate(eventDate)}</span>
            </div>

            {slots.length > 0 && (
              <div className="ticket-row ticket-row--block">
                <span className="ticket-label">
                  <Clock size={16} /> Khung giờ · Sân
                </span>
                <div className="ticket-slots">
                  {slots.map((slot, idx) => (
                    <span key={idx} className="ticket-slot">
                      {slot.fieldName ?? slot.FieldName ?? "Sân"} —{" "}
                      {formatTime(slot.startTime ?? slot.StartTime)} –{" "}
                      {formatTime(slot.endTime ?? slot.EndTime)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="ticket-row">
              <span className="ticket-label">Số lượng vé</span>
              <span className="ticket-value">{ticketQuantity}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Đơn giá / vé</span>
              <span className="ticket-value">{formatPrice(pricePerTicket)}</span>
            </div>

            <div className="ticket-row ticket-row--total">
              <span className="ticket-label">Tổng tiền</span>
              <span className="ticket-value ticket-value--price">{formatPrice(totalAmount)}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">
                <User size={16} /> Người tham gia
              </span>
              <span className="ticket-value">{fullname}</span>
            </div>

            {phoneNumber && phoneNumber !== "—" && (
              <div className="ticket-row">
                <span className="ticket-label">
                  <Phone size={16} /> Số điện thoại
                </span>
                <span className="ticket-value">{phoneNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTicketDetail;
