import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Heart,
  Share2,
  Clock,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  ImageIcon,
  MessageSquare,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/landing/Header";
import Footer from "../../components/landing/Footer";
import "./VenueDetail.css";

/* ================================================================
   Mock data — sẽ thay bằng API call sau
   ================================================================ */
const MOCK_VENUES = {
  1: {
    id: 1,
    name: "Sân Bóng Đá Milan",
    thumbnail: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200",
    address: "123 Xuân Thủy, Cầu Giấy, Hà Nội",
    openTime: "05:00",
    closeTime: "22:00",
    rating: 4.5,
    totalReviews: 128,
    description:
      "Sân bóng đá Milan là hệ thống sân cỏ nhân tạo chất lượng cao tại Cầu Giấy. Với 4 sân 5 người và 2 sân 7 người, được trang bị hệ thống đèn chiếu sáng hiện đại, phù hợp cho cả tập luyện và thi đấu.",
    latitude: 21.038194,
    longitude: 105.782577,
    phone: "0986 879 389",
    sport: "Bóng Đá",
    fields: [
      {
        id: "f1",
        name: "Sân 5A",
        description: "Sân cỏ nhân tạo 5 người, mặt sân mới thay, hệ thống đèn LED chiếu sáng tốt vào ban đêm.",
        rating: 4.6,
        images: [
          "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800",
          "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
        ],
        reviews: [
          { name: "Minh Tuấn", time: "2 ngày trước", comment: "Sân rất đẹp, cỏ mới, chơi rất thích!", rating: 5 },
          { name: "Hoàng Anh", time: "1 tuần trước", comment: "Đèn sáng, sân sạch, giá hợp lý.", rating: 4 },
          { name: "Đức Mạnh", time: "2 tuần trước", comment: "Chất lượng ổn, nên đặt trước vì hay kín.", rating: 4 },
        ],
      },
      {
        id: "f2",
        name: "Sân 5B",
        description: "Sân cỏ nhân tạo 5 người tiêu chuẩn, có mái che một phần, phù hợp chơi cả trời mưa.",
        rating: 4.3,
        images: [
          "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800",
        ],
        reviews: [
          { name: "Văn Hải", time: "3 ngày trước", comment: "Có mái che tiện lợi, sân ổn.", rating: 4 },
          { name: "Quốc Bảo", time: "1 tuần trước", comment: "Cỏ hơi cũ nhưng vẫn chơi được.", rating: 3 },
        ],
      },
      {
        id: "f3",
        name: "Sân 7A",
        description: "Sân 7 người rộng rãi, cỏ nhân tạo cao cấp FIFA Quality, phù hợp thi đấu phong trào.",
        rating: 4.8,
        images: [
          "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
          "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
          "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800",
        ],
        reviews: [
          { name: "Thành Đạt", time: "1 ngày trước", comment: "Sân đẹp nhất khu vực, cỏ êm chân.", rating: 5 },
          { name: "Bá Phước", time: "5 ngày trước", comment: "Rộng, sạch sẽ, thoáng mát. Rất hài lòng!", rating: 5 },
          { name: "Hữu Nghĩa", time: "1 tuần trước", comment: "Chất lượng tốt, giá hơi cao nhưng xứng đáng.", rating: 4 },
          { name: "Trí Dũng", time: "2 tuần trước", comment: "Sân to, đẹp, ánh sáng tốt.", rating: 5 },
        ],
      },
    ],
  },
  2: {
    id: 2,
    name: "Sân Tennis Premier Club",
    thumbnail: "https://images.unsplash.com/photo-1554284154-83cb3142d9c1?w=1200",
    address: "45 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    openTime: "05:00",
    closeTime: "22:00",
    rating: 4.7,
    totalReviews: 96,
    description:
      "Premier Club Tennis là sân tennis tiêu chuẩn quốc tế với mặt sân hard court chất lượng cao. Phù hợp cho mọi trình độ từ nghiệp dư đến chuyên nghiệp.",
    latitude: 21.000841,
    longitude: 105.817073,
    phone: "0912 345 678",
    sport: "Tennis",
    fields: [
      {
        id: "f4",
        name: "Sân A - Hard Court",
        description: "Mặt sân hard court tiêu chuẩn ITF, có đèn chiếu sáng ban đêm.",
        rating: 4.8,
        images: [
          "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800",
          "https://images.unsplash.com/photo-1554284154-83cb3142d9c1?w=800",
        ],
        reviews: [
          { name: "Thu Hà", time: "1 ngày trước", comment: "Mặt sân rất tốt, bounce chuẩn.", rating: 5 },
          { name: "Quang Vinh", time: "3 ngày trước", comment: "Sân đẹp, sạch sẽ, nhân viên thân thiện.", rating: 5 },
        ],
      },
      {
        id: "f5",
        name: "Sân B - Hard Court",
        description: "Mặt sân hard court, vị trí thoáng gió, được bảo trì thường xuyên.",
        rating: 4.5,
        images: [
          "https://images.unsplash.com/photo-1554284154-83cb3142d9c1?w=800",
        ],
        reviews: [
          { name: "Minh Châu", time: "5 ngày trước", comment: "Sân ổn, giá cả phải chăng.", rating: 4 },
        ],
      },
      {
        id: "f6",
        name: "Sân C - Clay Court",
        description: "Mặt sân đất nện, giảm chấn thương khớp gối, trải nghiệm Roland Garros.",
        rating: 4.9,
        images: [
          "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800",
        ],
        reviews: [
          { name: "Ngọc Lan", time: "2 ngày trước", comment: "Mặt đất nện rất êm, chơi cả buổi không đau chân.", rating: 5 },
          { name: "Hải Đăng", time: "1 tuần trước", comment: "Trải nghiệm clay court tuyệt vời ngay tại HN!", rating: 5 },
        ],
      },
    ],
  },
  3: {
    id: 3,
    name: "Sân Cầu Lông Pro",
    thumbnail: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200",
    address: "78 Tôn Đức Thắng, Đống Đa, Hà Nội",
    openTime: "05:00",
    closeTime: "23:00",
    rating: 4.3,
    totalReviews: 74,
    description:
      "Sân Cầu Lông Pro với hệ thống 8 sân tiêu chuẩn, sàn gỗ phủ thảm PVC cao cấp, hệ thống thông gió và chiếu sáng chuyên nghiệp.",
    latitude: 21.025381,
    longitude: 105.837529,
    phone: "0901 234 567",
    sport: "Cầu Lông",
    fields: [
      {
        id: "f7",
        name: "Sân 1",
        description: "Sân đơn/đôi tiêu chuẩn, thảm PVC cao cấp, hệ thống ánh sáng LED không chói.",
        rating: 4.4,
        images: [
          "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
        ],
        reviews: [
          { name: "Phương Linh", time: "2 ngày trước", comment: "Sàn êm, ánh sáng tốt, rất thích!", rating: 5 },
          { name: "Thế Anh", time: "4 ngày trước", comment: "Sân sạch đẹp, gió ổn.", rating: 4 },
        ],
      },
      {
        id: "f8",
        name: "Sân 2",
        description: "Sân đơn/đôi, vị trí góc thoáng mát, ít tiếng ồn.",
        rating: 4.2,
        images: [
          "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
        ],
        reviews: [
          { name: "Hữu Toàn", time: "1 tuần trước", comment: "Sân OK, giá rẻ.", rating: 4 },
        ],
      },
    ],
  },
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
   Sub-component – Single Field Card (expandable)
   ================================================================ */
const FieldCard = ({ field, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className={`vd-field-card-v2${expanded ? " expanded" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      {/* Collapsed header — always visible */}
      <div className="vd-fc-header" onClick={() => setExpanded(!expanded)}>
        <div className="vd-fc-thumb">
          {field.images?.[0] ? (
            <img src={field.images[0]} alt={field.name} />
          ) : (
            <div className="vd-fc-thumb-placeholder"><ImageIcon size={20} /></div>
          )}
        </div>
        <div className="vd-fc-summary">
          <h4>{field.name}</h4>
          <div className="vd-fc-rating">
            <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
            <span>{field.rating.toFixed(1)}</span>
            <span className="vd-fc-review-count">({field.reviews?.length || 0} đánh giá)</span>
          </div>
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
              <p className="vd-fc-description">{field.description}</p>

              {/* Images */}
              <FieldImageGallery images={field.images} fieldName={field.name} />

              {/* Reviews */}
              <FieldReviews reviews={field.reviews} />
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
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const venue = MOCK_VENUES[id];
  const [isFavorite, setIsFavorite] = useState(false);

  /* ── Not found ── */
  if (!venue) {
    return (
      <div className="customer-home">
        <Header />
        <div className="vd-not-found">
          <h2>Không tìm thấy sân</h2>
          <p>Sân bạn tìm kiếm không tồn tại.</p>
          <button className="vd-back-btn" onClick={() => navigate("/home")}>
            ← Quay lại trang chủ
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude - 0.005}%2C${venue.latitude - 0.004}%2C${venue.longitude + 0.005}%2C${venue.latitude + 0.004}&layer=mapnik&marker=${venue.latitude}%2C${venue.longitude}`;

  return (
    <div className="customer-home">
      <Header />

      <main className="vd-main">
        {/* Back button */}
        <button className="vd-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Quay lại
        </button>

        {/* ── Thumbnail hero ── */}
        <div className="vd-hero">
          <img src={venue.thumbnail} alt={venue.name} className="vd-hero-img" />
          <div className="vd-hero-overlay" />
          <div className="vd-hero-actions">
            <button
              className={`vd-action-btn${isFavorite ? " active" : ""}`}
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart size={20} fill={isFavorite ? "#ef4444" : "none"} />
            </button>
            <button className="vd-action-btn">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* ── Venue Info ── */}
        <div className="vd-content">
          <div className="vd-info-section">
            <h1 className="vd-name">{venue.name}</h1>

            <div className="vd-meta">
              <span className="vd-sport-tag">{venue.sport}</span>
              <span className="vd-rating">
                <Star size={14} fill="#f59e0b" stroke="#f59e0b" /> {venue.rating}
                <span className="vd-reviews-count">({venue.totalReviews} đánh giá)</span>
              </span>
            </div>

            {/* Quick info */}
            <div className="vd-quick-info">
              <div className="vd-info-item">
                <MapPin size={16} />
                <span>{venue.address}</span>
              </div>
              <div className="vd-info-item">
                <Clock size={16} />
                <span>{venue.openTime} – {venue.closeTime}</span>
              </div>
              <div className="vd-info-item">
                <Phone size={16} />
                <a href={`tel:${venue.phone}`}>{venue.phone}</a>
              </div>
            </div>

            {/* Description */}
            <div className="vd-description">
              <h3>Giới thiệu</h3>
              <p>{venue.description}</p>
            </div>
          </div>

          {/* ── Map ── */}
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

          {/* ── Fields list ── */}
          <div className="vd-fields-section">
            <h3>
              <Calendar size={18} /> Danh sách sân ({venue.fields.length})
            </h3>
            <div className="vd-fields-list-v2">
              {venue.fields.map((field, i) => (
                <FieldCard key={field.id} field={field} index={i} />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VenueDetail;
