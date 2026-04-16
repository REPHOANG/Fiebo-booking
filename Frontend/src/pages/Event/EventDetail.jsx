import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Users } from "lucide-react";
import { useAuthModal } from "../../context/AuthModalContext";
import { getEventById, joinEvent } from "../../services/eventService";
import { getProfile } from "../../services/authService";
import "./EventDetail.css";
import "./EventRegister.css";

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

const formatMoney = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n));
};

const formatDateVN = (raw) => {
  if (raw == null || raw === "") return "—";
  const s = String(raw).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const wd = date.toLocaleDateString("vi-VN", { weekday: "long" });
  return `${d}/${m}/${y} · ${wd}`;
};

const formatTime = (t) => {
  if (t == null) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const normalizePhoneNumber = (value) =>
  String(value ?? "").replace(/\s/g, "").trim();

const getFullNameError = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Vui lòng nhập họ và tên.";
  return "";
};

const getPhoneNumberError = (value) => {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return "Vui lòng nhập số điện thoại.";
  if (!/^0\d{9,10}$/.test(normalized)) {
    return "Số điện thoại không hợp lệ.";
  }
  return "";
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = useMemo(() => id, [id]);

  const scheduleReturn = location.state?.bookingScheduleReturn;
  const backFromSchedule =
    scheduleReturn?.venueId != null &&
    scheduleReturn?.date != null &&
    String(scheduleReturn.date).length > 0;
  const backHref = backFromSchedule
    ? `/venue/${scheduleReturn.venueId}/booking/schedule?date=${encodeURIComponent(
        String(scheduleReturn.date).slice(0, 10)
      )}`
    : "/events";
  const backLabel = backFromSchedule ? "Lịch đặt sân" : "Danh sách sự kiện";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useSelector((s) => s.auth || {});
  const { openLogin } = useAuthModal();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const didEditNameRef = useRef(false);
  const didEditPhoneRef = useRef(false);

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
    const nextName = user?.name || user?.fullName || "";
    const nextPhone = normalizePhoneNumber(user?.phone || user?.phoneNumber || "");
    if (nextName && !didEditNameRef.current && !fullName) setFullName(nextName);
    if (nextPhone && !didEditPhoneRef.current && !phoneNumber) setPhoneNumber(nextPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const profile = await getProfile();
        if (cancelled || !profile) return;

        const nextName = String(profile.fullName || profile.name || "").trim();
        const nextPhone = normalizePhoneNumber(profile.phoneNumber || profile.phone || "");

        if (nextName && !didEditNameRef.current && !fullName) {
          setFullName(nextName);
        }
        if (nextPhone && !didEditPhoneRef.current && !phoneNumber) {
          setPhoneNumber(nextPhone);
        }
      } catch (_) {
        // ignore profile prefill failures
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fullName, phoneNumber]);

  const venueName = pick(event, "venueName", "VenueName") ?? "";
  const venueAddress = pick(event, "venueAddress", "VenueAddress") ?? "";
  const eventDate = pick(event, "eventDate", "EventDate");
  const description = pick(event, "description", "Description");
  const ticketPrice = pick(event, "ticketPrice", "TicketPrice", "pricePerTicket", "price");
  const maxPlayer = Number(pick(event, "ticketQuantity", "TicketQuantity") ?? 0);
  const remainingRaw = pick(event, "remainingTicketQuantity", "RemainingTicketQuantity");
  const spotsLeft =
    remainingRaw != null && remainingRaw !== ""
      ? Number(remainingRaw)
      : maxPlayer;
  const maxSelectable = Math.max(
    0,
    Math.min(Number.isFinite(spotsLeft) ? spotsLeft : 0, maxPlayer || spotsLeft)
  );

  const slots = pick(event, "slots", "Slots") ?? [];

  const title =
    pick(event, "title", "Title", "name", "Name") ||
    (venueName ? `Sự kiện tại ${venueName}` : `Sự kiện #${eventId}`);

  const soldOut = maxSelectable < 1;

  const pricePerTicket = Number(ticketPrice ?? 0);
  const total =
    Math.max(0, Number(ticketQuantity) || 0) *
    (Number.isFinite(pricePerTicket) ? pricePerTicket : 0);

  useEffect(() => {
    if (!event) return;
    const cap = Math.max(1, maxSelectable);
    setTicketQuantity((prev) => {
      const n = Number(prev) || 1;
      if (maxSelectable < 1) return 0;
      return Math.min(Math.max(1, n), cap);
    });
  }, [event, maxSelectable]);

  const dec = () => setTicketQuantity((q) => Math.max(1, Number(q) - 1));
  const inc = () => setTicketQuantity((q) => Math.min(maxSelectable, Number(q) + 1));

  const promptLoginForJoin = () => {
    Swal.fire({
      title: "Yêu cầu đăng nhập",
      text: "Bạn cần đăng nhập trước khi đăng ký tham gia sự kiện.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Đăng nhập",
      cancelButtonText: "Để sau",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#94a3b8",
    }).then((result) => {
      if (result.isConfirmed) {
        openLogin();
      }
    });
  };

  const handleJoin = async () => {
    if (!eventId) return;
    if (!isAuthenticated) {
      promptLoginForJoin();
      return;
    }

    const qty = Number(ticketQuantity) || 0;
    const nextFullNameError = getFullNameError(fullName);
    const nextPhoneError = getPhoneNumberError(phoneNumber);

    setFullNameError(nextFullNameError);
    setPhoneNumberError(nextPhoneError);

    const payload = {
      fullName: String(fullName || "").trim(),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      ticketQuantity: qty,
    };

    if (!payload.ticketQuantity || payload.ticketQuantity < 1) {
      toast.warning("Vui lòng chọn số lượng vé");
      return;
    }
    if (payload.ticketQuantity > maxSelectable) {
      toast.warning("Số lượng vượt quá chỗ còn lại");
      return;
    }
    if (nextFullNameError || nextPhoneError) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await joinEvent(eventId, {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        ticketQuantity: payload.ticketQuantity,
      });
      const ticketId =
        result?.ticketParticipantId ??
        result?.TicketParticipantId ??
        result?.ticketId ??
        result?.TicketId ??
        result?.id ??
        result?.data?.ticketParticipantId ??
        result?.data?.TicketParticipantId;

      if (ticketId) {
        toast.success("Đã giữ chỗ. Vui lòng thanh toán trong thời gian quy định.");
        navigate(`/event/ticket/${ticketId}/payment`, { replace: true });
      } else {
        toast.success("Tham gia sự kiện thành công!");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Tham gia thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ed-page">
        <div className="ed-loading">
          <div className="ed-skeleton ed-skel-hero" />
          <div className="ed-container ed-container--loading">
            <div className="ed-skeleton ed-skel-line" />
            <div className="ed-skeleton ed-skel-line short" />
            <div className="ed-skeleton ed-skel-block" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="ed-page">
        <div className="ed-error-card">
          <h1>Không tải được sự kiện</h1>
          <p>{error ?? "Thử lại sau."}</p>
          <div className="ed-error-actions">
            <Link to="/events" className="ed-btn ed-btn--primary">
              Xem danh sách sự kiện
            </Link>
            <Link to="/" className="ed-btn ed-btn--ghost">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ed-page">
      <header className="ed-hero">
        <div className="ed-hero-bg" aria-hidden />
        <div className="ed-hero-content">
          <Link to={backHref} className="ed-back-link">
            <ArrowLeft size={18} strokeWidth={2.25} />
            {backLabel}
          </Link>
          <h1 className="ed-title">{title}</h1>
          {venueName ? <p className="ed-subtitle">{venueName}</p> : null}
        </div>
      </header>

      <div className="ed-container">
        <div className="ed-main">
          <section className="ed-stats" aria-label="Thông tin nhanh">
            <article className="ed-stat ed-stat-date">
              <span className="ed-stat-icon" aria-hidden>
                <Calendar size={22} strokeWidth={2} />
              </span>
              <div>
                <p className="ed-stat-label">Ngày diễn ra</p>
                <p className="ed-stat-value">{formatDateVN(eventDate)}</p>
              </div>
            </article>
            <article className="ed-stat ed-stat--wide">
              <span className="ed-stat-icon" aria-hidden>
                <MapPin size={22} strokeWidth={2} />
              </span>
              <div>
                <p className="ed-stat-label">Địa điểm</p>
                <p className="ed-stat-value ed-stat-value--multiline">{venueAddress || "—"}</p>
              </div>
            </article>
            <article className="ed-stat ed-stat-price-amount">
              <span className="ed-stat-icon" aria-hidden>
                <Ticket size={22} strokeWidth={2} />
              </span>
              <div>
                <p className="ed-stat-label">Giá <span className="ed-stat-label-sub">/ người</span></p>
                <p className="ed-stat-value ed-stat-value--accent">{formatMoney(ticketPrice)}</p>
              </div>
            </article>
            <article className="ed-stat ed-stat-participants-count">
              <span className="ed-stat-icon" aria-hidden>
                <Users size={22} strokeWidth={2} />
              </span>
              <div>
                <p className="ed-stat-label">Số người tham gia</p>
                <p className="ed-stat-value">
                  {maxPlayer > 0 ? `${Math.max(0, maxPlayer - spotsLeft)} / ${maxPlayer}` : "—"}
                </p>
              </div>
            </article>
          </section>

          {slots.length > 0 ? (
            <section className="ed-panel" aria-labelledby="ed-slots-heading">
              <div className="ed-panel-head">
                <Clock size={20} className="ed-panel-icon" strokeWidth={2} />
                <h2 id="ed-slots-heading" className="ed-panel-title">
                  Khung giờ và sân
                </h2>
              </div>
              <ul className="ed-slot-list">
                {slots.map((row, idx) => {
                  const fname = pick(row, "fieldName", "FieldName") ?? "—";
                  const start = pick(row, "startTime", "StartTime");
                  const end = pick(row, "endTime", "EndTime");
                  return (
                    <li key={`${fname}-${idx}`} className="ed-slot-item">
                      <span className="ed-slot-time">
                        {formatTime(start)} – {formatTime(end)}
                      </span>
                      <span className="ed-slot-field">{fname}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="ed-panel ed-panel--desc" aria-labelledby="ed-desc-heading">
            <h2 id="ed-desc-heading" className="ed-panel-title ed-panel-title--solo">
              Giới thiệu
            </h2>
            <div className="ed-desc">
              {description ? (
                String(description)
                  .split(/\n+/)
                  .map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p className="ed-desc-empty">Chưa có mô tả cho sự kiện này.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="ed-aside">
          <div className="ed-join-card er-register-card">
            <h2 className="ed-join-title">Đăng ký tham gia</h2>
            
            {soldOut ? (
              <p className="ed-soldout">Sự kiện đã đủ người tham gia.</p>
            ) : null}

            <div className="er-reg-qty">
              <span className="er-reg-qty-label">Số lượng vé</span>
              <div className="er-reg-stepper">
                <button
                  type="button"
                  className="er-reg-step"
                  onClick={dec}
                  disabled={submitting || soldOut || ticketQuantity <= 1}
                  aria-label="Giảm"
                >
                  −
                </button>
                <span className="er-reg-step-val">{ticketQuantity}</span>
                <button
                  type="button"
                  className="er-reg-step"
                  onClick={inc}
                  disabled={submitting || soldOut || ticketQuantity >= maxSelectable}
                  aria-label="Tăng"
                >
                  +
                </button>
              </div>
            </div>

            <div className="er-reg-total">
              <span>Tổng tiền</span>
              <strong>{formatMoney(total)}</strong>
            </div>

            <div className="ed-form">
              <label className="ed-field">
                <span>Họ và tên</span>
                <input
                  className={fullNameError ? "ed-input-error" : ""}
                  value={fullName}
                  onChange={(e) => {
                    didEditNameRef.current = true;
                    const nextValue = e.target.value;
                    setFullName(nextValue);
                    if (fullNameError) {
                      setFullNameError(getFullNameError(nextValue));
                    }
                  }}
                  onBlur={() => setFullNameError(getFullNameError(fullName))}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  aria-invalid={fullNameError ? "true" : "false"}
                  disabled={submitting || soldOut}
                />
                {fullNameError ? <small className="ed-field-error">{fullNameError}</small> : null}
              </label>
              <label className="ed-field">
                <span>Số điện thoại</span>
                <input
                  className={phoneNumberError ? "ed-input-error" : ""}
                  value={phoneNumber}
                  onChange={(e) => {
                    didEditPhoneRef.current = true;
                    const nextValue = e.target.value;
                    setPhoneNumber(nextValue);
                    if (phoneNumberError) {
                      setPhoneNumberError(getPhoneNumberError(nextValue));
                    }
                  }}
                  onBlur={() => setPhoneNumberError(getPhoneNumberError(phoneNumber))}
                  placeholder="09xxxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={phoneNumberError ? "true" : "false"}
                  disabled={submitting || soldOut}
                />
                {phoneNumberError ? <small className="ed-field-error">{phoneNumberError}</small> : null}
              </label>
              <label className="ed-field">
                <span>Ghi chú (tuỳ chọn)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho ban tổ chức"
                  disabled={submitting || soldOut}
                />
              </label>
            </div>

            <button
              type="button"
              className="ed-btn ed-btn--primary ed-btn--block"
              onClick={handleJoin}
              disabled={submitting || soldOut}
            >
              {submitting ? "Đang xử lý…" : soldOut ? "Hết chỗ" : "Đăng ký"}
            </button>
            <Link to="/" className="ed-home-link">
              Về trang chủ
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EventDetail;
