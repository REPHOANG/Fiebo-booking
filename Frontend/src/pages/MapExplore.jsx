import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Search, Layers, Crosshair } from "lucide-react";
import { getSportTypes, normalizeSportTypeList } from "../services/sportTypeService";
import { getVenueMap } from "../services/venueService";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import "./MapExplore.css";

const SPORT_COLORS = {
  "Bóng đá":   "#16a34a",
  "Cầu lông":  "#2563eb",
  "Pickleball": "#d97706",
  "Tennis":    "#dc2626",
};
const SPORT_ICONS = {
  "Bóng đá":   "⚽",
  "Cầu lông":  "🏸",
  "Pickleball": "🏓",
  "Tennis":    "🎾",
};
const DEFAULT_PIN_COLOR = "#0d9488";
const DEFAULT_PIN_ICON  = "📍";

const makePinIcon = (color, emoji) =>
  L.divIcon({
    className: "",
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    iconSize: [32, 40],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24S32 27 32 16C32 7.16 24.84 0 16 0z"
        fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <text x="16" y="21" text-anchor="middle" font-size="13" font-family="sans-serif">${emoji}</text>
    </svg>`,
  });

const pinIconCache = {};
const getPinIcon = (sportType) => {
  const key = sportType ?? "";
  if (!pinIconCache[key]) {
    const color = SPORT_COLORS[key] ?? DEFAULT_PIN_COLOR;
    const emoji = SPORT_ICONS[key] ?? DEFAULT_PIN_ICON;
    pinIconCache[key] = makePinIcon(color, emoji);
  }
  return pinIconCache[key];
};

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 };

// Expose map instance to parent via callback
const MapInstanceProvider = ({ onMap }) => {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
};

// Auto-locate user on first load
const AutoLocate = ({ onLocated }) => {
  const map = useMap();
  useEffect(() => {
    map.once("locationfound", (e) => {
      const { lat, lng } = e.latlng;
      map.setView([lat, lng], 14);
      onLocated({ lat, lng });
    });
    map.locate({ setView: false, maxZoom: 16 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const FitToMarkers = ({ items, skipWhen = false }) => {
  const map = useMap();
  useEffect(() => {
    if (skipWhen) return;
    if (!items?.length) {
      map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
      return;
    }
    if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], 15);
      return;
    }
    const bounds = items.map((x) => [x.lat, x.lng]);
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [items, map, skipWhen]);
  return null;
};

// Haversine distance (km)
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapExplore = () => {
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState(null);
  const [venues, setVenues] = useState([]);
  const [map, setMap] = useState(null);
  const searchRef = useRef(null);
  const [mapCenter, setMapCenter] = useState({ lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng });
  const [tileUrl, setTileUrl] = useState(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  );
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sportChips, setSportChips] = useState([{ label: "Tất cả", id: null }]);

  // hide header on mobile while map page is open
  useEffect(() => {
    document.body.classList.add("map-page-active");
    return () => document.body.classList.remove("map-page-active");
  }, []);

  useEffect(() => {
    let mounted = true;
    getSportTypes()
      .then((raw) => {
        const list = normalizeSportTypeList(raw);
        if (!mounted) return;
        setSportChips([
          { label: "Tất cả", id: null },
          ...list.map((s) => ({ label: s.name, id: s.id })),
        ]);
      })
      .catch(() => {
        if (mounted) setSportChips([{ label: "Tất cả", id: null }]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getVenueMap(activeSport)
      .then((raw) => {
        if (!mounted) return;
        const data = Array.isArray(raw) ? raw : raw?.items ?? [];
        const normalized = (data || [])
          .map((v) => {
            const lat = Number(v.latitude ?? v.Latitude ?? v.lat ?? v.Lat ?? 0);
            const lng = Number(v.longitude ?? v.Longitude ?? v.lng ?? v.Lng ?? 0);
            return {
              id: v.id ?? v.venueId ?? v.VenueId,
              name: v.name ?? v.Name ?? v.venueName ?? v.VenueName,
              sportType: v.sportType ?? v.SportType ?? v.sport ?? "",
              ward: v.ward ?? v.Ward ?? v.wardName,
              province: v.province ?? v.Province ?? v.provinceName,
              lat,
              lng,
              raw: v,
            };
          })
          .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
        setVenues(normalized);
      })
      .catch(() => {
        if (mounted) setVenues([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeSport]);


  // close search dropdown when clicking outside
  useEffect(() => {
    if (!showSearchDropdown) return undefined;
    const onDocClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSearchDropdown]);


  // keep track of current map center so we can compute nearest venues
  useEffect(() => {
    if (!map) return undefined;
    const handleMove = () => {
      try {
        const c = map.getCenter();
        setMapCenter({ lat: c.lat, lng: c.lng });
      } catch (e) {
        // ignore
      }
    };
    // set initial
    handleMove();
    map.on("moveend", handleMove);
    return () => {
      map.off("moveend", handleMove);
    };
  }, [map]);

  const toggleTile = () => {
    setTileUrl((prev) =>
      prev.includes("cartocdn")
        ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
    );
  };

  const handleGeolocate = () => {
    if (!map) return;
    try {
      map.once("locationfound", (e) => {
        const { lat, lng } = e.latlng;
        map.setView([lat, lng], 15);
        setSelectedLocation({ lat, lng, label: "Vị trí của bạn" });
      });
      map.locate({ setView: false, maxZoom: 16 });
    } catch (e) {
      // ignore
    }
  };

  
  const filteredVenues = useMemo(() => {
    const q = addressQuery.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) =>
      (v.name ?? "").toLowerCase().includes(q)
    );
  }, [venues, addressQuery]);

  // show only nearest venues in the sidebar list
  const LIST_LIMIT = 8;
  const list = useMemo(() => {
    const ref = selectedLocation
      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
      : mapCenter || { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng };

    const withDist = (filteredVenues || []).map((v) => ({
      ...v,
      distanceKm: getDistanceKm(ref.lat, ref.lng, v.lat, v.lng),
    }));
    withDist.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDist.slice(0, LIST_LIMIT);
  }, [filteredVenues, selectedLocation, mapCenter]);

  return (
    <div className="mapx-page">
      <section className="mapx-map">
        <div className="mapx-topbar">
        <div className="mapx-top-search" ref={searchRef}>
          <div className="mapx-search-input-wrap">
            <input
              className="mapx-search-input"
              value={addressQuery}
              onChange={(e) => {
                setAddressQuery(e.target.value);
                setShowSearchDropdown(e.target.value.trim().length > 0);
              }}
              placeholder="Tìm kiếm sân quanh đây."
            />
            {addressQuery ? (
              <button
                type="button"
                className="mapx-search-submit"
                onClick={() => {
                  setAddressQuery("");
                  setShowSearchDropdown(false);
                }}
                aria-label="Xóa"
              >
                ×
              </button>
            ) : (
              <button
                type="button"
                className="mapx-search-submit"
                aria-label="Tìm"
                disabled
              >
                <Search size={16} />
              </button>
            )}
          </div>

          {showSearchDropdown && (
            <div className="mapx-search-panel">
              <div className="mapx-search-results">
                {filteredVenues.length === 0 ? (
                  <div className="mapx-empty">Không tìm thấy sân nào</div>
                ) : (
                  filteredVenues.slice(0, 10).map((v) => (
                    <div
                      key={v.id}
                      className="mapx-search-venue"
                      onClick={() => {
                        setSelectedLocation({ lat: v.lat, lng: v.lng, label: v.name });
                        setShowSearchDropdown(false);
                        setAddressQuery("");
                        if (map) map.setView([v.lat, v.lng], 15);
                      }}
                    >
                      <div className="mapx-search-venue-name">{v.name}</div>
                      <div className="mapx-search-venue-meta">
                        {[v.ward, v.province].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mapx-top-chips">
          {sportChips.slice(0, 8).map((s) => {
            const emoji = s.id === null ? "🗺️" : (SPORT_ICONS[s.label] ?? "📍");
            const color = s.id === null ? "#0d9488" : (SPORT_COLORS[s.label] ?? DEFAULT_PIN_COLOR);
            const displayLabel = s.id === null ? "Tất cả" : `Sân ${s.label.toLowerCase()}`;
            return (
              <button
                key={s.id === null ? "all" : s.id}
                type="button"
                className={`mapx-chip ${activeSport === s.id ? "active" : ""}`}
                data-sport={s.label}
                onClick={() => setActiveSport(s.id)}
              >
                <span
                  className="mapx-chip-icon"
                  style={{ background: color }}
                >
                  {emoji}
                </span>
                {displayLabel}
              </button>
            );
          })}
        </div>
        </div>

        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={12}
          scrollWheelZoom
          className="mapx-leaflet"
        >
          <MapInstanceProvider onMap={setMap} />
          <AutoLocate onLocated={(pos) => setSelectedLocation({ ...pos, label: "Vị trí của bạn" })} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          <FitToMarkers items={filteredVenues} skipWhen={!!selectedLocation} />
          {selectedLocation ? (
            <Marker key="selected-location" position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>{selectedLocation.label}</Popup>
            </Marker>
          ) : null}
          <MarkerClusterGroup chunkedLoading>
            {filteredVenues.map((v) => (
              <Marker key={v.id} position={[v.lat, v.lng]} icon={getPinIcon(v.sportType)}>
                <Popup>
                  <strong>{v.name}</strong>
                  <br />
                  {[v.ward, v.province].filter(Boolean).join(", ")}
                  <br />
                  <Link to={`/venue/${v.id}`}>Xem chi tiết</Link>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        <div className="mapx-map-controls">
          <button className="mapx-control" type="button" onClick={toggleTile} title="Thay đổi lớp bản đồ">
            <Layers size={18} />
          </button>
          <button className="mapx-control" type="button" onClick={handleGeolocate} title="Định vị tôi">
            <Crosshair size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default MapExplore;

