import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeDollarSign,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  MapPinned,
  ScrollText,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import "./AdminLayout.css";

const navItems = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/audit-logs", label: "Nhật ký hệ thống", icon: ClipboardList },
  { to: "/admin/reports", label: "Báo cáo", icon: FileBarChart2 },
  { to: "/admin/customers", label: "Khách hàng", icon: Users },
  { to: "/admin/venues", label: "Quản lý sân", icon: MapPinned },
  { to: "/admin/owners", label: "Hồ sơ chủ sân", icon: Users },
  { to: "/admin/venue-registrations", label: "Duyệt đăng ký sân", icon: ScrollText },
  { to: "/admin/finance-admins", label: "Quản lý tài chính", icon: BadgeDollarSign },
  { to: "/admin/sports", label: "Danh mục thể thao", icon: Trophy },
  { to: "/admin/policies", label: "Chính sách", icon: Shield },
];

const AdminLayout = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
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

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <Link to="/admin" className="admin-shell__brand">
          <Shield size={18} />
          <span>FieboAdmin</span>
        </Link>
        <nav className="admin-shell__nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="admin-shell__nav-link">
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

