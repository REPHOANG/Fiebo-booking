import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, MapPin, Compass, Star, User, Map, CalendarDays, Phone, MoreHorizontal, X } from "lucide-react";
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
    { to: "/events", label: "Sự kiện", icon: <CalendarDays size={20} /> },
    { to: "/contact", label: "Contact", icon: <Phone size={20} /> },
    { to: "/profile", label: "Tài khoản", icon: <User size={20} /> },
  ];

  return (
    <>
      <nav className={`bottom-nav ${mobileOpen ? "expanded" : ""}`}>
        {/* Expanded row (slides up inside the bar) */}
        <div className={`bottom-nav-expanded-row ${mobileOpen ? "open" : ""}`}>
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

        {/* Main row */}
        <div className="bottom-nav-main-row">
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
        </div>

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
    </>
  );
};

export default BottomNav;
