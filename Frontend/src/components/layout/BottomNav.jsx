import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, MapPin, Compass, Star, User, Map, Info, Phone, MoreHorizontal, X } from "lucide-react";
import "./BottomNav.css";

const BottomNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const primary = [
    { to: "/", label: "Trang chủ", icon: <Home size={20} /> , end: true},
    { to: "/venues", label: "Sân", icon: <Map size={20} /> },
    { to: "/map", label: "Bản đồ", icon: <MapPin size={20} /> },
    { to: "/discover", label: "Khám phá", icon: <Compass size={20} /> },
  ];

  const more = [
    { to: "/featured", label: "Nổi bật", icon: <Star size={20} /> },
    { to: "/about", label: "About", icon: <Info size={20} /> },
    { to: "/contact", label: "Contact", icon: <Phone size={20} /> },
    { to: "/profile", label: "Tài khoản", icon: <User size={20} /> },
  ];

  return (
    <>
      <nav className={`bottom-nav ${mobileOpen ? "expanded" : ""}`}>
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* More button for mobile */}
        <button
          className="nav-item more-btn"
          onClick={() => setMobileOpen((s) => !s)}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span>{mobileOpen ? "Đóng" : "Thêm"}</span>
        </button>

        {/* Desktop: render all items in sidebar below primary */}
        <div className="more-desktop">
          {more.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile expanded panel */}
      <div className={`mobile-expand-overlay ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)}>
        <div className="mobile-expand" onClick={(e) => e.stopPropagation()}>
          {more.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};

export default BottomNav;
