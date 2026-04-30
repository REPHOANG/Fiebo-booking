import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, MapPin, Wallet, Star, User, Map, CalendarDays, MoreHorizontal, X } from "lucide-react";
import { useSelector } from "react-redux";
import "./BottomNav.css";

const BottomNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const primary = [
    { to: "/", label: "Trang chủ", icon: <Home size={20} /> , end: true},
    { to: "/venues", label: "Sân", icon: <Map size={20} /> },
    { to: "/map", label: "Bản đồ", icon: <MapPin size={20} /> },
    { to: "/events", label: "Sự kiện", icon: <CalendarDays size={20} /> },
   
  ];

  const isLoggedIn = useSelector((state) => state.auth.isAuthenticated);

  const more = [
    { to: "/featured", label: "Nổi bật", icon: <Star size={20} /> },
    { to: "/wallet", label: "Ví", icon: <Wallet size={20} /> },
    { to: "/bookings", label: "Sân đã đặt", icon: <CalendarDays size={20} /> },
    { to: "/profile", label: isLoggedIn ? "Tài khoản" : "Đăng nhập", icon: <User size={20} /> },
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
