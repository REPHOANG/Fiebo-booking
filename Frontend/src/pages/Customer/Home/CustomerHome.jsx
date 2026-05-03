import { useState } from "react";
import { MapPin, TrendingUp, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import { useSelector } from "react-redux";
import {
  getNearbyFields,
  getTopBookingFields,
} from "../../../services/fieldService";
import "./CustomerHome.css";
import { useQuery } from "@tanstack/react-query";
import { mapVenue } from "../../../utils/helperFunction";
import { VenueCard } from "./VenueCard";
import { VenueCardSkeleton } from "../../../components/ui/Loading/VenueCardSkeleton";
import ErrorPage from "../../../components/ui/Error/ErrorPage";

const getStoredLocation = () => {
  try {
    const stored = localStorage.getItem("userLocation");
    if (stored) {
      const coords = JSON.parse(stored);
      return { lat: coords.latitude, lng: coords.longitude };
    }
  } catch { }
  return null;
};

const CustomerHome = () => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation] = useState(() => getStoredLocation());
  const locationName = userLocation ? "Vị trí của bạn" : "Tất cả khu vực";

  // ── Fetch nearby venues from API ──
  const {
    data: nearbyVenues = [],
    isLoading: nearbyLoading,
    error: nearbyError,
  } = useQuery({
    queryKey: ["nearbyVenues", userLocation],
    queryFn: () =>
      getNearbyFields({
        userLat: userLocation?.lat ?? null,
        userLng: userLocation?.lng ?? null,
        limit: 6,
      }),
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const {
    data: popularVenues = [],
    isLoading: popularLoading,
    error: popularError,
  } = useQuery({
    queryKey: ["popularVenues", userLocation],
    queryFn: () =>
      getTopBookingFields({
        userLat: userLocation?.lat ?? null,
        userLng: userLocation?.lng ?? null,
        limit: 6,
      }),
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const handleSearch = () => {
    const q = searchQuery.trim();
    navigate(q ? `/venues?search=${encodeURIComponent(q)}` : "/venues");
  };

  if (nearbyError || popularError) {
    return <ErrorPage />
  }

  return (
    <div className="customer-home">
      {/* ===== SEARCH BAR ===== */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
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
              <span className="ch-location-tag">
                <MapPin size={13} /> {locationName}
              </span>
            </div>
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
