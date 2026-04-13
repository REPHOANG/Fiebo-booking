import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Info, MapPin } from "lucide-react";
import { getEventList } from "../../services/eventService";
import { getVenueDetail } from "../../services/fieldService";
import "./EventList.css";

const avatars = ["🧑‍🦱", "🧔", "👩‍🦰", "👨‍🦲", "👩‍🦱", "🧑‍🦳"];

const normalize = (s) => String(s || "").trim().toLowerCase();
const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const raw = String(dateStr).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
};
const formatTime = (t) => {
  const s = String(t || "").trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
};
const formatPrice = (n) => `${Math.round(Number(n || 0) / 1000)}k/Vé`;
const getJoined = (capacity, remaining) =>
  Math.max(0, Number(capacity || 0) - Number(remaining || 0));

/** Parse "YYYY-MM-DD" + "HH:mm[:ss]" → Date (theo giờ local máy người dùng) */
const parseLocalSlotStart = (eventDateStr, startTime) => {
  const dateStr = String(eventDateStr || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = String(startTime || "").trim();
  if (!t) return null;
  const [hhRaw, mmRaw] = t.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw || 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return new Date(y, mo - 1, d, hh, mm, 0, 0);
};

const getEventStatus = ({ eventDate, firstStartTime, remaining }) => {
  const rem = Number(remaining ?? 0);
  if (rem <= 0) return "Hết vé";

  const startDt = parseLocalSlotStart(eventDate, firstStartTime);
  const started = startDt ? startDt.getTime() <= Date.now() : false;
  return started ? "Đã bắt đầu" : "Sắp diễn ra";
};

const EventList = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // venue id when route is /venue/:id/social-session
  const venueId = useMemo(() => id ?? null, [id]);

  const [rangeLabel, setRangeLabel] = useState("18/03 - 24/03");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!venueId) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");
        const [events, venue] = await Promise.all([
          getEventList(),
          getVenueDetail(Number(venueId)),
        ]);

        const venueName = normalize(venue?.name ?? venue?.venueName);
        const list = Array.isArray(events) ? events : [];

        // API list hiện chưa trả venueId, nên lọc theo venueName từ venueId trên URL.
        const filtered = list.filter((e) => normalize(e?.venueName) === venueName);

        const mapped = filtered.map((e) => {
          const slots = Array.isArray(e?.slots) ? e.slots : [];
          const first = slots[0];
          const last = slots[slots.length - 1];
          const capacity = Number(e?.ticketQuantity ?? e?.TicketQuantity ?? 16) || 16;
          const remaining = Number(
            e?.remainingTicketQuantity ?? e?.RemainingTicketQuantity ?? capacity
          );
          const sport =
            pick(e, "sportTypeName", "SportTypeName") ??
            pick(first, "sportTypeName", "SportTypeName", "sportType", "SportType", "sportName") ??
            "—";

          const status = getEventStatus({
            eventDate: e?.eventDate ?? e?.EventDate,
            firstStartTime: first?.startTime ?? first?.StartTime,
            remaining,
          });

          const statusClass =
            status === "Hết vé"
              ? "es-tag-status--soldout"
              : status === "Đã bắt đầu"
                ? "es-tag-status--started"
                : "es-tag-status--upcoming";

          return {
            id: e.eventId,
            title: "[Xé vé] - Xé vé",
            date: formatDate(e.eventDate),
            time:
              first && last
                ? `${formatTime(first.startTime)} - ${formatTime(last.endTime)}`
                : "",
            fields: slots.map((s) => s.fieldName).join(" - "),
            sport,
            status,
            statusClass,
            joined: getJoined(capacity, remaining),
            capacity,
            remaining: Math.max(0, remaining),
            price: formatPrice(e.ticketPrice),
          };
        });

        if (mounted) setItems(mapped);
      } catch (e) {
        if (mounted) {
          setError(e?.response?.data?.message || e?.message || "Không tải được sự kiện.");
          setItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [venueId]);

  const openEvent = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="es-page">
      <div className="es-topbar">
        <button className="es-back" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>

        <div className="es-title-wrap">
          <h1 className="es-title">Đặt lịch sự kiện</h1>
          {venueId && (
            <div className="es-subtitle">
              <MapPin size={14} /> Venue #{venueId}
            </div>
          )}
        </div>

        <div className="es-range">
          <CalendarDays size={18} />
          <input
            className="es-range-input"
            value={rangeLabel}
            onChange={(e) => setRangeLabel(e.target.value)}
            aria-label="Date range"
          />
        </div>
      </div>

      <div className="es-grid">
        {loading && <div className="es-empty">Đang tải sự kiện...</div>}
        {!loading && error && <div className="es-empty">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="es-empty">Chưa có sự kiện nào cho sân này.</div>
        )}
        {!loading &&
          !error &&
          items.map((s) => (
          <button
            key={s.id}
            className="es-card"
            type="button"
            onClick={() => openEvent(s.id)}
          >
            <div className="es-card-head">
              <div className="es-card-title">
                <span className="es-id">#{s.id}:</span> {s.title}
              </div>
              <div className="es-date">{s.date}</div>
            </div>

            <div className="es-card-sub">
              <div className="es-time">
                {s.time} | {s.fields}
              </div>
            </div>

            <div className="es-tags">
              <span className="es-tag es-tag-sport">
                <span className="es-tag-dot" /> {s.sport}
              </span>
              <span className={`es-tag es-tag-status ${s.statusClass}`}>{s.status}</span>
              <span className="es-tag es-tag-info">
                <Info size={14} />
              </span>
            </div>

            <div className="es-foot">
              <div className="es-people">       
                <span className="es-remaining-pill">Còn {s.remaining} vé</span>
              </div>
              <span className="es-price">{s.price}</span>
              <span className="es-go">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EventList;

