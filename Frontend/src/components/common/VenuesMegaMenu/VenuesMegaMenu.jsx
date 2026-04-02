import { Link } from "react-router-dom";
import "./VenuesMegaMenu.css";

const regionLink = (q) => `/venues?search=${encodeURIComponent(q)}`;

/**
 * Hai cột: Loại sân + Khu vực — dùng chung Header & SearchBar.
 * @param {{ align?: "start" | "end" }} props
 */
const VenuesMegaMenu = ({ align = "start" }) => {
  return (
    <div
      className={`venues-mega-panel ${align === "end" ? "venues-mega-panel--end" : ""}`}
      role="region"
      aria-label="Lọc sân theo môn và khu vực"
    >
      <div className="venues-mega-column">
        <h4>Loại sân</h4>
        <Link to="/venues?sport=1">Sân bóng đá</Link>
        <Link to="/venues?sport=2">Sân bóng rổ</Link>
        <Link to="/venues?sport=3">Sân tennis</Link>
        <Link to="/venues?sport=4">Sân pickleball</Link>
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
