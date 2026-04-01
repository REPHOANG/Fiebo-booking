import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Search,
  Bell,
  Mail,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Building2,
  CalendarClock,
  PlusSquare,
  ReceiptText,
  CalendarDays,
  ListChecks,
  UserCircle,
} from "lucide-react";
import { logout, AUTH_STORAGE_KEY } from "../../store/authSlice";
import "./OwnerLayout.css";

const OwnerLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [venuesOpen, setVenuesOpen] = useState(true);
  const [eventsOpen, setEventsOpen] = useState(true);

  const activePath = location?.pathname || "";
  const isVenuesSectionActive = useMemo(() => {
    return (
      activePath.startsWith("/owner/venues") ||
      activePath.startsWith("/owner/offline-booking") ||
      activePath.startsWith("/owner/create-venue")
    );
  }, [activePath]);

  const isEventsSectionActive = useMemo(() => {
    return activePath.startsWith("/owner/events");
  }, [activePath]);

  const handleLogout = () => {
    dispatch(logout());
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem("token");
    } catch (e) {
      // ignore
    }
    navigate("/login", { replace: true });
    setMenuOpen(false);
  };

  const handleSidebarNavigate = () => {
    setMenuOpen(false);
  };

  return (
    <div className="owner-layout">
      <aside className={`owner-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="owner-sidebar-top">
          <div className="owner-sidebar-brand">
            <span className="owner-logo">Fiebo Owner</span>
          </div>
        </div>

        <nav className="owner-sidebar-nav">
          <NavLink
            to="/owner"
            end
            onClick={handleSidebarNavigate}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <LayoutDashboard size={16} />
            Tổng quan
          </NavLink>
          <NavLink
            to="/owner/profile"
            onClick={handleSidebarNavigate}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <UserCircle size={16} />
            Hồ sơ & gói
          </NavLink>

          <div className={`owner-nav-group ${isVenuesSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className="owner-nav-group-btn"
              onClick={() => setVenuesOpen((v) => !v)}
              aria-expanded={venuesOpen}
            >
              <span className="owner-nav-group-label">
                <Building2 size={16} /> Cơ sở
              </span>
              <ChevronDown size={16} className={`owner-nav-caret ${venuesOpen ? "open" : ""}`} />
            </button>
            <div className={`owner-nav-sub ${venuesOpen ? "open" : "closed"}`}>
              <NavLink
                to="/owner/venues"
                  end
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <Building2 size={15} />
                Cơ sở của tôi
              </NavLink>
              <NavLink
                to="/owner/offline-booking"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <CalendarClock size={15} />
                Đặt sân offline
              </NavLink>
              <NavLink
                to="/owner/create-venue"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <PlusSquare size={15} />
                Tạo cơ sở
              </NavLink>
            </div>
          </div>

          <NavLink
            to="/owner/bookings"
            onClick={handleSidebarNavigate}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <ReceiptText size={16} />
            Đơn đặt sân
          </NavLink>
          <NavLink
            to="/owner/staff"
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Nhân viên
          </NavLink>

          <div className="owner-sidebar-divider" />

          <div className={`owner-nav-group ${isEventsSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className="owner-nav-group-btn"
              onClick={() => setEventsOpen((v) => !v)}
              aria-expanded={eventsOpen}
            >
              <span className="owner-nav-group-label">
                <CalendarDays size={16} /> Sự kiện
              </span>
              <ChevronDown size={16} className={`owner-nav-caret ${eventsOpen ? "open" : ""}`} />
            </button>
            <div className={`owner-nav-sub ${eventsOpen ? "open" : "closed"}`}>
              <NavLink
                to="/owner/events/create"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <PlusSquare size={15} />
                Tạo sự kiện
              </NavLink>
              <NavLink
                to="/owner/events"
                end
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <ListChecks size={15} />
                Danh sách sự kiện
              </NavLink>
            </div>
          </div>
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
          aria-label="Close owner menu"
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
          <label className="owner-topbar-search">
            <Search size={14} />
            <input type="text" placeholder="Search..." />
          </label>
          <div className="owner-topbar-right">
            <button type="button" className="owner-topbar-icon" aria-label="mail">
              <Mail size={15} />
            </button>
            <button type="button" className="owner-topbar-icon" aria-label="notifications">
              <Bell size={15} />
            </button>
            <Link
              to="/owner/profile"
              className="owner-topbar-user"
              onClick={() => setMenuOpen(false)}
            >
              <span className="owner-topbar-avatar">
                {(user?.name || user?.email || "O").charAt(0).toUpperCase()}
              </span>
              <span className="owner-topbar-name">{user?.name || user?.email || "Owner"}</span>
            </Link>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;

