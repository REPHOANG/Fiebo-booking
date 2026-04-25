import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation, matchPath } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleDollarSign,
  FileText,
  LogOut,
  Menu,
  Wallet,
  X,
} from "lucide-react";
import fieboLogo from "../../assets/images/Logo Fiebo.png";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import "./AdminLayout.css";

const navItems = [
  { to: "/finance-admin/transactions", label: "Danh sách giao dịch", icon: FileText },
  { to: "/finance-admin/payout-batches", label: "Quản lý đợt thanh toán", icon: CircleDollarSign },
  // { to: "/finance-admin/revenue-reports", label: "Báo cáo doanh thu", icon: BarChart3 },
  { to: "/finance-admin/withdrawal-requests", label: "Yêu cầu rút tiền", icon: Wallet },
];

const FinanceAdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Find current page title based on navItems
  const currentNavItem = navItems.find((item) =>
    matchPath({ path: item.to, end: item.end }, location.pathname)
  );

  // If no exact match (e.g. detail page), try to find a parent match
  const fallbackNavItem = !currentNavItem 
    ? navItems.slice(1).find(item => location.pathname.startsWith(item.to)) 
    : null;

  const pageTitle = currentNavItem 
    ? currentNavItem.label 
    : fallbackNavItem ? fallbackNavItem.label
      : "Finance Admin";



  const handleLogout = () => {
    dispatch(logout());
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      queryClient.clear();
    } catch (e) {
      // ignore
    }
    navigate("/", { replace: true });
    setSidebarOpen(false);
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
          <div className="admin-shell__header-title">
            {pageTitle}
          </div>
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
