import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getEventTicketById } from "../../services/eventService";
import "./EventTicketDetail.css";

const EventTicketDetail = () => {
  const { id } = useParams();
  const ticketId = useMemo(() => id, [id]);
  const navigate = useNavigate();

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
        if (!cancelled) setError(e?.response?.data?.message ?? e?.message ?? "Không tải được vé");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (ticketId) run();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const handleGoPay = () => {
    if (!ticketId) return;
    navigate(`/event/ticket/${ticketId}/payment`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(ticketId));
      toast.success("Đã copy ticketId");
    } catch {
      toast.info(String(ticketId));
    }
  };

  if (loading) return <div className="ticket-page">Đang tải...</div>;
  if (error) return <div className="ticket-page">Lỗi: {error}</div>;

  const status = ticket?.status ?? ticket?.ticketStatus ?? "unknown";
  const eventTitle = ticket?.eventTitle ?? ticket?.eventName ?? ticket?.event?.title;

  return (
    <div className="ticket-page">
      <div className="ticket-card">
        <div className="ticket-header">
          <div>
            <h1 className="ticket-title">Vé sự kiện</h1>
            <div className="ticket-sub">
              <span className="ticket-badge">{String(status)}</span>
              {eventTitle ? <span className="ticket-event">• {eventTitle}</span> : null}
            </div>
          </div>
          <div className="ticket-actions">
            <button className="ticket-secondary" onClick={handleCopy}>
              Copy ticketId
            </button>
            <button className="ticket-primary" onClick={handleGoPay}>
              Thanh toán
            </button>
            <Link className="ticket-secondary" to="/">
              Về trang chủ
            </Link>
          </div>
        </div>

        <div className="ticket-body">
          <div className="ticket-row">
            <span className="ticket-label">Ticket ID</span>
            <span className="ticket-value">{ticketId}</span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">Giá</span>
            <span className="ticket-value">
              {ticket?.price ?? ticket?.amount ?? ticket?.totalPrice ?? "—"}
            </span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">Người tham gia</span>
            <span className="ticket-value">
              {ticket?.fullName ?? ticket?.name ?? ticket?.userName ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTicketDetail;

