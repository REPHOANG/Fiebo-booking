import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  ReceiptText,
  Settings,
  UserCircle,
  Volleyball,
  X,
} from "lucide-react";
import "./OwnerLayout.css";

const StaffLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const activePath = location?.pathname || "";
  const breadcrumbItems = useMemo(() => {
    if (activePath === "/staff") return ["Tổng quan"];
    if (activePath.startsWith("/staff/profile")) return ["Hồ sơ cá nhân"];
    if (activePath.startsWith("/staff/offline-booking") || activePath.includes("/offline-booking")) return ["Đặt sân offline"];
    if (activePath.startsWith("/staff/bookings")) return ["Đơn đặt sân"];
    if (activePath.startsWith("/staff/events")) return ["Sự kiện"];
    return ["Staff"];
  }, [activePath]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem(AUTH_STORAGE_KEY);
    navigate("/", { replace: true });
    setMenuOpen(false);
    setUserMenuOpen(false);
  };

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <div className="owner-layout">
      <aside className={`owner-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="owner-sidebar-top">
          <div className="owner-sidebar-brand">
            <span className="owner-logo">Fiebo Staff</span>
          </div>
        </div>

        <nav className="owner-sidebar-nav">
          <NavLink
            to="/staff"
            end
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `owner-sidebar-link ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard size={16} />
            Tổng quan
          </NavLink>
          <NavLink
            to="/staff/offline-booking"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive || activePath.includes("/staff/venues/") ? "active" : ""}`
            }
          >
            <Volleyball size={16} />
            Đặt sân offline
          </NavLink>
          <NavLink
            to="/staff/bookings"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `owner-sidebar-link ${isActive ? "active" : ""}`}
          >
            <ReceiptText size={16} />
            Đơn đặt sân
          </NavLink>
          <NavLink
            to="/staff/events"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `owner-sidebar-link ${isActive ? "active" : ""}`}
          >
            <CalendarDays size={16} />
            Sự kiện
          </NavLink>
          <NavLink
            to="/staff/profile"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `owner-sidebar-link ${isActive ? "active" : ""}`}
          >
            <UserCircle size={16} />
            Hồ sơ
          </NavLink>
        </nav>

        <div className="owner-sidebar-footer">
          <button className="owner-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="owner-sidebar-overlay"
          aria-label="Close staff menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <main className="owner-content">
        <div className="owner-topbar">
          <button
            type="button"
            className="owner-topbar-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="owner-topbar-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, idx) => (
              <React.Fragment key={`${item}-${idx}`}>
                {idx > 0 ? <ChevronRight size={12} /> : null}
                <span className={idx === breadcrumbItems.length - 1 ? "owner-breadcrumb-active" : ""}>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="owner-topbar-right">
            <button type="button" className="owner-topbar-icon" aria-label="mail">
              <Mail size={15} />
            </button>
            <button type="button" className="owner-topbar-icon" aria-label="notifications">
              <Bell size={15} />
            </button>
            <div className="owner-user-menu-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="owner-topbar-user"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setMenuOpen(false);
                }}
              >
                <span className="owner-topbar-avatar">
                  {(user?.name || user?.email || "S").charAt(0).toUpperCase()}
                </span>
                <span className="owner-topbar-name">{user?.name || user?.email || "Staff"}</span>
              </button>
              {userMenuOpen ? (
                <div className="owner-user-menu" role="menu" aria-label="User menu">
                  <Link
                    to="/staff/profile"
                    className="owner-user-menu-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={14} />
                    Hồ sơ
                  </Link>
                  <button
                    type="button"
                    className="owner-user-menu-item owner-user-menu-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
