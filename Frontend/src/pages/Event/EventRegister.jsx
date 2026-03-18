import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Calendar, Clock, MapPin, User } from "lucide-react";
import { toast } from "react-toastify";
import { getEventById, joinEvent } from "../../services/eventService";
import "./EventRegister.css";

const toVnd = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return x.toLocaleString("vi-VN") + " đ";
};

const EventRegister = () => {
  const { id } = useParams();
  const eventId = useMemo(() => id, [id]);
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth?.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  const [ticketQuantity, setTicketQuantity] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const nextName = user?.name || user?.fullName || "";
    const nextPhone = user?.phone || user?.phoneNumber || "";
    if (nextName && !fullName) setFullName(nextName);
    if (nextPhone && !phoneNumber) setPhoneNumber(nextPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEventById(eventId);
        if (!cancelled) setEvent(data);
      } catch (e) {
        if (!cancelled) {
          // Fallback mock để test UI/routing khi backend chưa có data
          const eid = Number(eventId);
          setEvent({
            id: eid,
            description:
              "Ghi chú: 8 người/sân. Sân Newbies ~ 3 tháng. Sân trên 6 tháng. Lượng sân xé phụ thuộc lượng đăng ký. Có thể chơi 17-20h",
            pricePerTicket: eid % 2 === 0 ? 50000 : 60000,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (eventId) run();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const pricePerTicket = Number(
    event?.pricePerTicket ?? event?.ticketPrice ?? event?.price ?? 0
  );
  const total = Math.max(0, Number(ticketQuantity) || 0) * (Number.isFinite(pricePerTicket) ? pricePerTicket : 0);

  const dec = () => setTicketQuantity((q) => Math.max(0, Number(q) - 1));
  const inc = () => setTicketQuantity((q) => Math.min(999, Number(q) + 1));

  const submit = async () => {
    if (!eventId) return;
    const payload = {
      fullName: String(fullName || "").trim(),
      phoneNumber: String(phoneNumber || "").trim(),
      ticketQuantity: Number(ticketQuantity) || 0,
      note: String(note || "").trim(),
    };

    if (!payload.ticketQuantity || payload.ticketQuantity < 1) {
      toast.warning("Vui lòng chọn số lượng vé");
      return;
    }
    if (!payload.fullName) {
      toast.warning("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!payload.phoneNumber) {
      toast.warning("Vui lòng nhập số điện thoại");
      return;
    }

    setSubmitting(true);
    try {
      const res = await joinEvent(eventId, {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        ticketQuantity: payload.ticketQuantity,
      });
      const ticketId = res?.ticketId ?? res?.id ?? res?.data?.ticketId;
      toast.success("Đăng ký thành công!");
      if (ticketId) {
        navigate(`/event/ticket/${ticketId}`, { replace: true });
      } else {
        navigate(`/event/${eventId}`, { replace: true });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="er-page">Đang tải...</div>;
  if (error) return <div className="er-page">Lỗi: {error}</div>;

  const eventTitle = event?.title ?? event?.name ?? `Sự kiện #${eventId}`;
  const eventAddress = event?.location ?? event?.address ?? event?.venueAddress ?? "";
  const eventDate = event?.date ?? event?.eventDate ?? event?.bookingDate ?? "";
  const eventTime = event?.time ?? event?.timeRange ?? "";

  return (
    <div className="er-main">
      {/* Header */}
      <div className="er-header">
        <button
          className="er-back-btn"
          onClick={() => navigate(-1)}
          disabled={submitting}
          aria-disabled={submitting}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="er-header-title">Đặt lịch sự kiện</h1>
        <div className="er-header-spacer" />
      </div>

      {/* Section: Event info */}
      <section className="er-section">
        <div className="er-section-header">
          <MapPin size={16} /> Thông tin sự kiện
        </div>
        <div className="er-card">
          <h3 className="er-card-title">{eventTitle}</h3>
          {eventAddress ? <p className="er-card-sub">{eventAddress}</p> : null}
          <div className="er-tags">
            {eventDate ? (
              <span className="er-tag">
                <Calendar size={14} /> {String(eventDate)}
              </span>
            ) : null}
            {eventTime ? (
              <span className="er-tag">
                <Clock size={14} /> {String(eventTime)}
              </span>
            ) : null}
            {Number.isFinite(pricePerTicket) && pricePerTicket > 0 ? (
              <span className="er-tag price">{toVnd(pricePerTicket)}/vé</span>
            ) : null}
          </div>
          <div className="er-note-card">
            {event?.note ?? event?.description ?? "Ghi chú: —"}
          </div>
        </div>
      </section>

      {/* Section: Ticket quantity */}
      <section className="er-section">
        <div className="er-section-header">
          <User size={16} /> Số lượng vé
        </div>
        <div className="er-card">
          <div className="er-qty-row">
            <div className="er-qty-label">Số lượng vé muốn đặt</div>
            <div className="er-qty">
              <button type="button" className="er-qty-btn" onClick={dec} aria-label="Giảm">
                −
              </button>
              <div className="er-qty-value">{ticketQuantity}</div>
              <button type="button" className="er-qty-btn" onClick={inc} aria-label="Tăng">
                +
              </button>
            </div>
          </div>
          <div className="er-total-row">
            <span>Tổng tiền</span>
            <strong className="er-total-val">{total ? toVnd(total) : "0 đ"}</strong>
          </div>
        </div>
      </section>

      {/* Section: Customer */}
      <section className="er-section">
        <div className="er-section-header">
          <User size={16} /> Thông tin người đặt
        </div>
        <div className="er-card">
          <div className="er-field">
            <label>Tên khách hàng</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Họ tên" />
          </div>
          <div className="er-field">
            <label>Số điện thoại</label>
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Nhập số điện thoại" />
          </div>
          <div className="er-field">
            <label>Ghi chú</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập ghi chú" />
          </div>
        </div>
      </section>

      {/* Sticky bottom bar */}
      <div className="er-bottom">
        <div className="er-bottom-inner">
          <div className="er-bottom-total">
            <span>Tổng cộng</span>
            <strong>{total ? toVnd(total) : "0 đ"}</strong>
          </div>
          <button className="er-submit" type="button" onClick={submit} disabled={submitting}>
            {submitting ? "ĐANG XỬ LÝ..." : "ĐĂNG KÝ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventRegister;

