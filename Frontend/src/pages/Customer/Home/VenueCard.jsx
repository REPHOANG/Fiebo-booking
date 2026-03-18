import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Heart, Share2, TrendingUp } from "lucide-react";
import BookingTypeModal from "../../../components/common/BookingTypeModal/BookingTypeModal";
import { useState } from "react";

// ── Venue card component ──
export const VenueCard = ({ venue, isAuthenticated }) => {
  const navigate = useNavigate();
  const [showBookingTypeModal, setShowBookingTypeModal] = useState(false);
  return (
    <div
      className="ch-venue-card"
      onClick={() => navigate(`/venue/${venue.id}`)}
      style={{ cursor: "pointer" }}
    >
      <div className="ch-card-image">
        <img src={venue.image} alt={venue.name} />
        <div className="ch-card-badges">
          {venue.badges.map((badge, i) => (
            <span
              key={i}
              className={`ch-badge ${i === 0 ? "ch-badge-primary" : "ch-badge-event"}`}
            >
              {badge}
            </span>
          ))}
        </div>
        <div className="ch-card-actions">
          <button className="ch-card-action-btn">
            <Heart size={18} />
          </button>
          <button className="ch-card-action-btn">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      <div className="ch-card-info">
        <div className="ch-card-info-left">
          <img src={venue.logo} alt="" className="ch-venue-logo" />
        </div>
        <div className="ch-card-info-right">
          <h3 className="ch-venue-name">{venue.name}</h3>
          <p className="ch-venue-address">
            <span className="ch-distance">({venue.distance})</span>{" "}
            {venue.address}
          </p>
          <p className="ch-venue-hours">
            <Clock size={13} /> {venue.hours}
          </p>
          <p className="ch-venue-bookings">
            <TrendingUp size={13} /> {venue.bookings.toLocaleString()} lượt đặt
          </p>
        </div>
        <>
          <button
            className="ch-book-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBookingTypeModal(true);
            }}
          >
            ĐẶT LỊCH
          </button>
          <BookingTypeModal
            open={showBookingTypeModal}
            onClose={() => setShowBookingTypeModal(false)}
            venueId={venue.id}
            onSelectRegular={() => { /* no-op; BookingSchedule will handle draft */ }}
            onSelectEvent={() => { /* no-op */ }}
          />
        </>
      </div>
    </div>
  );
};