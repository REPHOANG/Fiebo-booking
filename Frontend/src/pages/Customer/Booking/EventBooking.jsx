import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import "./EventBooking.css";

// UI mock giống trang “đặt lịch sự kiện” (chưa có API list)
const mockSessions = [
  {
    id: 2569,
    title: "[Xé vé] - ⭐ Trên 6 tháng",
    date: "18/03/2026",
    time: "16h - 21h",
    field: "Sân 7",
    price: "50k/Vé",
    joined: 0,
    capacity: 8,
  },
  {
    id: 2541,
    title: "[Xé vé] - ⭐⭐ Trên 12 tháng",
    date: "18/03/2026",
    time: "16h - 21h",
    field: "Sân 6",
    price: "50k/Vé",
    joined: 0,
    capacity: 8,
  },
  {
    id: 2540,
    title: "[Xé vé] - ⭐⭐ Trên 12 tháng",
    date: "18/03/2026",
    time: "16h - 21h",
    field: "Sân 5",
    price: "50k/Vé",
    joined: 0,
    capacity: 8,
  },
  {
    id: 2562,
    title: "[Xé vé] - ⭐ Trên 3 tháng",
    date: "18/03/2026",
    time: "16h - 21h",
    field: "Sân 8",
    price: "50k/Vé",
    joined: 0,
    capacity: 8,
  },
];

const EventBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const venueId = useMemo(() => id, [id]);

  const [rangeLabel, setRangeLabel] = useState("17/03 - 23/03");

  const openSession = (sessionId) => {
    // Khi có API + flow join/payment, có thể điều hướng sang /event/:id hoặc /event/ticket/:id
    navigate(`/event/${sessionId}`);
  };

  return (
    <div className="eb-page">
      <div className="eb-topbar">
        <button className="eb-back" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="eb-title">Đặt lịch sự kiện</h1>
        <div className="eb-range">
          <CalendarDays size={18} />
          <input
            className="eb-range-input"
            value={rangeLabel}
            onChange={(e) => setRangeLabel(e.target.value)}
            aria-label="Date range"
          />
        </div>
      </div>

      <div className="eb-grid">
        {mockSessions.map((s) => (
          <button
            key={s.id}
            className="eb-card"
            type="button"
            onClick={() => openSession(s.id)}
          >
            <div className="eb-card-head">
              <div className="eb-card-title">
                <span className="eb-id">#{s.id}:</span> {s.title}
              </div>
              <div className="eb-date">{s.date}</div>
            </div>

            <div className="eb-card-sub">
              <div>{s.time} | {s.field}</div>
            </div>

            <div className="eb-card-foot">
              <div className="eb-cap">
                <span className="eb-cap-pill">{s.joined}/{s.capacity}</span>
              </div>
              <div className="eb-price">{s.price}</div>
              <div className="eb-go">→</div>
            </div>
          </button>
        ))}
      </div>

      <div className="eb-hint">
        VenueId: <strong>{venueId}</strong> (dùng để fetch danh sách sự kiện khi tích hợp API)
      </div>
    </div>
  );
};

export default EventBooking;

