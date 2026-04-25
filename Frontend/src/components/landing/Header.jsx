import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, AUTH_STORAGE_KEY } from "../../store/authSlice";
import { useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  ChevronDownIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logohomepage from "../../assets/images/Logo Fiebo.png";
import "./Header.css";
import { useAuthModal } from "../../context/AuthModalContext";
import VenuesMegaMenu from "../common/VenuesMegaMenu/VenuesMegaMenu";

const Header = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [venuesMegaActive, setVenuesMegaActive] = useState(false);

  // Get user from Redux
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = useSelector((state) => state.auth.isAuthenticated);
  const isOwner =
    (user?.role || user?.roles || "")
      .toString()
      .toLowerCase() === "fieldowner";

  const notificationCount = 3; // sau này lấy từ API
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const userMenuRef = useRef(null);
  const { openLogin, openRegister } = useAuthModal();

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userMenuOpen]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('token');
    queryClient.clear();
    setUserMenuOpen(false);
  };

  const handleMegaMenuBlur = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setVenuesMegaActive(false);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          {/* LEFT */}
          <div className="header-left">
            <Link to="/" className="logo">
              <img src={Logohomepage} alt="Fiebo Logo" className="logo-img" />
              <span className="logo-text">Fiebo</span>
            </Link>

            <nav className="menu-desktop">
              <NavLink to="/" end>Trang chủ</NavLink>

              <div
                className={`mega-wrapper ${venuesMegaActive ? 'mega-open' : ''}`}
                onMouseEnter={() => setVenuesMegaActive(true)}
                onMouseLeave={() => setVenuesMegaActive(false)}
                onFocusCapture={() => setVenuesMegaActive(true)}
                onBlurCapture={handleMegaMenuBlur}
              >
                <NavLink to="/venues" className="mega-link">
                  Sân
                </NavLink>
                <VenuesMegaMenu align="start" active={venuesMegaActive} />
              </div>

              <NavLink to="/featured">Nổi bật</NavLink>
              <NavLink to="/events">Sự kiện</NavLink>
              <NavLink to="/map">Bản đồ</NavLink>
              <button
                type="button"
                className="become-owner-nav-btn"
                onClick={() => openRegister({ accountRole: "FieldOwner" })}
              >
                Trở thành chủ sân
              </button>
            </nav>
          </div>

          {/* RIGHT */}
          <div className="header-actions">
            {/* <button className="icon-btn">
            <SearchIcon size={20} />
          </button>

          <Link to="/cart" className="icon-btn">
            <ShoppingCartIcon size={20} />
          </Link> */}

            {isLoggedIn ? (
              <div className="user-area" ref={userMenuRef}>
                {/* Greeting */}
                <div
                  className="greeting-wrapper"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotificationOpen(false);
                  }}
                >
                  <span className="greeting-text">
                    Xin chào, <strong>{user?.name || user?.fullName || "Người dùng"}</strong>
                  </span>

                  <motion.span
                    animate={{ rotate: userMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDownIcon size={16} />
                  </motion.span>
                </div>

                {/* USER DROPDOWN */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="dropdown user-dropdown"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link to="/profile">Hồ sơ</Link>
                      <Link to="/bookings">Sân đã đặt</Link>
                      <Link to="/wallet">Ví của tôi</Link>
                      {isOwner && <Link to="/owner/venues">Sân của tôi</Link>}

                      <div className="dropdown-divider" />

                      <button className="logout-item" onClick={handleLogout}>
                        Đăng xuất
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🔔 Notification */}
                <div className="icon-wrapper">
                  <button
                    className="icon-btn premium-icon"
                    onClick={() => {
                      setNotificationOpen(!notificationOpen);
                      setUserMenuOpen(false);
                    }}
                  >
                    <BellIcon size={20} />
                    {notificationCount > 0 && (
                      <span className="notification-badge">
                        {notificationCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notificationOpen && (
                      <motion.div
                        className="dropdown notification-dropdown"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="dropdown-title">Thông báo</p>
                        <div className="notification-item">
                          Bạn có lịch đặt sân lúc 18:00 hôm nay
                        </div>
                        <div className="notification-item">
                          Sân ABC xác nhận đặt sân
                        </div>
                        <Link to="/notifications" className="view-all">
                          Xem tất cả
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="login-btn"
                onClick={() => openLogin()}
              >
                Đăng nhập
              </button>
            )}
          </div>

          {/* Mobile Toggle */}

        </div>
      </header>
      <div className="header-spacer" aria-hidden="true" />
    </>
  );
};

export default Header;