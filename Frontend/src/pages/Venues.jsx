import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin, Star, Search, SlidersHorizontal, Frown, X, Clock,
  Calendar, MapPinned, ChevronLeft, ChevronRight, ImageIcon,
  MessageSquare, User, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { clearDraft } from '../store/bookingDraftSlice';
import { searchVenues, getVenueDetail, getVenueFields, getVenueReviews } from "../services/fieldService";
import "./Venues.css";

const SPORTS = [
  { label: "Tất cả", id: null },
  { label: "Bóng đá", id: 1 },
  { label: "Bóng rổ", id: 2 },
  { label: "Tennis", id: 3 },
  { label: "Pickleball", id: 4 },
  // { label: "Cầu lông", id: 5 },
];

const PAGE_SIZE = 8;

const formatTime = (timeSpan) => {
  if (!timeSpan) return "";
  const parts = String(timeSpan).split(":");
  return `${parts[0]}:${parts[1]}`;
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

/* ── Helpers ──────────────────────────────────────────────────── */
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} tuần trước`;
  return date.toLocaleDateString("vi-VN");
};

const renderStars = (rating) => {
  const stars = [];
  const full = Math.floor(rating || 0);
  const hasHalf = (rating || 0) - full >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} size={14} fill="#f59e0b" stroke="#f59e0b" />);
    } else if (i === full && hasHalf) {
      stars.push(
        <span key={i} style={{ position: "relative", display: "inline-flex" }}>
          <Star size={14} fill="#f59e0b" stroke="#f59e0b" style={{ clipPath: "inset(0 50% 0 0)" }} />
          <Star size={14} fill="none" stroke="#e2e8f0" style={{ position: "absolute", left: 0 }} />
        </span>
      );
    } else {
      stars.push(<Star key={i} size={14} fill="none" stroke="#e2e8f0" />);
    }
  }
  return stars;
};

/* ── Venue Detail Popup ──────────────────────────────────────── */
const VenuePopup = ({ venueId, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [venue, setVenue] = useState(null);
  const [fields, setFields] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [popupLoading, setPopupLoading] = useState(true);
  const [error, setError] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState({});

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setPopupLoading(true);
      try {
        const [v, f, r] = await Promise.all([
          getVenueDetail(venueId),
          getVenueFields(venueId),
          getVenueReviews(venueId, { page: 1, pageSize: 5 }),
        ]);
        setVenue(v);
        setFields(f?.items || []);
        setReviews(r?.items || []);
        setReviewTotal(r?.totalItems || 0);
        setReviewTotalPages(r?.totalPages || 0);
      } catch (err) {
        setError(err.message || "Không thể tải thông tin sân");
      } finally {
        setPopupLoading(false);
      }
    };
    fetchData();
  }, [venueId]);

  const loadMoreReviews = async () => {
    const next = reviewPage + 1;
    try {
      const data = await getVenueReviews(venueId, { page: next, pageSize: 5 });
      setReviews((prev) => [...prev, ...(data?.items || [])]);
      setReviewPage(next);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  const getFieldGalleryIdx = (fieldIdx) => galleryIndex[fieldIdx] || 0;
  const setFieldGalleryIdx = (fieldIdx, imgIdx) => setGalleryIndex((prev) => ({ ...prev, [fieldIdx]: imgIdx }));

  const address = venue ? [venue.addressDetail, venue.ward, venue.province].filter(Boolean).join(", ") : "";
  const mapUrl = venue?.latitude && venue?.longitude
    ? `https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`
    : null;

  return (
    <div className="vp-overlay" onClick={onClose}>
      <motion.div
        className="vp-container"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Sticky top bar */}
        <div className="vp-top-bar">
          <button className="vp-book-btn" onClick={() => { onClose(); try { dispatch(clearDraft(String(venueId))); } catch(e){}; navigate(`/venue/${venueId}/booking`); }}>
            <Calendar size={16} /> Đặt sân
          </button>
          <button className="vp-close" onClick={onClose}><X size={22} /></button>
        </div>

        {popupLoading ? (
          <div className="vp-loading">
            <Loader2 size={28} className="vp-spinner" />
            <p>Đang tải thông tin sân...</p>
          </div>
        ) : error || !venue ? (
          <div className="vp-error">
            <p>{error || "Không tìm thấy thông tin sân"}</p>
          </div>
        ) : (
          <div className="vp-content">
            {/* Header */}
            <div className="vp-header">
              <h2>{venue.name}</h2>
              <div className="vp-meta">
                <span className="vp-rating">
                  <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                  {venue.averageRating?.toFixed(1) || "0.0"}
                  <span className="vp-rating-count">({venue.ratingCount || 0})</span>
                </span>
                <span className="vp-badge">{venue.bookingCount || 0} lượt đặt</span>
              </div>
            </div>

            {/* Quick info */}
            <div className="vp-info-grid">
              {address && (
                <div className="vp-info-item">
                  <MapPin size={15} />
                  <span>{address}</span>
                </div>
              )}
              {venue.openTime && venue.closeTime && (
                <div className="vp-info-item">
                  <Clock size={15} />
                  <span>{formatTime(venue.openTime)} – {formatTime(venue.closeTime)}</span>
                </div>
              )}
              {mapUrl && (
                <div className="vp-info-item">
                  <MapPinned size={15} />
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer">Mở Google Maps</a>
                </div>
              )}
            </div>

            {/* Description */}
            {venue.description && (
              <div className="vp-description">
                <p>{venue.description}</p>
              </div>
            )}

            {/* Fields */}
            {fields.length > 0 && (
              <div className="vp-section">
                <h3><Calendar size={16} /> Sân ({fields.length})</h3>
                <div className="vp-fields">
                  {fields.map((field, fi) => {
                    const imgIdx = getFieldGalleryIdx(fi);
                    const imgs = field.images || [];
                    return (
                      <div key={fi} className="vp-field-card">
                        {imgs.length > 0 ? (
                          <div className="vp-field-gallery">
                            <img src={imgs[imgIdx]} alt={field.name} />
                            {imgs.length > 1 && (
                              <>
                                <button className="vp-fg-nav prev" onClick={() => setFieldGalleryIdx(fi, (imgIdx - 1 + imgs.length) % imgs.length)}>
                                  <ChevronLeft size={16} />
                                </button>
                                <button className="vp-fg-nav next" onClick={() => setFieldGalleryIdx(fi, (imgIdx + 1) % imgs.length)}>
                                  <ChevronRight size={16} />
                                </button>
                                <span className="vp-fg-counter">{imgIdx + 1}/{imgs.length}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="vp-field-placeholder"><ImageIcon size={24} /></div>
                        )}
                        <div className="vp-field-info">
                          <h4>{field.name}</h4>
                          {field.sportType && <span className="vp-sport-tag">{field.sportType}</span>}
                          {field.description && <p>{field.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="vp-section">
                <h3><MessageSquare size={16} /> Đánh giá ({reviewTotal})</h3>
                <div className="vp-reviews">
                  {reviews.map((r, i) => (
                    <div key={i} className="vp-review">
                      <div className="vp-review-top">
                        <div className="vp-review-avatar"><User size={14} /></div>
                        <span className="vp-review-name">{r.name || "Ẩn danh"}</span>
                        <span className="vp-review-time">{formatRelativeTime(r.createdAt)}</span>
                        <div className="vp-review-stars">{renderStars(r.rating)}</div>
                      </div>
                      {r.comment && <p className="vp-review-text">{r.comment}</p>}
                    </div>
                  ))}
                </div>
                {reviewPage < reviewTotalPages && (
                  <button className="vp-load-more" onClick={loadMoreReviews}>
                    Xem thêm đánh giá
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────── */
const Venues = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [venues, setVenues] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [inputValue, setInputValue] = useState(initialSearch);
  const [activeSport, setActiveSport] = useState(null); // null = all
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  // ...existing code...

  const observer = useRef();

  const loadPage = useCallback(async (pageToLoad, location, sportTypeId, date, time, reset = false) => {
    setLoading(true);
    try {
      const data = await searchVenues({
        location: location || undefined,
        date: date || undefined,
        time: time ? `${time}:00` : undefined,
        sportTypeId: sportTypeId || undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });

      const items = data?.items || [];
      if (reset) {
        setVenues(items);
      } else {
        setVenues((p) => [...p, ...items]);
      }
      setTotalItems(data?.totalItems || 0);
      setHasMore(pageToLoad < (data?.totalPages || 0));
    } catch (err) {
      console.error("Failed to search venues:", err);
      if (reset) setVenues([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + reload on filter change
  useEffect(() => {
    setPage(1);
    loadPage(1, searchTerm, activeSport, bookingDate, bookingTime, true);
  }, [searchTerm, activeSport, bookingDate, bookingTime, loadPage]);

  // Infinite scroll — load more
  useEffect(() => {
    if (page <= 1) return;
    loadPage(page, searchTerm, activeSport, bookingDate, bookingTime, false);
  }, [page, loadPage, searchTerm, activeSport, bookingDate, bookingTime]);

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

  // Debounced search
  const searchTimer = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchTerm(val);
      setPage(1);
    }, 400);
  };

  // Keep input and searchTerm in sync when URL initialSearch changes
  useEffect(() => {
    setInputValue(initialSearch);
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const handleSportClick = (sportId) => {
    setActiveSport(sportId);
  };

  const getLocation = (venue) => {
    const parts = [venue.ward, venue.province].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : venue.addressDetail || "Không rõ vị trí";
  };

  return (
    <div className="venues-screen screen-bg screen-bg-sport-static">
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
          <span className="stat-value">{totalItems}</span>
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
            value={inputValue}
            onChange={handleSearchChange}
          />
        </div>

        <div className="venues-datetime">
          <label className="vd-label">Ngày:</label>
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
          />
          <label className="vd-label">Giờ:</label>
          <input
            type="time"
            value={bookingTime}
            onChange={(e) => setBookingTime(e.target.value)}
          />
          <button className="vd-clear-dt" onClick={() => { setBookingDate(''); setBookingTime(''); }}>
            <X size={14} />
          </button>
        </div>

        {SPORTS.map((s) => (
          <button
            key={s.label}
            className={`filter-chip ${activeSport === s.id ? "active" : ""}`}
            onClick={() => handleSportClick(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {venues.length > 0 ? (
        <div className="venues-grid">
          {venues.map((venue, idx) => {
            const isLast = venues.length === idx + 1;
            return (
              <motion.div
                ref={isLast ? lastVenueRef : null}
                key={venue.venueId}
                className="venue-card"
                custom={idx % 8}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                onClick={() => navigate(`/venue/${venue.venueId}${bookingDate || bookingTime ? `?date=${bookingDate || ''}&time=${bookingTime || ''}` : ''}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="venue-image">
                  <img src={venue.thumbnailUrl || "/placeholder-venue.jpg"} alt={venue.venueName} loading="lazy" />
                  <span className="sport-badge">{venue.bookingCount || 0} lượt đặt</span>
                </div>
                <div className="venue-info">
                  <h3>{venue.venueName}</h3>
                  <p className="location">
                    <MapPin size={15} /> {getLocation(venue)}
                  </p>
                  <div className="rating-row">
                    <div className="rating">
                      <Star size={15} className="star" />
                      <span>{venue.rating?.toFixed(1) || "0.0"}</span>
                    </div>
                    {venue.openTime && venue.closeTime && (
                      <span className="price">{formatTime(venue.openTime)} - {formatTime(venue.closeTime)}</span>
                    )}
                  </div>
                  {venue.distanceKm != null && (
                    <p className="venue-distance">
                      <MapPin size={13} /> {venue.distanceKm.toFixed(1)} km
                    </p>
                  )}
                  <button className="book-btn" onClick={(e) => { e.stopPropagation(); navigate(`/venue/${venue.venueId}${bookingDate || bookingTime ? `?date=${bookingDate || ''}&time=${bookingTime || ''}` : ''}`); }}>
                    Xem chi tiết
                  </button>
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
      {!hasMore && venues.length > 0 && (
        <p className="venues-end">Bạn đã xem hết tất cả sân.</p>
      )}
      </div>
    </div>
  );
};

export default Venues;
