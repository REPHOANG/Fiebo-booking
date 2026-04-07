import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import { BriefcaseBusiness, LogOut } from "lucide-react";
import "./RoleLayout.css";

const StaffLayout = () => {
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
        <Link to="/staff" className="role-brand">
          <BriefcaseBusiness size={18} />
          <span>Staff Panel</span>
        </Link>
        <nav className="role-nav">
          <NavLink to="/staff" end>
            Tổng quan
          </NavLink>
          <NavLink to="/staff/profile">Hồ sơ</NavLink>
        </nav>
      </aside>

      <div className="role-main">
        <header className="role-header">
          <div>
            <p className="role-title">Xin chào Staff</p>
            <p className="role-subtitle">{user?.name || user?.email || "Nhân viên"}</p>
          </div>
          <button type="button" className="role-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </header>
        <main className="role-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;

