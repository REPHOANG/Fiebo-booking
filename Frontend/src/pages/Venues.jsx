import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Star, Search, SlidersHorizontal, Frown } from "lucide-react";
import { motion } from "framer-motion";
import "./Venues.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:8080";

const SPORTS = ["Tất cả", "Bóng đá", "Cầu lông", "Pickleball", "Bóng rổ", "Tennis"];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

const Venues = () => {
  const [venues, setVenues] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSport, setActiveSport] = useState("Tất cả");

  const observer = useRef();

  const loadPage = useCallback(async (pageToLoad) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/venues?page=${pageToLoad}&pageSize=8`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      const items = data.items || data.venues || data;
      if (Array.isArray(items) && items.length > 0) {
        setVenues((p) => [...p, ...items]);
        if (items.length < 8) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch {
      const sports = ["Bóng đá", "Cầu lông", "Pickleball", "Bóng rổ", "Tennis"];
      const images = [
        "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&h=400&fit=crop",
      ];
      const locations = ["Quận 1, TP.HCM", "Cầu Giấy, Hà Nội", "Hải Châu, Đà Nẵng", "Ninh Kiều, Cần Thơ", "Thanh Xuân, Hà Nội"];
      const mock = Array.from({ length: 8 }).map((_, i) => {
        const si = (pageToLoad * 3 + i) % sports.length;
        return {
          id: `m-${pageToLoad}-${i}`,
          name: `Sân ${sports[si]} ${pageToLoad * 8 + i + 1}`,
          location: locations[(pageToLoad + i) % locations.length],
          image: images[si],
          rating: (4 + Math.random()).toFixed(1),
          reviews: Math.floor(50 + Math.random() * 300),
          price: `${(150 + Math.floor(Math.random() * 200)).toLocaleString("vi-VN")}.000đ/giờ`,
          sport: sports[si],
        };
      });
      setVenues((p) => [...p, ...mock]);
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

  /* ── Filtered list ──────────────────────────────────────────── */
  const filtered = venues.filter((v) => {
    const matchSearch =
      !searchTerm ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSport = activeSport === "Tất cả" || v.sport === activeSport;
    return matchSearch && matchSport;
  });

  return (
    <div className="venues-page">
      {/* Hero heading */}
      <div className="venues-hero">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          Khám phá sân thể thao
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
          Tìm &amp; đặt sân nhanh chóng — hàng trăm địa điểm trên&nbsp;toàn&nbsp;quốc
        </motion.p>
      </div>

      {/* Quick stats */}
      <div className="venues-stats">
        <div className="stat-item">
          <span className="stat-value">{venues.length}+</span>
          <span className="stat-label">Sân khả dụng</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">5</span>
          <span className="stat-label">Môn thể thao</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">10+</span>
          <span className="stat-label">Thành phố</span>
        </div>
      </div>

      {/* Filters */}
      <div className="venues-filters">
        <div className="venues-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên sân hoặc địa điểm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {SPORTS.map((s) => (
          <button
            key={s}
            className={`filter-chip ${activeSport === s ? "active" : ""}`}
            onClick={() => setActiveSport(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="venues-grid">
          {filtered.map((venue, idx) => {
            const isLast = filtered.length === idx + 1;
            return (
              <motion.div
                ref={isLast ? lastVenueRef : null}
                key={venue.id}
                className="venue-card"
                custom={idx % 8}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
              >
                <div className="venue-image">
                  <img src={venue.image} alt={venue.name} loading="lazy" />
                  <span className="sport-badge">{venue.sport}</span>
                </div>
                <div className="venue-info">
                  <h3>{venue.name}</h3>
                  <p className="location">
                    <MapPin size={15} /> {venue.location}
                  </p>
                  <div className="rating-row">
                    <div className="rating">
                      <Star size={15} className="star" />
                      <span>{venue.rating}</span>
                      <span className="reviews">({venue.reviews} đánh giá)</span>
                    </div>
                    <span className="price">{venue.price}</span>
                  </div>
                  <button className="book-btn">Đặt Ngay</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="venues-empty">
          <Frown size={52} />
          <h3>Không tìm thấy sân nào</h3>
          <p>Hãy thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
        </div>
      ) : null}

      {/* Loading */}
      {loading && (
        <div className="venues-loading">
          <div className="loading-spinner" />
          <span>Đang tải thêm sân...</span>
        </div>
      )}

      {/* End */}
      {!hasMore && filtered.length > 0 && (
        <p className="venues-end">Bạn đã xem hết tất cả sân.</p>
      )}
    </div>
  );
};

export default Venues;
