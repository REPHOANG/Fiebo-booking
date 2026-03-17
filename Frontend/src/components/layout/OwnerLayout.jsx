import React from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout, AUTH_STORAGE_KEY } from "../../store/authSlice";
import "./OwnerLayout.css";

const OwnerLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);

  const handleLogout = () => {
    dispatch(logout());
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem("token");
    } catch (e) {
      // ignore
    }
    navigate("/login", { replace: true });
  };

  return (
    <div className="owner-layout">
      <header className="owner-header">
        <div className="owner-header-left">
          <span className="owner-logo">Fiebo Owner</span>
          <nav className="owner-nav">
            <NavLink
              to="/owner"
              end
              className={({ isActive }) =>
                `owner-nav-link ${isActive ? "active" : ""}`
              }
            >
              Tổng quan
            </NavLink>
            <NavLink
              to="/owner/venues"
              className={({ isActive }) =>
                `owner-nav-link ${isActive ? "active" : ""}`
              }
            >
              Sân của tôi
            </NavLink>
            <NavLink
              to="/owner/create-venue"
              className={({ isActive }) =>
                `owner-nav-link ${isActive ? "active" : ""}`
              }
            >
              Tạo cơ sở
            </NavLink>
          </nav>
        </div>
        <div className="owner-header-right">
          <Link to="/" className="owner-home-btn">
            Về trang khách
          </Link>
          {user && (
            <div className="owner-user">
              <span className="owner-user-name">
                {user.name || user.email || "Owner"}
              </span>
            </div>
          )}
          <button className="owner-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="owner-main">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;

