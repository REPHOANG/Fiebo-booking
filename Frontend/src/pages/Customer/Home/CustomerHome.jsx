import { useState, useEffect } from "react";
import { MapPin, TrendingUp, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import { useDispatch, useSelector } from "react-redux";
import { logout, AUTH_STORAGE_KEY } from "../../../store/authSlice";
import {
  getNearbyFields,
  getTopBookingFields,
} from "../../../services/fieldService";
import "./CustomerHome.css";
import { useQuery } from "@tanstack/react-query";
import { mapVenue } from "../../../utils/helperFunction";
import { VenueCard } from "./VenueCard";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import { VenueCardSkeleton } from "../../../components/ui/Loading/VenueCardSkeleton";
import ErrorPage from "../../../components/ui/Error/ErrorPage";

// Hà Nội mặc định khi không lấy được vị trí
const DEFAULT_LOCATION = { lat: 21.0285, lng: 105.8542, name: "Hà Nội" };

const CustomerHome = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [locationLoading, setLocationLoading] = useState(true);

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
      { timeout: 5000 },
    );
  }, []);

  // ── Fetch nearby venues from API ──
  const {
    data: nearbyVenues = [],
    isLoading: nearbyLoading,
    error: nearbyError,
  } = useQuery({
    queryKey: ["nearbyVenues", userLocation],
    queryFn: () =>
      getNearbyFields({
        userLat: userLocation.lat,
        userLng: userLocation.lng,
        limit: 6,
      }),
    enabled: !!userLocation,
    staleTime: 30 * 60 * 1000, //30min
    gcTime: 30 * 60 * 1000, //30min
  });

  const {
    data: popularVenues = [],
    isLoading: popularLoading,
    error: popularError,
  } = useQuery({
    queryKey: ["popularVenues", userLocation],
    queryFn: () =>
      getTopBookingFields({
        userLat: userLocation.lat,
        userLng: userLocation.lng,
        limit: 6,
      }),
    enabled: !!userLocation,
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const handleSearch = () => {
    const q = searchQuery.trim();
    navigate(q ? `/venues?search=${encodeURIComponent(q)}` : "/venues");
  };

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem("token");
    navigate("/");
  };

  if(nearbyError || popularError) {
    return <ErrorPage />
  }

  return (
    <div className="customer-home">
      {/* ===== SEARCH BAR ===== */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        scrolled={scrolled}
        isAuthenticated={isAuthenticated}
      />

      {/* ===== MAIN CONTENT ===== */}
      <main className="ch-main">
        {/* ── Section 1: Sân gần bạn ── */}
        <section className="ch-section">
          <div className="ch-section-header">
            <div className="ch-section-title-group">
              <Navigation size={20} className="ch-section-icon" />
              <h2 className="ch-section-title">Sân gần bạn</h2>
              {locationLoading ? (
                <span className="ch-location-tag loading">
                  Đang xác định...
                </span>
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
              Array.from({ length: 3 }).map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))
            ) : nearbyVenues.length === 0 ? (
              <p className="ch-empty-text">Không tìm thấy sân nào gần bạn</p>
            ) : (
              nearbyVenues.map((v) => {
                const venue = mapVenue(v);
                return (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    isAuthenticated={isAuthenticated}
                  />
                );
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
              Array.from({ length: 3 }).map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))
            ) : popularVenues.length === 0 ? (
              <p className="ch-empty-text">Không tìm thấy sân nổi bật</p>
            ) : (
              popularVenues.map((v) => {
                const venue = mapVenue(v);
                return (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    isAuthenticated={isAuthenticated}
                  />
                );
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
