import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  ImageIcon,
  MessageSquare,
  User,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/landing/Header";
import { getVenueDetail, getVenueFields, getVenueReviews } from "../../services/fieldService";
import "./VenueDetail.css";
import { clearDraft } from '../../store/bookingDraftSlice';

/* ================================================================
   Helper – format TimeSpan from API ("HH:MM:SS") to "HH:MM"
   ================================================================ */
const formatTime = (timeSpan) => {
  if (!timeSpan) return "";
  const parts = String(timeSpan).split(":");
  return `${parts[0]}:${parts[1]}`;
};

/* ================================================================
   Helper – format relative time
   ================================================================ */
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

/* ================================================================
   Helper – render rating stars
   ================================================================ */
const renderStars = (rating) => {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} size={14} fill="#f59e0b" stroke="#f59e0b" />);
    } else if (i === full && hasHalf) {
      stars.push(
        <span key={i} className="vd-star-half">
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

/* ================================================================
   Sub-component – Field image gallery
   ================================================================ */
const FieldImageGallery = ({ images, fieldName }) => {
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <div className="vd-field-gallery">
      <div className="vd-field-gallery-main">
        <img src={images[current]} alt={`${fieldName} ${current + 1}`} />
        {images.length > 1 && (
          <>
            <button
              className="vd-fg-nav vd-fg-prev"
              onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="vd-fg-nav vd-fg-next"
              onClick={() => setCurrent((p) => (p + 1) % images.length)}
            >
              <ChevronRight size={18} />
            </button>
            <span className="vd-fg-counter">
              {current + 1}/{images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="vd-field-gallery-thumbs">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`${fieldName} thumb ${i + 1}`}
              className={`vd-fg-thumb${i === current ? " active" : ""}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   Sub-component – Field reviews
   ================================================================ */
const FieldReviews = ({ reviews }) => {
  const [showAll, setShowAll] = useState(false);
  if (!reviews || reviews.length === 0) return null;

  const visible = showAll ? reviews : reviews.slice(0, 2);

  return (
    <div className="vd-field-reviews">
      <h5 className="vd-field-reviews-title">
        <MessageSquare size={15} /> Đánh giá ({reviews.length})
      </h5>
      <div className="vd-field-reviews-list">
        {visible.map((r, i) => (
          <motion.div
            key={i}
            className="vd-review-item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="vd-review-header">
              <div className="vd-review-avatar">
                <User size={16} />
              </div>
              <div className="vd-review-meta">
                <span className="vd-review-name">{r.name}</span>
                <span className="vd-review-time">{r.time}</span>
              </div>
              <div className="vd-review-rating">
                {renderStars(r.rating)}
              </div>
            </div>
            <p className="vd-review-comment">{r.comment}</p>
          </motion.div>
        ))}
      </div>
      {reviews.length > 2 && (
        <button className="vd-reviews-toggle" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Thu gọn" : `Xem tất cả ${reviews.length} đánh giá`}
        </button>
      )}
    </div>
  );
};

/* ================================================================
   Sub-component – Venue reviews (full section shown under fields)
   ================================================================ */
const VenueReviews = ({ reviews, total, onLoadMore, page }) => {
  const [showAll, setShowAll] = useState(false);
  if (!reviews || reviews.length === 0) return (
    <div className="vd-reviews-empty">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá.</div>
  );

  const visible = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="vd-reviews">
      <div className="vd-field-reviews-list">
        {visible.map((r, i) => (
          <motion.div
            key={i}
            className="vd-review-item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="vd-review-header">
              <div className="vd-review-avatar"><User size={16} /></div>
              <div className="vd-review-meta">
                <span className="vd-review-name">{r.name || r.userName || 'Người dùng'}</span>
                <span className="vd-review-time">{formatRelativeTime(r.createdAt || r.time)}</span>
              </div>
              <div className="vd-review-rating">{renderStars(Number(r.rating || 0))}</div>
            </div>
            {r.comment && <p className="vd-review-comment">{r.comment}</p>}
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        {!showAll && total > visible.length && (
          <button className="vd-reviews-toggle" onClick={() => { setShowAll(true); if (onLoadMore) onLoadMore(); }}>
            Xem thêm
          </button>
        )}
        {showAll && page < Math.ceil(total / 10) && (
          <button className="vd-reviews-toggle" onClick={onLoadMore}>Tải thêm</button>
        )}
      </div>
    </div>
  );
};

/* ================================================================
   Sub-component – Field Card (expandable) — with API-loaded reviews
   ================================================================ */
const FieldCard = ({ field, venueId, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  const handleExpand = async () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
  };

  return (
    <motion.div
      className={`vd-field-card-v2${expanded ? " expanded" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      {/* Collapsed header — always visible */}
      <div className="vd-fc-header" onClick={handleExpand}>
        <div className="vd-fc-thumb">
          {field.images?.[0] ? (
            <img src={field.images[0]} alt={field.name} />
          ) : (
            <div className="vd-fc-thumb-placeholder"><ImageIcon size={20} /></div>
          )}
        </div>
        <div className="vd-fc-summary">
          <h4>{field.name}</h4>
          {field.sportType && <span className="vd-fc-sport-tag">{field.sportType}</span>}
        </div>
        <button className={`vd-fc-expand-btn${expanded ? " open" : ""}`}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="vd-fc-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="vd-fc-body-inner">
              {/* Description */}
              {field.description && <p className="vd-fc-description">{field.description}</p>}

              {/* Images */}
              <FieldImageGallery images={field.images} fieldName={field.name} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ================================================================
   Main Component
   ================================================================ */
const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get('date') || '';
  const prefillTime = searchParams.get('time') || '';
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [venue, setVenue] = useState(null);
  const [fields, setFields] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch venue detail + fields + reviews on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [venueData, fieldsData, reviewsData] = await Promise.all([
          getVenueDetail(id),
          getVenueFields(id),
          getVenueReviews(id, { page: 1, pageSize: 10 }),
        ]);
        setVenue(venueData);
        setFields(fieldsData?.items || []);
        setReviews(reviewsData?.items || []);
        setReviewTotal(reviewsData?.totalItems || 0);
        setReviewTotalPages(reviewsData?.totalPages || 0);
      } catch (err) {
        console.error("Failed to load venue:", err);
        setError(err.message || "Không thể tải thông tin sân");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Load more reviews
  const loadMoreReviews = async () => {
    const nextPage = reviewPage + 1;
    try {
      const data = await getVenueReviews(id, { page: nextPage, pageSize: 10 });
      setReviews((prev) => [...prev, ...(data?.items || [])]);
      setReviewPage(nextPage);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="customer-home">
        <Header />
        <div className="vd-loading">
          <Loader2 size={32} className="vd-spinner" />
          <p>Đang tải thông tin sân...</p>
        </div>
        {/* <Footer /> */}
      </div>
    );
  }

  /* ── Error / Not found ── */
  if (error || !venue) {
    return (
      <div className="customer-home">
        <Header />
        <div className="vd-not-found">
          <h2>Không tìm thấy sân</h2>
          <p>{error || "Sân bạn tìm kiếm không tồn tại."}</p>
          <button className="vd-back-btn" onClick={() => navigate("/home")}>
            ← Quay lại trang chủ
          </button>
        </div>
        {/* <Footer /> */}
      </div>
    );
  }

  const address = [venue.addressDetail, venue.ward, venue.province].filter(Boolean).join(", ");
  const mapSrc = venue.latitude && venue.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude - 0.005}%2C${venue.latitude - 0.004}%2C${venue.longitude + 0.005}%2C${venue.latitude + 0.004}&layer=mapnik&marker=${venue.latitude}%2C${venue.longitude}`
    : null;

  return (
    <div className="customer-home">
      <Header />

      <main className="vd-main">
        {/* Back button */}
        <button className="vd-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Quay lại
        </button>

        {/* ── Venue Info ── */}
        <div className="vd-content">
          <div className="vd-col-left">
            <div className="vd-info-section">
              <h1 className="vd-name">{venue.name}</h1>
              <div className="vd-meta">
                <Star size={14} fill="#f59e0b" stroke="#f59e0b" /> {venue.averageRating?.toFixed(1) || "0.0"}
                <span className="vd-reviews-count">({venue.ratingCount || 0} đánh giá)</span>
                <span className="vd-booking-count">{venue.bookingCount || 0} lượt đặt</span>
              </div>
              <div className="vd-quick-info">
                {address && (
                  <div className="vd-info-item">
                    <MapPin size={16} />
                    <span>{address}</span>
                  </div>
                )}
                <div className="vd-info-item">
                  <Clock size={16} />
                  <span>{formatTime(venue.openTime)} – {formatTime(venue.closeTime)}</span>
                </div>
              </div>
              {venue.description && (
                <div className="vd-description">
                  <h3>Giới thiệu</h3>
                  <p>{venue.description}</p>
                </div>
              )}
            </div>
            {mapSrc && (
              <div className="vd-map-section">
                <h3><MapPinned size={18} /> Vị trí trên bản đồ</h3>
                <div className="vd-map-wrapper">
                  <iframe
                    title="Venue location"
                    src={mapSrc}
                    className="vd-map-iframe"
                    loading="lazy"
                  />
                </div>
                <a
                  className="vd-map-link"
                  href={`https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={14} /> Mở trong Google Maps
                </a>
              </div>
            )}
            {fields.length > 0 && (
              <div className="vd-fields-section">
                <h3>
                  <Calendar size={18} /> Danh sách sân ({fields.length})
                </h3>
                <div className="vd-fields-list-v2">
                  {fields.map((field, i) => (
                    <FieldCard key={field.name + i} field={field} venueId={id} index={i} />
                  ))}
                </div>
              </div>
            )}
            {/* Venue-level reviews placed below fields */}
            <div className="vd-reviews-section" style={{ marginTop: 12 }}>
              <h3><MessageSquare size={18} /> Đánh giá</h3>
              <VenueReviews reviews={reviews} total={reviewTotal} onLoadMore={loadMoreReviews} page={reviewPage} />
            </div>
          </div>
         
        </div>
      </main>

      {/* Sticky booking button */}
      <div className="vd-booking-bar">
        <div className="vd-booking-bar-inner">
          <div className="vd-booking-bar-info">
            <span className="vd-booking-bar-name">{venue.name}</span>
            <span className="vd-booking-bar-time">
              <Clock size={14} /> {formatTime(venue.openTime)} – {formatTime(venue.closeTime)}
            </span>
          </div>
          <button
            className="vd-booking-btn"
            onClick={() => {
              try { dispatch(clearDraft(String(id))); } catch (e) {}
              navigate(`/venue/${id}/booking${prefillDate || prefillTime ? `?date=${prefillDate || ''}&time=${prefillTime || ''}` : ''}`, { state: { forceReload: true } });
            }}
          >
            <Calendar size={18} />
            Đặt sân
          </button>
        </div>
      </div>

      {/* <Footer /> */}
    </div>
  );
};

export default VenueDetail;
