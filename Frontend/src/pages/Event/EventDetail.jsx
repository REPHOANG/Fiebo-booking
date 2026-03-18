import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
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
  const user = useSelector((s) => s.auth?.user);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState(1);

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

  useEffect(() => {
    // Prefill from profile when available
    const nextName = user?.name || user?.fullName || "";
    const nextPhone = user?.phone || user?.phoneNumber || "";
    if (nextName && !fullName) setFullName(nextName);
    if (nextPhone && !phoneNumber) setPhoneNumber(nextPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleJoin = async () => {
    if (!eventId) return;
    setSubmitting(true);
    try {
      const qty = Number(ticketQuantity);
      const payload = {
        fullName: String(fullName || "").trim(),
        phoneNumber: String(phoneNumber || "").trim(),
        ticketQuantity: Number.isFinite(qty) ? qty : 1,
      };

      if (!payload.fullName) {
        toast.warning("Vui lòng nhập họ tên");
        return;
      }
      if (!payload.phoneNumber) {
        toast.warning("Vui lòng nhập số điện thoại");
        return;
      }
      if (!payload.ticketQuantity || payload.ticketQuantity < 1) {
        toast.warning("Số lượng vé phải >= 1");
        return;
      }

      const result = await joinEvent(eventId, payload);
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
            <div className="event-join">
              <div className="event-form">
                <div className="event-field">
                  <label>Họ tên</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="event-field">
                  <label>Số điện thoại</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09xxxxxxxx"
                  />
                </div>
                <div className="event-field">
                  <label>Số lượng vé</label>
                  <input
                    type="number"
                    min={1}
                    value={ticketQuantity}
                    onChange={(e) => setTicketQuantity(e.target.value)}
                  />
                </div>
              </div>

              <button className="event-primary" onClick={handleJoin} disabled={submitting}>
                {submitting ? "Đang xử lý..." : "Tham gia (Join)"}
              </button>
            </div>
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

