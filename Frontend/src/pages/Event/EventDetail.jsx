import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getEventById, joinEvent } from "../../services/eventService";
import "./EventDetail.css";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const eventId = useMemo(() => id, [id]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEventById(eventId);
        if (!cancelled) setEvent(data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message ?? e?.message ?? "Không tải được sự kiện");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (eventId) run();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleJoin = async () => {
    if (!eventId) return;
    setSubmitting(true);
    try {
      const result = await joinEvent(eventId);
      const ticketId = result?.ticketId ?? result?.id ?? result?.data?.ticketId;
      toast.success("Tham gia sự kiện thành công!");
      if (ticketId) {
        navigate(`/event/ticket/${ticketId}`, { replace: true });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Join thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="event-page">Đang tải...</div>;
  if (error) return <div className="event-page">Lỗi: {error}</div>;

  return (
    <div className="event-page">
      <div className="event-card">
        <div className="event-top">
          <div>
            <h1 className="event-title">{event?.title ?? event?.name ?? `Event #${eventId}`}</h1>
            <div className="event-meta">
              <span>{event?.date ?? event?.eventDate ?? ""}</span>
              <span>{event?.location ?? event?.address ?? ""}</span>
            </div>
          </div>
          <div className="event-actions">
            <button className="event-primary" onClick={handleJoin} disabled={submitting}>
              {submitting ? "Đang xử lý..." : "Tham gia (Join)"}
            </button>
            <Link className="event-secondary" to="/">
              Về trang chủ
            </Link>
          </div>
        </div>

        <div className="event-body">
          <h3>Mô tả</h3>
          <p className="event-desc">{event?.description ?? "Chưa có mô tả."}</p>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;

