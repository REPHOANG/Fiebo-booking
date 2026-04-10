import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart3,
  Calculator,
  CircleDollarSign,
  ListChecks,
  LogOut,
} from "lucide-react";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import "./RoleLayout.css";

const FinanceAdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem(AUTH_STORAGE_KEY);
    navigate("/", { replace: true });
  };

  return (
    <div className="role-layout">
      <aside className="role-sidebar">
        <Link to="/finance-admin" className="role-brand">
          <Calculator size={18} />
          <span>Finance Admin Panel</span>
        </Link>
        <nav className="role-nav">
          <NavLink to="/finance-admin" end>
            Tong quan
          </NavLink>
          <NavLink to="/finance-admin/owner-payouts">Owner payout</NavLink>
          <NavLink to="/finance-admin/process-owner-payouts">
            Process owner payout
          </NavLink>
          <NavLink to="/finance-admin/owner-subscription-transactions">
            Owner subscriptions
          </NavLink>
          <NavLink to="/finance-admin/revenue-reports">Revenue report</NavLink>
          <NavLink to="/finance-admin/withdrawal-requests">
            Withdrawal requests
          </NavLink>
          <NavLink to="/finance-admin/process-withdrawal-requests">
            Process withdrawals
          </NavLink>
        </nav>
      </aside>

      <div className="role-main">
        <header className="role-header">
          <div>
            <p className="role-title">Xin chao Finance Admin</p>
            <p className="role-subtitle">
              {user?.name || user?.email || "Ke toan"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="role-subtitle"
              style={{ margin: 0, display: "inline-flex", gap: 8 }}
            >
              <CircleDollarSign size={15} />
              <ListChecks size={15} />
              <BarChart3 size={15} />
            </span>
            <button
              type="button"
              className="role-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Dang xuat</span>
            </button>
          </div>
        </header>
        <main className="role-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FinanceAdminLayout;
