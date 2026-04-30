import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MapPin, Star, Search, Frown, X, Clock,
  Calendar, ChevronRight, SlidersHorizontal, Navigation, Navigation2, Dumbbell, Crosshair, Plus, Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchVenues } from "../services/fieldService";
import { getDistrictsByProvince, getProvinces } from "../services/addressService";
import {
  getSportTypes,
  normalizeSportTypeList,
  sportTypeIdFromSearchParam,
} from "../services/sportTypeService";
import "./Venues.css";
import Swal from "sweetalert2";

// Fix Leaflet default marker icon paths (Vite/CRA bundler)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MAP_DEFAULT_CENTER = [21.0285, 105.8542]; // Hà Nội

/** Custom icon for user-picked location */
const pickedLocationIcon = new L.DivIcon({
  className: "venues-picked-icon",
  html: `<span class="venues-picked-icon__dot"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
});

/** Captures map click and calls onPick({ lat, lng }) */
const LocationPicker = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
};

/** Flies map to [lat, lng] when `target` changes */
const FlyToLocation = ({ target }) => {
  const map = useMapEvents({});
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { duration: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
};

/** Nút định vị GPS hiển thị bên trong bản đồ */
const LocateControl = ({ onLocate }) => {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      window.alert("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.flyTo([lat, lng], 14, { duration: 1.2 });
        if (onLocate) onLocate({ lat, lng });
        setLocating(false);
      },
      () => {
        Swal.fire("Lỗi", "Không lấy được vị trí. Hãy cho phép truy cập vị trí.", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return (
    <div className="map-controls-group">
      <button
        type="button"
        className={`map-ctrl-btn map-locate-btn${locating ? " is-locating" : ""}`}
        onClick={handleLocate}
        title="Định vị vị trí của bạn"
        aria-label="Định vị vị trí của bạn"
      >
        <Crosshair size={18} />
      </button>
      <div className="map-zoom-group">
        <button
          type="button"
          className="map-ctrl-btn map-zoom-btn"
          onClick={() => map.zoomIn()}
          title="Phóng to"
          aria-label="Phóng to"
        >
          <Plus size={18} />
        </button>
        <span className="map-zoom-divider" />
        <button
          type="button"
          className="map-ctrl-btn map-zoom-btn"
          onClick={() => map.zoomOut()}
          title="Thu nhỏ"
          aria-label="Thu nhỏ"
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
};

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

const StarRating = ({ rating, max = 5 }) => {
  const pct = Math.min(100, Math.max(0, (rating / max) * 100));
  const stars = Array.from({ length: max });
  return (
    <span className="star-rating" aria-label={`${rating} / ${max} sao`}>
      <span className="star-rating-empty">
        {stars.map((_, i) => <Star key={i} size={13} />)}
      </span>
      <span className="star-rating-filled" style={{ width: `${pct}%` }}>
        {stars.map((_, i) => <Star key={i} size={13} />)}
      </span>
    </span>
  );
};

/** Query `time` cho API search venue (TimeOnly). */
const formatTimeForApi = (t) => {
  if (!t || !String(t).trim()) return undefined;
  const s = String(t).trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return undefined;
};

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
  const [, setTotalItems] = useState(0);
  /** Read initial location: prefer URL search params (`lat`/`lng`), fallback to localStorage. */
  const [userGeo, setUserGeo] = useState(() => {
    try {
      const latParam = searchParams.get("lat");
      const lngParam = searchParams.get("lng");
      if (latParam != null && lngParam != null) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { userLat: lat, userLng: lng };
      }
    } catch { }
    try {
      const stored = localStorage.getItem("userLocation");
      if (stored) {
        const coords = JSON.parse(stored);
        const lat = coords?.latitude ?? null;
        const lng = coords?.longitude ?? null;
        if (lat != null && lng != null) return { userLat: lat, userLng: lng };
      }
    } catch { }
    return { userLat: null, userLng: null };
  });

  /** Vị trí người dùng đã click trên bản đồ (dùng để hiển thị marker + badge). */
  const [mapPickedLocation, setMapPickedLocation] = useState(() => {
    try {
      const latParam = searchParams.get("lat");
      const lngParam = searchParams.get("lng");
      if (latParam != null && lngParam != null) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, label: null };
      }
    } catch { }
    try {
      const stored = localStorage.getItem("userLocation");
      if (stored) {
        const c = JSON.parse(stored);
        if (c?.latitude != null && c?.longitude != null)
          return { lat: Number(c.latitude), lng: Number(c.longitude) };
      }
    } catch { }
    return null;
  });

  /** Nominatim geocoding search */
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const mapSearchTimerRef = useRef(null);

  /** Target for FlyToLocation — changes trigger map fly animation */
  const [flyToTarget, setFlyToTarget] = useState(null);

  /** Debounced Nominatim search */
  useEffect(() => {
    if (mapSearchTimerRef.current) clearTimeout(mapSearchTimerRef.current);
    const q = mapSearchQuery.trim();
    if (!q || q.length < 2) {
      setMapSearchResults([]);
      setMapSearchOpen(false);
      setMapSearchLoading(false);
      return;
    }
    setMapSearchLoading(true);
    mapSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=vi&addressdetails=0&countrycodes=vn`
        );
        const data = await res.json();
        setMapSearchResults(Array.isArray(data) ? data : []);
        setMapSearchOpen(true);
      } catch {
        setMapSearchResults([]);
      } finally {
        setMapSearchLoading(false);
      }
    }, 450);
    return () => clearTimeout(mapSearchTimerRef.current);
  }, [mapSearchQuery]);

  const handleMapSearchSelect = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name;
    const shortLabel = label.split(",")[0].trim();
    // Show the picked location on the map (transient)
    setMapPickedLocation({ lat, lng, label: shortLabel });
    setFlyToTarget({ lat, lng });
    setFilterMode("khoang-cach");
    setMapSearchQuery(shortLabel);
    setMapSearchOpen(false);

    // Store coordinates in the URL search params only (do not overwrite localStorage).
    try {
      setUserGeo({ userLat: lat, userLng: lng });
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("lat", String(lat));
        p.set("lng", String(lng));
        return p;
      }, { replace: true });
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchParams]);

  // Add filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterMode, setFilterMode] = useState("khu-vuc");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [distanceKm, setDistanceKm] = useState("");
  const [pendingBookingDate, setPendingBookingDate] = useState("");
  const [pendingBookingTime, setPendingBookingTime] = useState("");
  /** `""` = tất cả môn; id string khi chọn trong bộ lọc (đồng bộ URL `sport` khi Áp dụng). */
  const [pendingSportTypeId, setPendingSportTypeId] = useState("");
  const pendingKeyword = "";
  /** Bán kính đã áp dụng → gửi `radiusKm` + tọa độ (giống Swagger). */
  const [appliedRadiusKm, setAppliedRadiusKm] = useState(null);
  const [appliedBookingDate, setAppliedBookingDate] = useState("");
  const [appliedBookingTime, setAppliedBookingTime] = useState("");
  const [appliedProvinceId, setAppliedProvinceId] = useState("");
  const [appliedWardId, setAppliedWardId] = useState("");
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

  const filteredProvinceOptions = useMemo(() => {
    const q = provinceQuery.trim().toLowerCase();
    if (!q) return provinceOptions;
    return provinceOptions.filter((p) =>
      String(p?.name ?? "").toLowerCase().includes(q),
    );
  }, [provinceOptions, provinceQuery]);

  const filteredDistrictOptions = useMemo(() => {
    const q = districtQuery.trim().toLowerCase();
    if (!q) return districtOptions;
    return districtOptions.filter((d) =>
      String(d?.name ?? "").toLowerCase().includes(q),
    );
  }, [districtOptions, districtQuery]);

  useEffect(() => {
    setPendingSportTypeId(
      sportTypeIdFromUrl != null ? String(sportTypeIdFromUrl) : "",
    );
  }, [sportTypeIdFromUrl]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getProvinces();
        if (!mounted) return;
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: String(x?.id ?? x?.provinceId ?? x?.ProvinceId ?? ""),
            name: String(x?.name ?? x?.provinceName ?? x?.ProvinceName ?? "").trim(),
          }))
          .filter((x) => x.id && x.name)
          .sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" }));
        setProvinceOptions(normalized);
      } catch {
        if (mounted) setProvinceOptions([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProvinceId) {
      setDistrictOptions([]);
      setSelectedDistrictId("");
      setDistrict("");
      setDistrictQuery("");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const list = await getDistrictsByProvince(selectedProvinceId);
        if (!mounted) return;
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: String(x?.id ?? x?.districtId ?? x?.wardId ?? x?.DistrictId ?? x?.WardId ?? ""),
            name: String(x?.name ?? x?.districtName ?? x?.wardName ?? x?.DistrictName ?? x?.WardName ?? "").trim(),
          }))
          .filter((x) => x.id && x.name)
          .sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" }));
        setDistrictOptions(normalized);
      } catch {
        if (mounted) setDistrictOptions([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedProvinceId]);

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
  const provinceBoxRef = useRef(null);
  const districtBoxRef = useRef(null);
  const mapSearchBoxRef = useRef(null);
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
        appliedProvinceId,
        appliedWardId,
      ].join("|"),
    [
      searchTerm,
      sportTypeIdFromUrl,
      userGeo.userLat,
      userGeo.userLng,
      appliedBookingDate,
      appliedBookingTime,
      appliedRadiusKm,
      appliedProvinceId,
      appliedWardId,
    ],
  );

  /** Venue markers to display on map — only venues with valid coordinates */
  const venueMarkers = useMemo(
    () =>
      venues
        .map((v) => ({
          id: v.venueId ?? v.VenueId,
          name: v.name ?? v.Name ?? v.venueName ?? v.VenueName ?? "",
          lat: Number(v.latitude ?? v.Latitude),
          lng: Number(v.longitude ?? v.Longitude),
        }))
        .filter((v) => v.id && Number.isFinite(v.lat) && Number.isFinite(v.lng)),
    [venues],
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
          ...(appliedProvinceId ? { provinceId: appliedProvinceId } : {}),
          ...(appliedWardId ? { wardId: appliedWardId } : {}),
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
      appliedProvinceId,
      appliedWardId,
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

  useEffect(() => {
    const onPointerDown = (e) => {
      const t = e.target;
      if (provinceBoxRef.current && !provinceBoxRef.current.contains(t)) {
        setProvinceDropdownOpen(false);
      }
      if (districtBoxRef.current && !districtBoxRef.current.contains(t)) {
        setDistrictDropdownOpen(false);
      }
      if (mapSearchBoxRef.current && !mapSearchBoxRef.current.contains(t)) {
        setMapSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const getLocation = (venue) => {
    const ward = venue.ward ?? venue.Ward;
    const province = venue.province ?? venue.Province;
    const parts = [ward, province].filter(Boolean);
    const detail = venue.addressDetail ?? venue.AddressDetail;
    return parts.length > 0 ? parts.join(", ") : detail || "Không rõ vị trí";
  };

  const getPendingSearchText = () => {
    if (pendingKeyword) return pendingKeyword;
    // Khi đã chọn tỉnh/quận bằng ID, không gửi tên làm search text
    if (selectedProvinceId) return "";
    return [province, district].filter(Boolean).join(" ").trim();
  };

  const applyPendingSearchText = () => {
    const text = getPendingSearchText();
    setSearchTerm(text || "");
    // Hiển thị tên tỉnh/quận trên ô tìm kiếm dù không gửi làm search text
    const display = pendingKeyword || [province, district].filter(Boolean).join(" ").trim();
    if (display) setInputValue(display);
  };

  const applyAreaFilter = () => {
    setAppliedRadiusKm(null);
    setAppliedBookingDate(pendingBookingDate);
    setAppliedBookingTime(pendingBookingTime);
    setAppliedProvinceId(selectedProvinceId);
    setAppliedWardId(selectedDistrictId);
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
    setSelectedProvinceId("");
    setSelectedDistrictId("");
    setProvinceQuery("");
    setDistrictQuery("");
    setProvinceDropdownOpen(false);
    setDistrictDropdownOpen(false);
    setDistrictOptions([]);
    setDistanceKm("");
    setPendingBookingDate("");
    setPendingBookingTime("");
    setPendingSportTypeId("");
    setAppliedRadiusKm(null);
    setAppliedBookingDate("");
    setAppliedBookingTime("");
    setAppliedProvinceId("");
    setAppliedWardId("");
    setSearchTerm("");
    setInputValue("");
    setMapSearchQuery("");
    setMapSearchResults([]);
    setMapSearchOpen(false);

    // Remove temporary search params (sport + lat/lng)
    try {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("sport");
          p.delete("lat");
          p.delete("lng");
          return p;
        },
        { replace: true },
      );
    } catch { }

    // Restore saved location from localStorage (if present), otherwise clear geo state
    try {
      const stored = localStorage.getItem("userLocation");
      if (stored) {
        const c = JSON.parse(stored);
        if (c?.latitude != null && c?.longitude != null) {
          const lat = Number(c.latitude);
          const lng = Number(c.longitude);
          setUserGeo({ userLat: lat, userLng: lng });
          setMapPickedLocation({ lat, lng, label: null });
          setFlyToTarget({ lat, lng });
          setShowFilterPanel(false);
          return;
        }
      }
    } catch { }

    setUserGeo({ userLat: null, userLng: null });
    setMapPickedLocation(null);
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
                placeholder="Tìm theo tên sân..."
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
                {/* Two-column layout: Map (left) + Form (right) */}
                <div className="filter-two-col">

                  {/* ── Left: OpenStreetMap + Nominatim search ─────── */}
                  <div className="filter-map-col">
                    <p style={{
                      fontSize: "12px", fontWeight: "bold"
                    }}>Vị trí của bạn:</p>
                    {/* Nominatim geocoding search box */}
                    <div className="map-geocode-wrap" ref={mapSearchBoxRef}>
                      <div className="map-geocode-input-row">
                        <Search size={14} className="map-geocode-icon" />
                        <input
                          type="text"
                          className="map-geocode-input"
                          placeholder="Tìm địa điểm... (VD: Hà Nội, Đà Nẵng)"
                          value={mapSearchQuery}
                          onChange={(e) => setMapSearchQuery(e.target.value)}
                          onFocus={() => mapSearchResults.length > 0 && setMapSearchOpen(true)}
                          autoComplete="off"
                        />
                        {mapSearchLoading && <span className="map-geocode-spinner" />}
                        {mapSearchQuery && !mapSearchLoading && (
                          <button
                            type="button"
                            className="map-geocode-clear"
                            onClick={() => { setMapSearchQuery(""); setMapSearchResults([]); setMapSearchOpen(false); }}
                            aria-label="Xóa tìm kiếm"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      {mapSearchOpen && mapSearchResults.length > 0 && (
                        <ul className="map-geocode-dropdown" role="listbox">
                          {mapSearchResults.map((r, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                className="map-geocode-option"
                                onClick={() => handleMapSearchSelect(r)}
                              >
                                <MapPin size={12} className="map-geocode-option-icon" />
                                <span>{r.display_name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>



                    <div className="filter-map-container">
                      <MapContainer
                        center={
                          mapPickedLocation
                            ? [mapPickedLocation.lat, mapPickedLocation.lng]
                            : MAP_DEFAULT_CENTER
                        }
                        zoom={11}
                        scrollWheelZoom
                        zoomControl={false}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <FlyToLocation target={flyToTarget} />
                        <LocationPicker
                          onPick={(latlng) => {
                            setMapPickedLocation({ lat: latlng.lat, lng: latlng.lng, label: null });
                            setUserGeo({ userLat: latlng.lat, userLng: latlng.lng });
                            setFilterMode("khoang-cach");
                            setMapSearchQuery("");
                            // Write coordinates to URL params only; do not overwrite localStorage
                            try {
                              setSearchParams((prev) => {
                                const p = new URLSearchParams(prev);
                                p.set("lat", String(latlng.lat));
                                p.set("lng", String(latlng.lng));
                                return p;
                              }, { replace: true });
                            } catch { }
                          }}
                        />
                        {mapPickedLocation && (
                          <Marker
                            position={[mapPickedLocation.lat, mapPickedLocation.lng]}
                            icon={pickedLocationIcon}
                          >
                            <Popup>
                              <strong>Vị trí của bạn</strong>
                              <br />
                              {mapPickedLocation.lat.toFixed(5)}, {mapPickedLocation.lng.toFixed(5)}
                            </Popup>
                          </Marker>
                        )}
                        {venueMarkers.map((v) => (
                          <Marker key={v.id} position={[v.lat, v.lng]}>
                            <Popup>
                              <strong style={{ display: "block", marginBottom: 4 }}>{v.name}</strong>
                              <button
                                style={{
                                  cursor: "pointer", color: "#0284c7",
                                  border: "none", background: "none",
                                  padding: 0, fontSize: "0.82rem", fontWeight: 600,
                                }}
                                onClick={() => navigate(`/venue/${v.id}`)}
                              >
                                Xem chi tiết →
                              </button>
                            </Popup>
                          </Marker>
                        ))}
                        <LocateControl
                          onLocate={(latlng) => {
                            setMapPickedLocation({ lat: latlng.lat, lng: latlng.lng, label: null });
                            setUserGeo({ userLat: latlng.lat, userLng: latlng.lng });
                            setFilterMode("khoang-cach");
                            setMapSearchQuery("");
                            try {
                              setSearchParams((prev) => {
                                const p = new URLSearchParams(prev);
                                p.set("lat", String(latlng.lat));
                                p.set("lng", String(latlng.lng));
                                return p;
                              }, { replace: true });
                            } catch { }
                          }}
                        />
                      </MapContainer>
                    </div>
                  </div>

                  {/* ── Right: Filter form ───────────────────────── */}
                  <div className="filter-form-col">
                    <div className="filter-panel-inner">
                      <div className="filter-header">
                        <div className="filter-header-text">
                          <h4>Bộ lọc nâng cao</h4>
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
                          type="button" role="tab"
                          aria-selected={filterMode === "khu-vuc"}
                          className={filterMode === "khu-vuc" ? "is-selected" : ""}
                          onClick={() => setFilterMode("khu-vuc")}
                        >
                          <MapPin size={16} /> Khu vực
                        </button>
                        <button
                          type="button" role="tab"
                          aria-selected={filterMode === "khoang-cach"}
                          className={filterMode === "khoang-cach" ? "is-selected" : ""}
                          onClick={() => setFilterMode("khoang-cach")}
                        >
                          <Navigation size={16} /> Khoảng cách
                        </button>
                      </div>

                      {filterMode === "khu-vuc" && (
                        <div className="filter-body filter-body--area">
                          <div className="filter-area-fields">
                            <div className="input-group">
                              <label htmlFor="venues-province-combo">Tỉnh / TP</label>
                              <div className="filter-combobox" ref={provinceBoxRef}>
                                <input
                                  id="venues-province-combo"
                                  type="text"
                                  value={provinceQuery}
                                  onFocus={() => setProvinceDropdownOpen(true)}
                                  onClick={() => setProvinceDropdownOpen(true)}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setProvinceQuery(v); setProvince(v);
                                    setSelectedProvinceId(""); setSelectedDistrictId("");
                                    setDistrict(""); setDistrictQuery("");
                                  }}
                                  placeholder="Gõ để tìm và chọn tỉnh/thành..."
                                />
                                <button
                                  type="button" className="filter-combobox-toggle"
                                  aria-label="Mở danh sách tỉnh/thành"
                                  onClick={() => setProvinceDropdownOpen((v) => !v)}
                                >
                                  <ChevronRight size={14} className={provinceDropdownOpen ? "is-open" : ""} />
                                </button>
                                {provinceDropdownOpen && (
                                  <ul className="filter-combobox-list" role="listbox" aria-label="Danh sách tỉnh/thành">
                                    {filteredProvinceOptions.length === 0 ? (
                                      <li className="filter-combobox-empty">Không có tỉnh/thành phù hợp</li>
                                    ) : (
                                      filteredProvinceOptions.map((p) => (
                                        <li key={p.id}>
                                          <button
                                            type="button"
                                            className={`filter-combobox-item${selectedProvinceId === p.id ? " is-selected" : ""}`}
                                            onClick={() => {
                                              setSelectedProvinceId(p.id); setProvince(p.name);
                                              setProvinceQuery(p.name); setSelectedDistrictId("");
                                              setDistrict(""); setDistrictQuery("");
                                              setProvinceDropdownOpen(false);
                                            }}
                                          >
                                            {p.name}
                                          </button>
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                )}
                              </div>
                            </div>
                            <div className="input-group">
                              <label htmlFor="venues-district-combo">Quận / Huyện</label>
                              <div
                                className={`filter-combobox${!selectedProvinceId ? " is-disabled" : ""}`}
                                ref={districtBoxRef}
                              >
                                <input
                                  id="venues-district-combo"
                                  type="text"
                                  value={districtQuery}
                                  disabled={!selectedProvinceId}
                                  onFocus={() => setDistrictDropdownOpen(true)}
                                  onClick={() => setDistrictDropdownOpen(true)}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDistrictQuery(v); setDistrict(v); setSelectedDistrictId("");
                                  }}
                                  placeholder={selectedProvinceId ? "Gõ để tìm và chọn quận/huyện..." : "Chọn tỉnh/thành trước"}
                                />
                                <button
                                  type="button" className="filter-combobox-toggle"
                                  aria-label="Mở danh sách quận/huyện"
                                  disabled={!selectedProvinceId}
                                  onClick={() => setDistrictDropdownOpen((v) => !v)}
                                >
                                  <ChevronRight size={14} className={districtDropdownOpen ? "is-open" : ""} />
                                </button>
                                {districtDropdownOpen && selectedProvinceId && (
                                  <ul className="filter-combobox-list" role="listbox" aria-label="Danh sách quận/huyện">
                                    {filteredDistrictOptions.length === 0 ? (
                                      <li className="filter-combobox-empty">Không có quận/huyện phù hợp</li>
                                    ) : (
                                      filteredDistrictOptions.map((d) => (
                                        <li key={d.id}>
                                          <button
                                            type="button"
                                            className={`filter-combobox-item${selectedDistrictId === d.id ? " is-selected" : ""}`}
                                            onClick={() => {
                                              setSelectedDistrictId(d.id); setDistrict(d.name);
                                              setDistrictQuery(d.name); setDistrictDropdownOpen(false);
                                            }}
                                          >
                                            {d.name}
                                          </button>
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                )}
                              </div>
                            </div>
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
                              <option key={s.id} value={String(s.id)}>{s.name}</option>
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
              const venueName = venue.name ?? venue.Name ?? venue.venueName ?? venue.VenueName ?? "";
              const openTime = venue.openTime ?? venue.OpenTime;
              const closeTime = venue.closeTime ?? venue.CloseTime;
              return (
                <motion.div
                  ref={isLast ? lastVenueRef : null}
                  key={venueId != null ? `venue-${venueId}-${idx}` : `venue-row-${idx}`}
                  className="venue-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 16) * 0.04, duration: 0.35, ease: "easeOut" }}
                  onClick={() => navigate(`/venue/${venueId}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="venue-image">
                    <img
                      src={venue.thumbnailUrl || venue.ThumbnailUrl || "/placeholder-venue.jpg"}
                      alt={venueName}
                      loading="lazy"
                    />
                    <span className="sport-badge">
                      {venue.bookingCount ?? venue.BookingCount ?? 0} lượt đặt
                    </span>
                  </div>
                  <div className="venue-info">
                    <h3 title={venueName}>{venueName}</h3>
                    <p className="location">
                      <MapPin size={15} />
                      <span title={getLocation(venue)}>{getLocation(venue)}</span>
                    </p>
                    <div className="venue-meta-row">
                      {openTime && closeTime && (
                        <span className="venue-hours">
                          <Clock size={13} />
                          {formatTime(openTime)} – {formatTime(closeTime)}
                        </span>
                      )}

                    </div>
                    {(venue.distanceKm ?? venue.DistanceKm) != null && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <p className="venue-distance">
                          <Navigation2 size={13} />{" "}
                          {Number(venue.distanceKm ?? venue.DistanceKm).toFixed(1)} km
                        </p>
                        <span className="venue-rating">
                          <Star size={13} className="venue-rating-star" />
                          <span className="rating-value">
                            {Number(venue.rating ?? venue.Rating ?? 0).toFixed(1)}
                          </span>
                        </span>
                      </div>
                    )}
                    <button
                      className="book-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/venue/${venueId}`); }}
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

