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
      <aside className="owner-sidebar">
        <div className="owner-sidebar-top">
          <div className="owner-sidebar-brand">
            <span className="owner-logo">Fiebo Owner</span>
          </div>
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
        </div>

        <nav className="owner-sidebar-nav">
          <NavLink
            to="/owner"
            end
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Tổng quan
          </NavLink>
          <NavLink
            to="/owner/venues"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Sân của tôi
          </NavLink>
          <NavLink
            to="/owner/offline-booking"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Đặt sân offline
          </NavLink>
          <NavLink
            to="/owner/create-venue"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Tạo cơ sở
          </NavLink>
          <NavLink
            to="/owner/bookings"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Đơn đặt sân
          </NavLink>

          <div className="owner-sidebar-divider" />

          <NavLink
            to="/owner/events/create"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Tạo sự kiện
          </NavLink>
          <NavLink
            to="/owner/events"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Danh sách sự kiện
          </NavLink>
        </nav>

        <div className="owner-sidebar-footer">
          <button className="owner-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="owner-content">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;

