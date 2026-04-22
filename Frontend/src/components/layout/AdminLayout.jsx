import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeDollarSign,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  PackageOpen,
  ScrollText,
  Shield,
  Trophy,
  Users,
  X,
} from "lucide-react";
import fieboLogo from "../../assets/images/logo-fiebo.png";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import "./AdminLayout.css";

const navItems = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/customers", label: "Khách hàng", icon: Users },
  { to: "/admin/owners", label: "Hồ sơ chủ sở hữu", icon: Users },
  { to: "/admin/venue-registrations", label: "Duyệt đăng ký cơ sở", icon: ScrollText },
  { to: "/admin/finance-admins", label: "Quản lý tài chính", icon: BadgeDollarSign },
  { to: "/admin/subscriptions", label: "Quản lý gói dịch vụ", icon: PackageOpen },
  { to: "/admin/sports", label: "Danh mục thể thao", icon: Trophy },
];

const AdminLayout = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initials = String(user?.name || user?.email || "AD")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    dispatch(logout());
    window.location.assign("/");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <div className="admin-shell__overlay" onClick={closeSidebar} />
      )}

      <aside className={`admin-shell__sidebar${sidebarOpen ? " admin-shell__sidebar--open" : ""}`}>
        <div className="admin-shell__sidebar-header">
          <Link to="/admin" className="admin-shell__brand" onClick={closeSidebar}>
            <img src={fieboLogo} alt="Fiebo" className="admin-shell__brand-logo" />
            <span>FieboAdmin</span>
          </Link>
          <button
            type="button"
            className="admin-shell__sidebar-close"
            onClick={closeSidebar}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="admin-shell__nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="admin-shell__nav-link" onClick={closeSidebar}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-shell__profile-card">
          <div className="admin-shell__avatar">{initials || "AD"}</div>
          <div>
            <p className="admin-shell__profile-name">Quản trị viên</p>
            <p className="admin-shell__profile-role">Điều hành hệ thống</p>
          </div>
        </div>
      </aside>

      <div className="admin-shell__main">
        <header className="admin-shell__header">
          <button
            type="button"
            className="admin-shell__menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <div className="admin-shell__header-actions">
            <div className="admin-shell__account-meta">
              <span>Đăng nhập bằng</span>
              <strong>{user?.email || user?.name || "admin@fiebo.vn"}</strong>
            </div>
            <button type="button" className="admin-shell__logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="admin-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

