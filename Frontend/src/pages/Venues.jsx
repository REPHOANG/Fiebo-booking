import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MapPin, Star, Search, Frown, X, Clock,
  Calendar, MapPinned, ChevronLeft, ChevronRight, ImageIcon,
  MessageSquare, User, Loader2, SlidersHorizontal, Heart, Navigation, Dumbbell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { clearDraft } from '../store/bookingDraftSlice';
import { searchVenues, getVenueDetail, getVenueFields, getVenueReviews } from "../services/fieldService";
import {
  getSportTypes,
  normalizeSportTypeList,
  sportTypeIdFromSearchParam,
} from "../services/sportTypeService";
import "./Venues.css";

/** Fallback parse `?sport=` (tên) khi GET `/api/sport-types` chưa xong. */
const FALLBACK_SPORT_CATALOG = Object.freeze([
  { id: 1, name: "Bóng đá" },
  { id: 2, name: "Bóng rổ" },
  { id: 3, name: "Tennis" },
  { id: 4, name: "Pickleball" },
]);

const PAGE_SIZE = 8;

const formatTime = (timeSpan) => {
  if (!timeSpan) return "";
  const parts = String(timeSpan).split(":");
  return `${parts[0]}:${parts[1]}`;
};

/** Query `time` cho API search venue (TimeOnly). */
const formatTimeForApi = (t) => {
  if (!t || !String(t).trim()) return undefined;
  const s = String(t).trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return undefined;
};

/* ── Helpers ──────────────────────────────────────────────────── */
const readStoredUserGeo = () => {
  try {
    const raw = localStorage.getItem("userLocation");
    if (!raw) return { userLat: null, userLng: null };
    const j = JSON.parse(raw);
    if (j?.lat != null && j?.lng != null) {
      const userLat = Number(j.lat);
      const userLng = Number(j.lng);
      if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
        return { userLat, userLng };
      }
    }
  } catch (_) {}
  return { userLat: null, userLng: null };
};

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
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const sportParam = searchParams.get("sport");
  /** `null` = chưa tải API; sau đó là mảng (có thể rỗng). */
  const [sportTypeCatalog, setSportTypeCatalog] = useState(null);

  useEffect(() => {
    let mounted = true;
    getSportTypes()
      .then((raw) => {
        if (mounted) setSportTypeCatalog(normalizeSportTypeList(raw));
      })
      .catch(() => {
        if (mounted) setSportTypeCatalog([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const catalogForSportParam =
    sportTypeCatalog === null ? FALLBACK_SPORT_CATALOG : sportTypeCatalog;
  const sportTypeIdFromUrl = useMemo(
    () => sportTypeIdFromSearchParam(sportParam, catalogForSportParam),
    [sportParam, catalogForSportParam],
  );

  const sportFilterOptions = useMemo(
    () => (sportTypeCatalog === null ? FALLBACK_SPORT_CATALOG : sportTypeCatalog),
    [sportTypeCatalog],
  );

  const [venues, setVenues] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [inputValue, setInputValue] = useState(initialSearch);
  const [totalItems, setTotalItems] = useState(0);
  /** Đọc vị trí đã lưu ngay khi khởi tạo để tránh hai lần đổi `filtersKey` → hai request chồng chéo, response cũ ghi đè danh sách. */
  const [userGeo, setUserGeo] = useState(() => readStoredUserGeo());

  // Add filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterMode, setFilterMode] = useState("khu-vuc");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [pendingBookingDate, setPendingBookingDate] = useState("");
  const [pendingBookingTime, setPendingBookingTime] = useState("");
  /** `""` = tất cả môn; id string khi chọn trong bộ lọc (đồng bộ URL `sport` khi Áp dụng). */
  const [pendingSportTypeId, setPendingSportTypeId] = useState("");
  const [pendingKeyword, setPendingKeyword] = useState("");
  /** Bán kính đã áp dụng → gửi `radiusKm` + tọa độ (giống Swagger). */
  const [appliedRadiusKm, setAppliedRadiusKm] = useState(null);
  const [appliedBookingDate, setAppliedBookingDate] = useState("");
  const [appliedBookingTime, setAppliedBookingTime] = useState("");
  const filterKeywords = ["Cầu lông gần tôi", "Pickleball gần tôi", "Xé vé gần tôi"];

  const sportDraftMismatch =
    String(pendingSportTypeId || "") !==
    (sportTypeIdFromUrl != null ? String(sportTypeIdFromUrl) : "");

  const hasPanelDraft = Boolean(
    province.trim() ||
      district.trim() ||
      distanceKm ||
      pendingKeyword ||
      pendingBookingDate ||
      pendingBookingTime ||
      appliedRadiusKm != null ||
      sportDraftMismatch,
  );

  useEffect(() => {
    setPendingSportTypeId(
      sportTypeIdFromUrl != null ? String(sportTypeIdFromUrl) : "",
    );
  }, [sportTypeIdFromUrl]);

  const commitSportToUrl = useCallback(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        const raw = String(pendingSportTypeId ?? "").trim();
        if (raw !== "") {
          p.set("sport", raw);
        } else {
          p.delete("sport");
        }
        return p;
      },
      { replace: true },
    );
  }, [pendingSportTypeId, setSearchParams]);

  const observer = useRef();
  const prevFiltersKeyRef = useRef(undefined);
  /** Tăng mỗi lần gọi API; bỏ qua kết quả nếu đã có request mới hơn (tránh race khi đổi bộ lọc / StrictMode). */
  const fetchSeqRef = useRef(0);

  const filtersKey = useMemo(
    () =>
      [
        searchTerm,
        sportTypeIdFromUrl ?? "",
        userGeo.userLat ?? "",
        userGeo.userLng ?? "",
        appliedBookingDate,
        appliedBookingTime,
        appliedRadiusKm ?? "",
      ].join("|"),
    [
      searchTerm,
      sportTypeIdFromUrl,
      userGeo.userLat,
      userGeo.userLng,
      appliedBookingDate,
      appliedBookingTime,
      appliedRadiusKm,
    ],
  );

  const loadPage = useCallback(
    async (pageToLoad, reset = false) => {
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      const location = searchTerm?.trim() || undefined;
      const sportTypeId =
        sportTypeIdFromUrl != null ? Number(sportTypeIdFromUrl) : undefined;
      const dateParam = appliedBookingDate?.trim() || undefined;
      const timeParam =
        dateParam && appliedBookingTime?.trim()
          ? formatTimeForApi(appliedBookingTime)
          : undefined;

      try {
        const data = await searchVenues({
          location,
          date: dateParam,
          time: timeParam,
          sportTypeId: Number.isFinite(sportTypeId) ? sportTypeId : undefined,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          ...(userGeo.userLat != null &&
          userGeo.userLng != null &&
          Number.isFinite(userGeo.userLat) &&
          Number.isFinite(userGeo.userLng)
            ? { userLat: userGeo.userLat, userLng: userGeo.userLng }
            : {}),
          ...(appliedRadiusKm != null &&
          Number.isFinite(appliedRadiusKm) &&
          appliedRadiusKm > 0
            ? { radiusKm: appliedRadiusKm }
            : {}),
        });

        if (seq !== fetchSeqRef.current) return;

        const items = data?.items || [];
        if (reset) {
          setVenues(items);
        } else {
          setVenues((p) => [...p, ...items]);
        }
        const ti = data?.totalItems ?? 0;
        const tp = data?.totalPages ?? 0;
        setTotalItems(ti);
        const moreFromPages = tp > 0 ? pageToLoad < tp : false;
        const moreFromCount =
          items.length >= PAGE_SIZE && pageToLoad * PAGE_SIZE < ti;
        setHasMore(moreFromPages || moreFromCount);
      } catch (err) {
        console.error("Failed to search venues:", err);
        if (seq !== fetchSeqRef.current) return;
        if (reset) setVenues([]);
        setTotalItems(0);
        setHasMore(false);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    },
    [
      searchTerm,
      sportTypeIdFromUrl,
      userGeo.userLat,
      userGeo.userLng,
      appliedBookingDate,
      appliedBookingTime,
      appliedRadiusKm,
    ],
  );

  /**
   * Một luồng tải: đổi bộ lọc → reset trang 1 + tải lại; chỉ gọi load trang > 1 khi bộ lọc không đổi
   * (tránh race của hai useEffect cũ: đổi lọc vẫn còn page cũ thì gọi nhầm trang 2).
   */
  useEffect(() => {
    const isFirst = prevFiltersKeyRef.current === undefined;
    const filterChanged =
      !isFirst && prevFiltersKeyRef.current !== filtersKey;

    if (isFirst || filterChanged) {
      if (filterChanged) setPage(1);
      prevFiltersKeyRef.current = filtersKey;
      loadPage(1, true);
      return;
    }
    if (page > 1) {
      loadPage(page, false);
    }
  }, [filtersKey, page, loadPage]);

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

  const getLocation = (venue) => {
    const ward = venue.ward ?? venue.Ward;
    const province = venue.province ?? venue.Province;
    const parts = [ward, province].filter(Boolean);
    const detail = venue.addressDetail ?? venue.AddressDetail;
    return parts.length > 0 ? parts.join(", ") : detail || "Không rõ vị trí";
  };

  const getAreaFilterText = () => {
    const parts = [province, district].filter(Boolean);
    return parts.join(" ");
  };

  const getPendingSearchText = () => {
    if (pendingKeyword) return pendingKeyword;
    return [province, district].filter(Boolean).join(" ").trim();
  };

  const applyPendingSearchText = () => {
    const text = getPendingSearchText();
    if (text) {
      setSearchTerm(text);
      setInputValue(text);
    }
  };

  const applyAreaFilter = () => {
    setAppliedRadiusKm(null);
    setAppliedBookingDate(pendingBookingDate);
    setAppliedBookingTime(pendingBookingTime);
    commitSportToUrl();
    applyPendingSearchText();
    setShowFilterPanel(false);
  };

  const applyDistanceFilter = () => {
    const raw = String(distanceKm ?? "").trim();
    setAppliedBookingDate(pendingBookingDate);
    setAppliedBookingTime(pendingBookingTime);
    if (!raw) {
      setAppliedRadiusKm(null);
      commitSportToUrl();
      applyPendingSearchText();
      setShowFilterPanel(false);
      return;
    }
    const r = parseFloat(raw, 10);
    if (!Number.isFinite(r) || r <= 0) return;

    const finish = (lat, lng) => {
      setUserGeo({ userLat: lat, userLng: lng });
      try {
        localStorage.setItem("userLocation", JSON.stringify({ lat, lng }));
      } catch (_) {}
      setAppliedRadiusKm(r);
      commitSportToUrl();
      applyPendingSearchText();
      setShowFilterPanel(false);
    };

    if (
      userGeo.userLat != null &&
      userGeo.userLng != null &&
      Number.isFinite(userGeo.userLat) &&
      Number.isFinite(userGeo.userLng)
    ) {
      finish(userGeo.userLat, userGeo.userLng);
      return;
    }

    if (!navigator.geolocation) {
      window.alert(
        "Trình duyệt không hỗ trợ định vị. Không thể lọc theo khoảng cách.",
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => finish(pos.coords.latitude, pos.coords.longitude),
      () => {
        window.alert(
          "Không lấy được vị trí. Hãy cho phép truy cập vị trí để lọc theo km.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const applyFilterPanel = () => {
    if (filterMode === "khoang-cach") applyDistanceFilter();
    else applyAreaFilter();
  };


  const clearFilters = () => {
    setProvince("");
    setDistrict("");
    setDistanceKm("");
    setPendingBookingDate("");
    setPendingBookingTime("");
    setPendingSportTypeId("");
    setAppliedRadiusKm(null);
    setAppliedBookingDate("");
    setAppliedBookingTime("");
    setSearchTerm("");
    setInputValue("");
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete("sport");
        return p;
      },
      { replace: true },
    );
    setShowFilterPanel(false);
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
          <span className="stat-value">{sportFilterOptions.length}</span>
          <span className="stat-label">Môn thể thao</span>
        </div>  
        <div className="stat-item">
          <span className="stat-value">10+</span>
          <span className="stat-label">Thành phố</span>
        </div>
      </div>

      {/* Search + advanced filters */}
      <div className={`venues-search-block ${showFilterPanel ? "venues-search-block--open" : ""}`}>
        <div className="venues-search-bar">
          <button
            type="button"
            className={`venues-filter-toggle ${showFilterPanel ? "is-active" : ""}`}
            onClick={() => setShowFilterPanel((v) => !v)}
            aria-expanded={showFilterPanel}
            aria-controls="venues-advanced-filter"
          >
            <SlidersHorizontal size={18} strokeWidth={2} />
            <span>Bộ lọc</span>
            {hasPanelDraft && !showFilterPanel && <span className="venues-filter-dot" aria-hidden />}
          </button>
          <div className="venues-search-divider" aria-hidden />
          <label className="venues-search-field">
            <Search size={19} className="venues-search-icon" aria-hidden />
            <input
              type="text"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Tìm theo tên sân hoặc địa điểm..."
              value={inputValue}
              onChange={handleSearchChange}
            />
            {inputValue && (
              <button
                type="button"
                className="venues-search-clear"
                onClick={() => {
                  setInputValue("");
                  setSearchTerm("");
                }}
                aria-label="Xóa ô tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <AnimatePresence initial={false}>
          {showFilterPanel && (
            <motion.div
              id="venues-advanced-filter"
              className="venues-filter-panel"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="filter-panel-inner">
                <div className="filter-header">
                  <div className="filter-header-text">
                    <h4>Bộ lọc nâng cao</h4>
                    <p>Lọc môn thể thao, khu vực, khoảng cách và ngày giờ đặt sân.</p>
                  </div>
                  <button
                    type="button"
                    className="filter-close"
                    onClick={() => setShowFilterPanel(false)}
                    aria-label="Đóng bộ lọc"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="filter-mode-seg" role="tablist" aria-label="Kiểu lọc">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filterMode === "khu-vuc"}
                    className={filterMode === "khu-vuc" ? "is-selected" : ""}
                    onClick={() => setFilterMode("khu-vuc")}
                  >
                    <MapPin size={16} />
                    Khu vực
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filterMode === "khoang-cach"}
                    className={filterMode === "khoang-cach" ? "is-selected" : ""}
                    onClick={() => setFilterMode("khoang-cach")}
                  >
                    <Navigation size={16} />
                    Khoảng cách
                  </button>
                </div>

                {filterMode === "khu-vuc" && (
                  <div className="filter-body filter-body--area">
                    <div className="filter-area-fields">
                      <div className="input-group">
                        <label htmlFor="venues-province">Tỉnh / TP</label>
                        <input
                          id="venues-province"
                          type="text"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="VD: Hà Nội, TP. Hồ Chí Minh"
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="venues-district">Quận / Huyện</label>
                        <input
                          id="venues-district"
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="VD: Quận 1, Thanh Xuân"
                        />
                      </div>
                    </div>
                    <div className="filter-save-row">
                      <button className="venues-save-location" type="button">
                        <Heart size={17} strokeWidth={2} />
                        Lưu địa điểm
                      </button>
                    </div>
                  </div>
                )}

                {filterMode === "khoang-cach" && (
                  <div className="filter-body filter-body--distance">
                    <div className="input-group input-group--grow">
                      <label htmlFor="venues-distance">Bán kính tối đa</label>
                      <div className="distance-input-wrap">
                        <input
                          id="venues-distance"
                          type="number"
                          value={distanceKm}
                          onChange={(e) => setDistanceKm(e.target.value)}
                          placeholder="5"
                          min="0"
                          step="0.5"
                        />
                        <span className="distance-suffix">km</span>
                      </div>
                      <p className="filter-hint">
                        Cần vị trí: dùng tọa độ đã lưu hoặc trình duyệt sẽ xin quyền khi bạn chọn &quot;Áp
                        dụng&quot;.
                      </p>
                    </div>
                  </div>
                )}

                <div className="filter-body filter-body--sport">
                  <div className="input-group input-group--sport">
                    <label htmlFor="venues-sport-type">
                      <Dumbbell size={14} aria-hidden /> Môn thể thao
                    </label>
                    <select
                      id="venues-sport-type"
                      value={pendingSportTypeId}
                      onChange={(e) => setPendingSportTypeId(e.target.value)}
                    >
                      <option value="">Tất cả môn</option>
                      {sportFilterOptions.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="filter-body--schedule">
                  <div className="input-group">
                    <label htmlFor="venues-booking-date">
                      <Calendar size={14} aria-hidden /> Ngày đặt
                    </label>
                    <input
                      id="venues-booking-date"
                      type="date"
                      value={pendingBookingDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPendingBookingDate(v);
                        if (!v) setPendingBookingTime("");
                      }}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="venues-booking-time">Giờ đặt (cùng ngày)</label>
                    <input
                      id="venues-booking-time"
                      type="time"
                      value={pendingBookingTime}
                      onChange={(e) => setPendingBookingTime(e.target.value)}
                      disabled={!pendingBookingDate}
                      title={!pendingBookingDate ? "Chọn ngày trước" : undefined}
                    />
                  </div>
                </div>

               

                <div className="filter-actions">
                  <button type="button" className="filter-btn-primary" onClick={applyFilterPanel}>
                    Áp dụng bộ lọc
                  </button>
                  <button type="button" className="filter-btn-ghost" onClick={clearFilters}>
                    Xóa tất cả
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid */}
      {venues.length > 0 ? (
        <div className="venues-grid">
          {venues.map((venue, idx) => {
            const isLast = venues.length === idx + 1;
            const venueId = venue.venueId ?? venue.VenueId;
            return (
              <motion.div
                ref={isLast ? lastVenueRef : null}
                key={venueId != null ? `venue-${venueId}-${idx}` : `venue-row-${idx}`}
                className="venue-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(idx, 16) * 0.04,
                  duration: 0.35,
                  ease: "easeOut",
                }}
                onClick={() => navigate(`/venue/${venueId}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="venue-image">
                  <img
                    src={venue.thumbnailUrl || venue.ThumbnailUrl || "/placeholder-venue.jpg"}
                    alt={venue.venueName ?? venue.VenueName ?? ""}
                    loading="lazy"
                  />
                  <span className="sport-badge">
                    {venue.bookingCount ?? venue.BookingCount ?? 0} lượt đặt
                  </span>
                </div>
                <div className="venue-info">
                  <h3>{venue.venueName ?? venue.VenueName}</h3>
                  <p className="location">
                    <MapPin size={15} /> {getLocation(venue)}
                  </p>
                  <div className="rating-row">
                    <div className="rating">
                      <Star size={15} className="star" />
                      <span>{Number(venue.rating ?? venue.Rating ?? 0).toFixed(1)}</span>
                    </div>
                    {(venue.openTime || venue.OpenTime) && (venue.closeTime || venue.CloseTime) && (
                      <span className="price">
                        {formatTime(venue.openTime || venue.OpenTime)} -{" "}
                        {formatTime(venue.closeTime || venue.CloseTime)}
                      </span>
                    )}
                  </div>
                  {(venue.distanceKm ?? venue.DistanceKm) != null && (
                    <p className="venue-distance">
                      <MapPin size={13} />{" "}
                      {Number(venue.distanceKm ?? venue.DistanceKm).toFixed(1)} km
                    </p>
                  )}
                  <button
                    className="book-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/venue/${venueId}`);
                    }}
                  >
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
          <p>
            Thử tên địa điểm cụ thể, chọn ngày/giờ trong bộ lọc hoặc chọn môn từ trang chủ. Hệ thống chỉ
            khớp từ khoá với tên sân và địa chỉ.
          </p>
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
