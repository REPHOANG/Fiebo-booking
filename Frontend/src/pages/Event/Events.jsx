import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Heart, Share2, SlidersHorizontal, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEventList } from "../../services/eventService";
import "./Events.css";
import { formatDate, formatPrice, formatTime } from "../../utils/helperFunction";



const Events = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["dropin-events"],
    queryFn: async () => {
      const res = await getEventList();
      return Array.isArray(res) ? res : [];
    },
    staleTime: 60 * 1000,
  });

  const cards = useMemo(() => {
    const mapByVenue = new Map();
    const keyword = String(query || "").trim().toLowerCase();

    for (const e of events || []) {
      const venueName = e?.venueName || "Sân";
      const eventName = e?.name || e?.Name || e?.title || e?.Title || `Sự kiện #${e?.eventId ?? ""}`;
      const venueId = e?.venueId ?? e?.VenueId ?? null;
      if (
        keyword
        && !venueName.toLowerCase().includes(keyword)
        && !String(eventName).toLowerCase().includes(keyword)
      ) {
        continue;
      }

      const slots = Array.isArray(e?.slots) ? e.slots : [];
      const first = slots[0];
      const last = slots[slots.length - 1];
      const capacity = Number(e?.ticketQuantity ?? e?.TicketQuantity ?? 0);
      const remaining = Number(e?.remainingTicketQuantity ?? e?.RemainingTicketQuantity ?? capacity);
      const joined = Math.max(0, capacity - remaining);
      const joinLabel = capacity > 0 ? `${joined}/${capacity}` : (remaining > 0 ? `Còn ${remaining} vé` : "Hết vé");

      const session = {
        id: e?.eventId,
        title: eventName,
        time:
          first && last
            ? `${formatTime(first?.startTime)} - ${formatTime(last?.endTime)}`
            : "—",
        date: formatDate(e?.eventDate),
        joined: joinLabel,
        level: "Drop-in",
      };

      if (!mapByVenue.has(venueName)) {
        mapByVenue.set(venueName, {
          id: venueName,
          venueId,
          name: venueName,
          image: `https://placehold.co/900x600/png?text=${encodeURIComponent(venueName)}`,
          badges: ["Đơn ngày", "Sự kiện"],
          rating: 0,
          price: formatPrice(e?.ticketPrice ?? e?.TicketPrice),
          joined: joinLabel,
          sessions: [session],
        });
      } else {
        mapByVenue.get(venueName).sessions.push(session);
      }
    }

    return Array.from(mapByVenue.values());
  }, [events, query]);

  const emptyMessage = useMemo(() => {
    const keyword = String(query || "").trim();
    if (keyword) {
      return {
        title: "Không tìm thấy sự kiện phù hợp",
        description: `Hiện chưa có sự kiện nào khớp với từ khóa "${keyword}".`,
      };
    }

    return {
      title: "Hiện chưa có sự kiện",
      description: "Các buổi giao lưu và sự kiện mới sẽ xuất hiện tại đây khi được mở đăng ký.",
    };
  }, [query]);

  const openVenueEvents = async (eventId) => {
    if (!eventId) return;
  navigate(`/event/${eventId}`);
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
        ) : cards.length === 0 ? (
          <div className="ev-empty">
            <div className="ev-empty-icon">
              <CalendarDays size={24} />
            </div>
            <h3 className="ev-empty-title">{emptyMessage.title}</h3>
            <p className="ev-empty-text">{emptyMessage.description}</p>
          </div>
        ) : (
          cards.map((v) => (
            <div key={v.id} className="ev-card">
                <div
                  className="ev-image"
                  onClick={() => {
                    if (v.venueId) navigate(`/venue/${v.venueId}`);
                  }}
                  role="button"
                  tabIndex={0}
                >
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
                  {(v.sessions || []).slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="ev-session"
                      onClick={() => openVenueEvents(s.id)}
                    >
                      <div className="ev-session-left">
                        <div className="ev-session-title">{s.title}</div>
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
                {(v.sessions || []).length > 3 && (
                  <button
                    type="button"
                    className="ev-expand"
                    onClick={() => navigate(`/venue/${v.venueId}/events`)}
                  >
                    {`Xem thêm ${(v.sessions || []).length - 3} sự kiện`}
                  </button>
                )}

                <button
                  className="ev-book"
                  type="button"
                  onClick={() => navigate(`/venue/${v.venueId}/events`)}
                >
                  ĐẶT LỊCH
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="ev-bottom-space" />
    </div>
  );
};

export default Events;

