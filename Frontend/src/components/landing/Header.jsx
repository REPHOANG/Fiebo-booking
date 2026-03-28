import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, AUTH_STORAGE_KEY } from "../../store/authSlice";
import {
  SearchIcon,
  ShoppingCartIcon,
  MenuIcon,
  XIcon,
  BellIcon,
  UserIcon,
  LogOutIcon,
  ChevronDownIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logohomepage from "../../assets/images/Logo Fiebo.png";
import "./Header.css";
import LoginPopup from "../common/LoginPopup/LoginPopup";

const Header = () => {
  const dispatch = useDispatch();
  
  // Get user from Redux
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = useSelector((state) => state.auth.isAuthenticated);
  const isOwner =
    (user?.role || user?.roles || "")
      .toString()
      .toLowerCase() === "fieldowner";
  
  const notificationCount = 3; // sau này lấy từ API
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loginPopupOpen, setLoginPopupOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('token');
    setUserMenuOpen(false);
  };

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <div className="header-container">
        {/* LEFT */}
        <div className="header-left">
          <Link to="/" className="logo">
            <img src={Logohomepage} alt="Fiebo Logo" className="logo-img" />
            <span className="logo-text">Fiebo</span>
          </Link>

          <nav className="menu-desktop">
            <NavLink to="/" end>Trang chủ</NavLink>

            {/* Mega Menu */}

              <div className="mega-wrapper">
                <NavLink to="/venues" className="mega-link">Sân</NavLink>

                <div className="mega-menu">
                <div className="mega-column">
                  <h4>Loại sân</h4>
                  <Link to="/venues?sport=1">Sân bóng đá</Link>
                  <Link to="/venues?sport=2">Sân bóng rổ</Link>
                  <Link to="/venues?sport=3">Sân tennis</Link>
                  <Link to="/venues?sport=4">Sân pickleball</Link>
                </div>

                <div className="mega-column">
                  <h4>Khu vực</h4>
                  <Link to="/venues?search=Hà%20Nội">Hà Nội</Link>
                  <Link to="/venues?search=TP%20HCM">TP HCM</Link>
                  <Link to="/venues?search=Đà%20Nẵng">Đà Nẵng</Link>
                </div>
              </div>
              </div>
            

            <NavLink to="/map">Bản đồ</NavLink>
            <NavLink to="/discover">Khám phá</NavLink>
            <NavLink to="/featured">Nổi bật</NavLink>
            <NavLink to="/events">Sự kiện</NavLink>
            <NavLink to="/contact">Contact</NavLink>
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
            <div className="user-area">
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
              onClick={() => setLoginPopupOpen(true)}
            >
              Đăng nhập
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
       
      <LoginPopup open={loginPopupOpen} onClose={() => setLoginPopupOpen(false)} />
      </div>
    </header>
  );
};

export default Header;