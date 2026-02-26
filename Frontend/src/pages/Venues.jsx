import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Star } from "lucide-react";
import "../components/landing/Home.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:8080";

const Venues = () => {
  const [venues, setVenues] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef();

  const loadPage = useCallback(async (pageToLoad) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/venues?page=${pageToLoad}&pageSize=8`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      // Expect backend to return { items: [...], totalPages: x } or similar
      const items = data.items || data.venues || data;
      if (Array.isArray(items) && items.length > 0) {
        setVenues((p) => [...p, ...items]);
        // If fewer than requested, assume no more
        if (items.length < 8) setHasMore(false);
      } else {
        // fallback: no more
        setHasMore(false);
      }
    } catch (err) {
      // On error, append some mocked items so UI still demonstrates infinite scroll
      const mock = Array.from({ length: 8 }).map((_, i) => ({
        id: `m-${pageToLoad}-${i}`,
        name: `Sân mẫu ${pageToLoad}-${i + 1}`,
        location: "Hà Nội",
        image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop",
        rating: (4 + Math.random()).toFixed(1),
        reviews: Math.floor(Math.random() * 300),
        price: "200.000đ/giờ",
        sport: "Pickleball",
      }));
      setVenues((p) => [...p, ...mock]);
      // Stop after a few mock pages
      if (pageToLoad >= 4) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(page);
  }, [page, loadPage]);

  const lastVenueRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  return (
    <div className="container" style={{ paddingBottom: 90 }}>
      <h1 style={{ margin: "18px 0" }}>Danh sách sân</h1>

      <div className="venues-grid">
        {venues.map((venue, idx) => {
          const isLast = venues.length === idx + 1;
          return (
            <div
              ref={isLast ? lastVenueRef : null}
              key={venue.id}
              className="venue-card"
              style={{ marginBottom: 16 }}
            >
              <div className="venue-image">
                <img src={venue.image} alt={venue.name} />
                <span className="sport-badge">{venue.sport}</span>
              </div>
              <div className="venue-info">
                <h3>{venue.name}</h3>
                <p className="location">
                  <MapPin size={16} /> {venue.location}
                </p>
                <div className="rating-row">
                  <div className="rating">
                    <Star size={16} className="star" />
                    <span>{venue.rating}</span>
                    <span className="reviews">({venue.reviews} đánh giá)</span>
                  </div>
                  <span className="price">{venue.price}</span>
                </div>
                <button className="book-btn">Đặt Ngay</button>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p style={{ textAlign: "center", padding: 16 }}>Đang tải...</p>}
      {!hasMore && <p style={{ textAlign: "center", padding: 16 }}>Không còn sân để hiển thị.</p>}
    </div>
  );
};

export default Venues;
