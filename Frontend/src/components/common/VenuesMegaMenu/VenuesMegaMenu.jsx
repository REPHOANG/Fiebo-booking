import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSportTypes, normalizeSportTypeList } from "../../../services/sportTypeService";
import "./VenuesMegaMenu.css";

const regionLink = (q) => `/venues?search=${encodeURIComponent(q)}`;

/**
 * Hai cột: Loại sân (GET `/api/sport-types`) + Khu vực — dùng chung Header & SearchBar.
 * Chỉ gọi API khi `active` (vd. sau khi hover/focus vào vùng mega menu) để trang như đặt sân không tải sport-types.
 * @param {{ align?: "start" | "end", active?: boolean }} props
 */
const VenuesMegaMenu = ({ align = "start", active = true }) => {
  const [sports, setSports] = useState([]);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    getSportTypes()
      .then((raw) => {
        if (mounted) setSports(normalizeSportTypeList(raw));
      })
      .catch(() => {
        if (mounted) setSports([]);
      });
    return () => {
      mounted = false;
    };
  }, [active]);

  return (
    <div
      className={`venues-mega-panel ${align === "end" ? "venues-mega-panel--end" : ""}`}
      role="region"
      aria-label="Lọc sân theo môn và khu vực"
    >
      <div className="venues-mega-column">
        <h4>Loại sân</h4>
        {sports.length === 0 ? (
          <span className="venues-mega-muted">
            {active ? "Đang tải…" : "Mở menu để tải loại sân"}
          </span>
        ) : (
          sports.map((s) => (
            <Link key={s.id} to={`/venues?sport=${s.id}`}>
              Sân {s.name}
            </Link>
          ))
        )}
      </div>
      <div className="venues-mega-column">
        <h4>Khu vực</h4>
        <Link to={regionLink("Hà Nội")}>Hà Nội</Link>
        <Link to={regionLink("TP HCM")}>TP HCM</Link>
        <Link to={regionLink("Đà Nẵng")}>Đà Nẵng</Link>
      </div>
    </div>
  );
};

export default VenuesMegaMenu;
