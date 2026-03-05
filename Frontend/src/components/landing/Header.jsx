import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/authSlice";
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

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get user from Redux
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = useSelector((state) => state.auth.isAuthenticated);
  
  const notificationCount = 3; // sau này lấy từ API
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

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
    localStorage.removeItem('authState');
    sessionStorage.removeItem('token');
    setUserMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <div className="header-container">
        {/* LEFT */}
        <div className="header-left">
          <Link to="/home" className="logo">
            <img src={Logohomepage} alt="Fiebo Logo" className="logo-img" />
            <span className="logo-text">Fiebo</span>
          </Link>

          <nav className="menu-desktop">
            <NavLink to="/home" end>Trang chủ</NavLink>

            {/* Mega Menu */}
            <div className="mega-wrapper">
              <NavLink to="/venues">Sân</NavLink>

              <div className="mega-menu">
                <div className="mega-column">
                  <h4>Loại sân</h4>
                  <Link to="/venues/football">Sân bóng đá</Link>
                  <Link to="/venues/badminton">Sân cầu lông</Link>
                  <Link to="/venues/tennis">Sân tennis</Link>
                </div>

                <div className="mega-column">
                  <h4>Khu vực</h4>
                  <Link to="/venues/hanoi">Hà Nội</Link>
                  <Link to="/venues/hcm">TP HCM</Link>
                  <Link to="/venues/danang">Đà Nẵng</Link>
                </div>
              </div>
            </div>

            <NavLink to="/map">Bản đồ</NavLink>
            <NavLink to="/discover">Khám phá</NavLink>
            <NavLink to="/featured">Nổi bật</NavLink>
            <NavLink to="/about">About</NavLink>
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
            <Link to="/login" className="login-btn">
              Đăng nhập
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="menu-toggle">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav className="menu-mobile">
          <Link to="/" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
          <Link to="/venues" onClick={() => setIsMenuOpen(false)}>Sân</Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)}>Về chúng tôi</Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Liên hệ</Link>
        </nav>
      )}
    </header>
  );
};

export default Header;