import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Shield } from "lucide-react";
import { AUTH_STORAGE_KEY, logout } from "../../store/authSlice";
import "./RoleLayout.css";

const AdminLayout = () => {
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
        <Link to="/admin" className="role-brand">
          <Shield size={18} />
          <span>Admin Panel</span>
        </Link>
        <nav className="role-nav">
          <NavLink to="/admin" end>
            Tổng quan
          </NavLink>
          <NavLink to="/admin/users">Người dùng</NavLink>
        </nav>
      </aside>

      <div className="role-main">
        <header className="role-header">
          <div>
            <p className="role-title">Xin chào Admin</p>
            <p className="role-subtitle">{user?.name || user?.email || "Quản trị viên"}</p>
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

export default AdminLayout;

