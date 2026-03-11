import React, { useState, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  Map,
  CheckSquare,
  Heart,
  Share2,
  Clock,
  MapPin,
  TrendingUp,
  Navigation,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/authSlice";
import { getNearbyFields, getTopBookingFields } from "../../services/fieldService";
import "./CustomerHome.css";
// Header and Footer are provided by Layout; remove local renders to avoid duplicates

// Hà Nội mặc định khi không lấy được vị trí
const DEFAULT_LOCATION = { lat: 21.0285, lng: 105.8542, name: "Hà Nội" };

const CustomerHome = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [locationLoading, setLocationLoading] = useState(true);

  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [nearbyError, setNearbyError] = useState(null);

  const [popularVenues, setPopularVenues] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularError, setPopularError] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lấy vị trí người dùng, fallback về Hà Nội
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_LOCATION);
      setLocationName(DEFAULT_LOCATION.name);
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: "",
        };
        setUserLocation(loc);
        setLocationName("Vị trí của bạn");
        setLocationLoading(false);
      },
      () => {
        // Không lấy được vị trí → fallback Hà Nội
        setUserLocation(DEFAULT_LOCATION);
        setLocationName(DEFAULT_LOCATION.name);
        setLocationLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  // ── Fetch nearby venues from API ──
  useEffect(() => {
    if (!userLocation) return;

    const fetchNearby = async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      try {
        const data = await getNearbyFields({
          userLat: userLocation.lat,
          userLng: userLocation.lng,
          limit: 6,
        });
        setNearbyVenues(data || []);
      } catch (err) {
        console.error("Failed to fetch nearby venues:", err);
        setNearbyError(err.message || "Không thể tải sân gần bạn");
      } finally {
        setNearbyLoading(false);
      }
    };

    const fetchPopular = async () => {
      setPopularLoading(true);
      setPopularError(null);
      try {
        const data = await getTopBookingFields({
          userLat: userLocation.lat,
          userLng: userLocation.lng,
          limit: 6,
        });
        setPopularVenues(data || []);
      } catch (err) {
        console.error("Failed to fetch popular venues:", err);
        setPopularError(err.message || "Không thể tải sân nổi bật");
      } finally {
        setPopularLoading(false);
      }
    };

    fetchNearby();
    fetchPopular();
  }, [userLocation]);

  // ── Helper: format TimeSpan "HH:MM:SS" → "HH:MM" ──
  const formatTime = (t) => {
    if (!t) return "";
    const parts = t.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  // ── Helper: map API response → VenueCard props ──
  const mapVenue = (v) => ({
    id: v.venueId,
    name: v.venueName || "Chưa có tên",
    logo: v.thumbnailUrl || "https://placehold.co/100x100?text=Logo",
    image: v.thumbnailUrl || "https://placehold.co/800x400?text=Venue",
    distance: v.distanceKm != null ? `${v.distanceKm.toFixed(1)}km` : "",
    address: [v.ward, v.province].filter(Boolean).join(", ") || v.addressDetail || "",
    hours: `${formatTime(v.openTime)} - ${formatTime(v.closeTime)}`,
    badges: ["Đơn ngày"],
    rating: v.rating,
    bookings: v.bookingCount || 0,
  });



  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/venues?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("authState");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  // ── Venue card component ──
  const VenueCard = ({ venue }) => (
    <div className="ch-venue-card" onClick={() => navigate(`/venue/${venue.id}`)} style={{ cursor: 'pointer' }}>
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
            <span className="ch-distance">({venue.distance})</span> {venue.address}
          </p>
          <p className="ch-venue-hours">
            <Clock size={13} /> {venue.hours}
          </p>
          <p className="ch-venue-bookings">
            <TrendingUp size={13} /> {venue.bookings.toLocaleString()} lượt đặt
          </p>
        </div>
        <button
          className="ch-book-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!isAuthenticated) navigate("/login");
            else navigate(`/venue/${venue.id}`);
          }}
        >
          ĐẶT LỊCH
        </button>
      </div>
    </div>
  );

  return (
    <div className="customer-home">

      {/* ===== SEARCH BAR ===== */}
      <div className={`ch-search-section ${scrolled ? "ch-search-scrolled" : ""}`}>
        <div className="ch-search-bar">
          <div className="ch-search-icon-left">
            <button type="button" className="ch-search-icon-btn" onClick={handleSearch} aria-label="Tìm kiếm">
              <Search size={18} />
            </button>
          </div>
          <input
            type="text"
            className="ch-search-input"
            placeholder="Tìm kiếm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="ch-filter-btn">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="ch-nav-tabs">
          <button className="ch-nav-tab">
            <Map size={16} />
            <span>Bản đồ</span>
          </button>
          <button className="ch-nav-tab" onClick={() => !isAuthenticated && navigate("/login")}>
            <CheckSquare size={16} />
            <span>Sân đã đặt</span>
          </button>
          <button className="ch-nav-tab" onClick={() => !isAuthenticated && navigate("/login")}>
            <Heart size={16} fill="#22c55e" />
            <span>Yêu thích</span>
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="ch-main">

        {/* ── Section 1: Sân gần bạn ── */}
        <section className="ch-section">
          <div className="ch-section-header">
            <div className="ch-section-title-group">
              <Navigation size={20} className="ch-section-icon" />
              <h2 className="ch-section-title">Sân gần bạn</h2>
              {locationLoading ? (
                <span className="ch-location-tag loading">Đang xác định...</span>
              ) : (
                <span className="ch-location-tag">
                  <MapPin size={13} /> {locationName}
                </span>
              )}
            </div>
            <button className="ch-see-all-btn">Xem tất cả →</button>
          </div>
          <div className="ch-venue-grid">
            {nearbyLoading ? (
              <p className="ch-loading-text">Đang tải sân gần bạn...</p>
            ) : nearbyError ? (
              <p className="ch-error-text">{nearbyError}</p>
            ) : nearbyVenues.length === 0 ? (
              <p className="ch-empty-text">Không tìm thấy sân nào gần bạn</p>
            ) : (
              nearbyVenues.map((v) => {
                const venue = mapVenue(v);
                return <VenueCard key={venue.id} venue={venue} />;
              })
            )}
          </div>
        </section>

        {/* ── Section 2: Sân nổi bật ── */}
        <section className="ch-section">
          <div className="ch-section-header">
            <div className="ch-section-title-group">
              <TrendingUp size={20} className="ch-section-icon" />
              <h2 className="ch-section-title">Sân nổi bật</h2>
              <span className="ch-section-subtitle">Nhiều lượt đặt nhất</span>
            </div>
            <button className="ch-see-all-btn">Xem tất cả →</button>
          </div>
          <div className="ch-venue-grid">
            {popularLoading ? (
              <p className="ch-loading-text">Đang tải sân nổi bật...</p>
            ) : popularError ? (
              <p className="ch-error-text">{popularError}</p>
            ) : popularVenues.length === 0 ? (
              <p className="ch-empty-text">Không tìm thấy sân nổi bật</p>
            ) : (
              popularVenues.map((v) => {
                const venue = mapVenue(v);
                return <VenueCard key={venue.id} venue={venue} />;
              })
            )}
          </div>
        </section>

      </main>

      {/* Footer rendered by Layout when present */}
    </div>
  );
};

export default CustomerHome;
