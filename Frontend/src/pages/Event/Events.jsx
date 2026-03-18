import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Heart, Share2, SlidersHorizontal, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { searchVenues } from "../../services/fieldService";
import { mapVenue } from "../../utils/helperFunction";
import BookingTypeModal from "../../components/common/BookingTypeModal/BookingTypeModal";
import "./Events.css";

const mockSessions = [
  { id: 19388, time: "14:00 - 18:00", date: "18/03/2026", price: "60.000 đ/vé", joined: "4/16", level: "1.5 → 3.5" },
  { id: 19417, time: "22:00 - 24:00", date: "18/03/2026", price: "50.000 đ/vé", joined: "3/16", level: "1.5 → 3.5" },
];

const MOCK_VENUES = [
  {
    id: 1,
    name: "AIKO HỒ TÙNG MẬU",
    image: "https://placehold.co/900x600/png?text=AIKO+Venue",
    rating: 4.9,
    badges: ["Đơn ngày", "Sự kiện"],
    price: "70.000 đ/vé",
    joined: "0/8",
    sessions: [
      { id: 19388, time: "14:00 - 18:00", date: "18/03/2026", joined: "4/16", level: "1.5 → 3.5" },
      { id: 19416, time: "08:00 - 12:00", date: "19/03/2026", joined: "0/16", level: "1.5 → 3.5" },
    ],
  },
  {
    id: 2,
    name: "MÂY Pickleball Rooftop Court",
    image: "https://placehold.co/900x600/png?text=May+Pickleball",
    rating: 5.0,
    badges: ["Đơn ngày", "Sự kiện"],
    price: "70.000 đ/vé",
    joined: "0/8",
    sessions: [
      { id: 19417, time: "22:00 - 24:00", date: "18/03/2026", joined: "3/16", level: "1.5 → 3.5" },
      { id: 19415, time: "14:00 - 18:00", date: "19/03/2026", joined: "0/16", level: "1.5 → 3.5" },
    ],
  },
  {
    id: 3,
    name: "Paradise Pickleball Club",
    image: "https://placehold.co/900x600/png?text=Paradise+Club",
    rating: 4.9,
    badges: ["Đơn ngày", "Sự kiện"],
    price: "70.000 đ/vé",
    joined: "0/16",
    sessions: [
      { id: 19414, time: "20:00 - 23:00", date: "19/03/2026", joined: "0/16", level: "2.0 → 3.5" },
    ],
  },
];

const Events = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const [showBookingTypeModal, setShowBookingTypeModal] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState(null);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["events-venues", query],
    queryFn: async () => {
      const res = await searchVenues({ location: query || undefined, page: 1, pageSize: 12 });
      const items = res?.items ?? res?.Items ?? res ?? [];
      return Array.isArray(items) ? items.map(mapVenue) : [];
    },
    staleTime: 60 * 1000,
  });

  const cards = useMemo(() => {
    const fromApi = (venues || []).map((v, idx) => ({
      ...v,
      badges: ["Đơn ngày", "Sự kiện"],
      rating: Number(v.rating ?? 4.8),
      sessions: idx % 2 === 0 ? mockSessions : mockSessions.slice(0, 1),
      price: idx % 2 === 0 ? "70.000 đ/vé" : "60.000 đ/vé",
      joined: idx % 2 === 0 ? "0/8" : "0/16",
    }));
    return fromApi.length ? fromApi : MOCK_VENUES;
  }, [venues]);

  const openBookingPopup = (venueId) => {
    if (!venueId) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setSelectedVenueId(String(venueId));
    setShowBookingTypeModal(true);
  };

  const openEventRegister = (eventId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/event/${eventId}/register`);
  };

  return (
    <div className="ev-screen">

      <div className="ev-toolbar">
        <div className="ev-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên sân, địa chỉ"
          />
        </div>
        <button className="ev-filter" type="button" aria-label="Filters">
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <div className="ev-grid">
        {isLoading ? (
          <div className="ev-loading">Đang tải...</div>
        ) : (
          cards.map((v) => (
            <div key={v.id} className="ev-card">
              <div className="ev-image" onClick={() => navigate(`/venue/${v.id}`)} role="button" tabIndex={0}>
                <img src={v.image} alt={v.name} />
                <div className="ev-badges">
                  {v.badges?.map((b) => (
                    <span key={b} className={`ev-badge ${b === "Sự kiện" ? "event" : ""}`}>
                      {b}
                    </span>
                  ))}
                </div>
                <div className="ev-actions">
                  <button type="button" className="ev-icon-btn" onClick={(e) => e.stopPropagation()} aria-label="Favorite">
                    <Heart size={18} />
                  </button>
                  <button type="button" className="ev-icon-btn" onClick={(e) => e.stopPropagation()} aria-label="Share">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <div className="ev-body">
                <div className="ev-head">
                  <div className="ev-name">{v.name}</div>
                  <div className="ev-rating">
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <span>{(v.rating || 0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="ev-subline">
                  <span className="ev-price-pill">{v.price}</span>
                  <span className="ev-joined-pill">{v.joined}</span>
                </div>

                <div className="ev-sessions">
                  {v.sessions?.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="ev-session"
                      onClick={() => openEventRegister(s.id)}
                    >
                      <div className="ev-session-left">
                        <div className="ev-session-time">{s.time}</div>
                        <div className="ev-session-level">{s.level}</div>
                      </div>
                      <div className="ev-session-right">
                        <div className="ev-session-date">{s.date}</div>
                        <div className="ev-session-join">{s.joined}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <button className="ev-book" type="button" onClick={() => openBookingPopup(v.id)}>
                  ĐẶT LỊCH
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="ev-bottom-space" />

      <BookingTypeModal
        open={showBookingTypeModal}
        onClose={() => setShowBookingTypeModal(false)}
        venueId={selectedVenueId}
        onSelectRegular={() => {}}
        onSelectEvent={() => {}}
      />
    </div>
  );
};

export default Events;

