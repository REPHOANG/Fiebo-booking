import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Search } from "lucide-react";
import { getSportTypes, normalizeSportTypeList } from "../services/sportTypeService";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import "./MapExplore.css";

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 };

const FitToMarkers = ({ items }) => {
  const map = useMap();
  useEffect(() => {
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
  }, [items, map]);
  return null;
};

const MapExplore = () => {
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [activeSport, setActiveSport] = useState(null);
  const [venues, setVenues] = useState([]);
  const [sportChips, setSportChips] = useState([{ label: "Tất cả", id: null }]);

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

  
  const list = useMemo(() => venues.slice(0, 50), [venues]);

  return (
    <div className="mapx-page">
      <aside className="mapx-panel">
        <div className="mapx-search">
          <Search size={16} />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm sân theo tên/khu vực..."
          />
        </div>

        <div className="mapx-chips">
          {sportChips.map((s) => (
            <button
              key={s.id === null ? "all" : s.id}
              type="button"
              className={`mapx-chip ${activeSport === s.id ? "active" : ""}`}
              onClick={() => setActiveSport(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mapx-list">
          {loading ? (
            <p className="mapx-empty">Đang tải dữ liệu sân...</p>
          ) : list.length === 0 ? (
            <p className="mapx-empty">Không tìm thấy sân phù hợp.</p>
          ) : (
            list.map((v) => (
              <Link key={v.id} to={`/venue/${v.id}`} className="mapx-item">
                <div className="mapx-item-name">{v.name}</div>
                <div className="mapx-item-meta">
                  {[v.ward, v.province].filter(Boolean).join(", ")}
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className="mapx-map">
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={12}
          scrollWheelZoom
          className="mapx-leaflet"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToMarkers items={venues} />
          <MarkerClusterGroup chunkedLoading>
            {venues.map((v) => (
              <Marker key={v.id} position={[v.lat, v.lng]}>
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
      </section>
    </div>
  );
};

export default MapExplore;

