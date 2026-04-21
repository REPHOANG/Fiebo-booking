import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart3,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Wallet,
  X,
} from "lucide-react";
import fieboLogo from "../../assets/images/Logo Fiebo.png";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import "./AdminLayout.css";

const navItems = [
  { to: "/finance-admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/finance-admin/owner-payouts", label: "Thanh toán cho chủ sân", icon: CircleDollarSign },
  { to: "/finance-admin/process-owner-payouts", label: "Xử lý thanh toán cho chủ sân", icon: Receipt },
  { to: "/finance-admin/owner-subscription-transactions", label: "Giao dịch đăng ký của chủ sân", icon: FileText },
  { to: "/finance-admin/revenue-reports", label: "Báo cáo doanh thu", icon: BarChart3 },
  { to: "/finance-admin/withdrawal-requests", label: "Yêu cầu rút tiền", icon: Wallet },
  { to: "/finance-admin/process-withdrawal-requests", label: "Xử lý yêu cầu rút tiền", icon: Receipt },
];

const FinanceAdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = String(user?.name || user?.email || "FA")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem(AUTH_STORAGE_KEY);
    navigate("/", { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <div className="admin-shell__overlay" onClick={closeSidebar} />
      )}

      <aside className={`admin-shell__sidebar${sidebarOpen ? " admin-shell__sidebar--open" : ""}`}>
        <div className="admin-shell__sidebar-header">
          <Link to="/finance-admin" className="admin-shell__brand" onClick={closeSidebar}>
            <img src={fieboLogo} alt="Fiebo" className="admin-shell__brand-logo" />
            <span>Finance Admin</span>
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
          <div className="admin-shell__avatar">{initials || "FA"}</div>
          <div>
            <p className="admin-shell__profile-name">Finance Admin</p>
            <p className="admin-shell__profile-role">{user?.email || "finance@fiebo.com"}</p>
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
              <strong>{user?.email || user?.name || "finance@fiebo.com"}</strong>
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

export default FinanceAdminLayout;
