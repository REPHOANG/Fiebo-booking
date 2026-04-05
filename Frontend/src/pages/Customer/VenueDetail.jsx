import React, { useState, useEffect, useRef, useCallback } from "react";
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
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/landing/Header";
import BookingTypeModal from "../../components/common/BookingTypeModal/BookingTypeModal";
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

const getFieldListKey = (field, index) =>
  field?.id ?? field?.fieldId ?? `${field?.name || "field"}-${index}`;

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
   Field carousel tile + modal detail
   ================================================================ */
const FieldCarouselTile = ({ field, index, onOpen }) => (
  <motion.button
    type="button"
    className="vd-field-carousel-tile"
    aria-label={`Xem chi tiết sân ${field.name}`}
    onClick={() => onOpen(field)}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.04, duration: 0.25 }}
  >
    <div className="vd-fct-media">
      {field.images?.[0] ? (
        <img src={field.images[0]} alt="" role="presentation" />
      ) : (
        <div className="vd-fct-placeholder">
          <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
        </div>
      )}
    </div>
    <div className="vd-fct-body">
      <span className="vd-fct-title">{field.name}</span>
      {field.sportType ? <span className="vd-fct-sport">{field.sportType}</span> : null}
    </div>
    <span className="vd-fct-hint" aria-hidden>
      <ChevronRight size={16} strokeWidth={2.5} />
    </span>
  </motion.button>
);

const FieldDetailModal = ({ field, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <motion.div
      className="vd-field-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="vd-field-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vd-field-modal-title"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="vd-field-modal-close" onClick={onClose} aria-label="Đóng">
          <X size={22} />
        </button>
        <h3 id="vd-field-modal-title" className="vd-field-modal-title">
          {field.name}
        </h3>
        {field.sportType ? <p className="vd-field-modal-sport">{field.sportType}</p> : null}
        {field.description ? <p className="vd-field-modal-desc">{field.description}</p> : null}
        {field.images?.length ? (
          <FieldImageGallery key={field.name} images={field.images} fieldName={field.name} />
        ) : (
          <div className="vd-field-modal-no-img">
            <ImageIcon size={36} strokeWidth={1.25} />
            <span>Chưa có ảnh sân</span>
          </div>
        )}
      </motion.div>
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
  const openBookingModal = searchParams.get('book') === '1';
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
  const [showBookingTypeModal, setShowBookingTypeModal] = useState(false);
  const [fieldModal, setFieldModal] = useState(null);
  const fieldsCarouselRef = useRef(null);

  const scrollFieldsCarousel = useCallback((dir) => {
    const el = fieldsCarouselRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.72, 300);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

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

  // Open booking type modal when navigated with ?book=1
  useEffect(() => {
    if (!openBookingModal) return;
    setShowBookingTypeModal(true);
  }, [openBookingModal, isAuthenticated]);

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
                <span className="vd-fields-count">{fields.length} sân</span>
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
                <div className="vd-fields-section-head">
                  <h2 className="vd-fields-heading">
                    <Calendar size={20} strokeWidth={2} className="vd-fields-heading-icon" aria-hidden />
                    Danh sách sân ({fields.length})
                  </h2>
                </div>
                <div className="vd-fields-carousel-shell">
                  <button
                    type="button"
                    className="vd-fields-carousel-arrow vd-fields-carousel-arrow--prev"
                    onClick={() => scrollFieldsCarousel(-1)}
                    aria-label="Cuộn danh sách sang trái"
                  >
                    <ChevronLeft size={22} strokeWidth={2} />
                  </button>
                  <div ref={fieldsCarouselRef} className="vd-fields-carousel">
                    {fields.map((field, i) => (
                      <FieldCarouselTile
                        key={getFieldListKey(field, i)}
                        field={field}
                        index={i}
                        onOpen={setFieldModal}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="vd-fields-carousel-arrow vd-fields-carousel-arrow--next"
                    onClick={() => scrollFieldsCarousel(1)}
                    aria-label="Cuộn danh sách sang phải"
                  >
                    <ChevronRight size={22} strokeWidth={2} />
                  </button>
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
            <span className="vd-booking-bar-fields">{fields.length} sân</span>
          </div>
          <button
            className="vd-booking-btn"
            onClick={() => {
              setShowBookingTypeModal(true);
            }}
          >
            <Calendar size={18} />
            Đặt sân
          </button>
        </div>
      </div>

      {/* <Footer /> */}
      <BookingTypeModal
        open={showBookingTypeModal}
        onClose={() => setShowBookingTypeModal(false)}
        venueId={id}
        onSelectRegular={() => { try { dispatch(clearDraft(String(id))); } catch (e) {} }}
        onSelectEvent={() => { try { dispatch(clearDraft(String(id))); } catch (e) {} }}
      />

      <AnimatePresence>
        {fieldModal ? (
          <FieldDetailModal
            key={fieldModal.id ?? fieldModal.fieldId ?? fieldModal.name}
            field={fieldModal}
            onClose={() => setFieldModal(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default VenueDetail;
