import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Info, MapPin } from "lucide-react";
import "./EventList.css";

const MOCK = [
  {
    id: 19388,
    title: "[Xé vé] - Xé vé",
    date: "18/03/2026",
    time: "14h - 18h",
    fields: "Pickleball 6 - Pickleball 7",
    sport: "Pickleball",
    level: "1.5 → 3.5",
    joined: 4,
    capacity: 16,
    price: "60k/Vé",
  },
  {
    id: 19417,
    title: "[Xé vé] - Xé vé",
    date: "18/03/2026",
    time: "22h - 24h",
    fields: "Pickleball 5 - Pickleball 6",
    sport: "Pickleball",
    level: "1.5 → 3.5",
    joined: 3,
    capacity: 16,
    price: "50k/Vé",
  },
  {
    id: 19416,
    title: "[Xé vé] - Xé vé",
    date: "19/03/2026",
    time: "8h - 12h",
    fields: "Pickleball 4 - Pickleball 5",
    sport: "Pickleball",
    level: "1.5 → 3.5",
    joined: 0,
    capacity: 16,
    price: "50k/Vé",
  },
  {
    id: 19415,
    title: "[Xé vé] - Xé vé",
    date: "19/03/2026",
    time: "14h - 18h",
    fields: "Pickleball 6 - Pickleball 7",
    sport: "Pickleball",
    level: "1.5 → 3.5",
    joined: 0,
    capacity: 16,
    price: "50k/Vé",
  },
];

const avatars = ["🧑‍🦱", "🧔", "👩‍🦰", "👨‍🦲", "👩‍🦱", "🧑‍🦳"];

const EventList = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // venue id when route is /venue/:id/social-session
  const venueId = useMemo(() => id ?? null, [id]);

  const [rangeLabel, setRangeLabel] = useState("18/03 - 24/03");

  const openEvent = (eventId) => {
    navigate(`/event/${eventId}/register`);
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
        {MOCK.map((s) => (
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
              <span className="es-tag es-tag-level">{s.level}</span>
              <span className="es-tag es-tag-info">
                <Info size={14} />
              </span>
            </div>

            <div className="es-foot">
              <div className="es-people">
                <div className="es-avatars" aria-hidden="true">
                  {Array.from({ length: Math.min(3, s.joined) }).map((_, idx) => (
                    <span className="es-avatar" key={idx}>
                      {avatars[(s.id + idx) % avatars.length]}
                    </span>
                  ))}
                </div>
                <span className="es-cap-pill">
                  {s.joined}/{s.capacity}
                </span>
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

