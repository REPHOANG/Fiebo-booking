import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  Mail,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Building2,
  UsersRound,
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
  const [accountOpen, setAccountOpen] = useState(true);
  const [venuesOpen, setVenuesOpen] = useState(true);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const activePath = location?.pathname || "";
  const isAccountSectionActive = useMemo(() => {
    return (
      activePath.startsWith("/owner/profile") ||
      activePath.startsWith("/owner/subscription")
    );
  }, [activePath]);

  const isVenuesSectionActive = useMemo(() => {
    return (
      activePath.startsWith("/owner/venues") ||
      activePath.startsWith("/owner/offline-booking") ||
      activePath.startsWith("/owner/create-venue") ||
      activePath.startsWith("/owner/staff") 
    );
  }, [activePath]);

  const isEventsSectionActive = useMemo(() => {
    return activePath.startsWith("/owner/events");
  }, [activePath]);

  const breadcrumbItems = useMemo(() => {
    if (activePath === "/owner") return ["Tổng quan"];
    if (activePath.startsWith("/owner/offline-booking")) return ["Cơ sở", "Đặt sân offline"];
    if (activePath.startsWith("/owner/venues")) return ["Cơ sở", "Cơ sở của tôi"];
    if (activePath.startsWith("/owner/create-venue")) return ["Cơ sở", "Tạo cơ sở"];
    if (activePath.startsWith("/owner/profile")) return ["Hồ sơ cá nhân"];
    if (activePath.startsWith("/owner/subscription")) return ["Hồ sơ & gói", "Gói"];
    if (activePath.startsWith("/owner/payout")) return ["Hồ sơ & gói", "Payout"];
    if (activePath.startsWith("/owner/bookings")) return ["Đơn đặt sân"];
    if (activePath.startsWith("/owner/staff")) return ["Cơ sở", "Nhân viên"];
    if (activePath.startsWith("/owner/events/create")) return ["Sự kiện", "Tạo sự kiện"];
    if (activePath.startsWith("/owner/events")) return ["Sự kiện", "Danh sách sự kiện"];
    return ["Danh mục"];
  }, [activePath]);

  const handleLogout = () => {
    dispatch(logout());
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem("token");
    } catch (e) {
      // ignore
    }
    navigate("/", { replace: true });
    setMenuOpen(false);
  };

  const getBreadcrumbIcon = (label) => {
    if (label === "Tổng quan") return <LayoutDashboard size={12} />;
    if (label === "Cơ sở") return <Building2 size={12} />;
    if (label === "Đặt sân offline") return <CalendarClock size={12} />;
    if (label === "Cơ sở của tôi" || label === "Tạo cơ sở") return <Building2 size={12} />;
    if (label === "Hồ sơ cá nhân") return <UserCircle size={12} />;
    if (label === "Hồ sơ & gói" || label === "Gói") return <UserCircle size={12} />;
    if (label === "Payout") return <ReceiptText size={12} />;
    if (label === "Đơn đặt sân") return <ReceiptText size={12} />;
    if (label === "Nhân viên") return <UserCircle size={12} />;
    if (label === "Sự kiện" || label === "Danh sách sự kiện" || label === "Tạo sự kiện") return <CalendarDays size={12} />;
    return null;
  };

  const handleSidebarNavigate = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const onPointerDown = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

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
          <div className={`owner-nav-group ${isAccountSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className="owner-nav-group-btn"
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
            >
              <span className="owner-nav-group-label">
                <UserCircle size={16} /> Hồ sơ & gói
              </span>
              <ChevronDown size={16} className={`owner-nav-caret ${accountOpen ? "open" : ""}`} />
            </button>
            <div className={`owner-nav-sub ${accountOpen ? "open" : "closed"}`}>
              <NavLink
                to="/owner/profile"
                onClick={handleSidebarNavigate}
                className={({ isActive }) => `owner-sidebar-sublink ${isActive ? "active" : ""}`}
              >
                <UserCircle size={15} />
                Hồ sơ
              </NavLink>
              <NavLink
                to="/owner/subscription"
                onClick={handleSidebarNavigate}
                className={({ isActive }) => `owner-sidebar-sublink ${isActive ? "active" : ""}`}
              >
                <ListChecks size={15} />
                Gói
              </NavLink>
            </div>
          </div>

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
              {/* <NavLink
                to="/owner/bookings"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <ReceiptText size={15} />
                Danh sách booking
              </NavLink> */}
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
               <NavLink
                to="/owner/staff"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <UsersRound size={15} />
                Nhân viên
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
            to="/owner/payout"
            onClick={handleSidebarNavigate}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <ReceiptText size={16} />
            Payout
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
          <div className="owner-topbar-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, idx) => (
              <React.Fragment key={`${item}-${idx}`}>
                {idx > 0 ? <ChevronRight size={12} /> : null}
                <span className={idx === breadcrumbItems.length - 1 ? "owner-breadcrumb-active" : ""}>
                  <span className="owner-breadcrumb-item-icon">{getBreadcrumbIcon(item)}</span>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="owner-topbar-right">
            <button type="button" className="owner-topbar-icon" aria-label="mail">
              <Mail size={15} />
            </button>
            <button type="button" className="owner-topbar-icon" aria-label="notifications">
              <Bell size={15} />
            </button>
            <div className="owner-user-menu-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="owner-topbar-user"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setMenuOpen(false);
                }}
              >
                <span className="owner-topbar-avatar">
                  {(user?.name || user?.email || "O").charAt(0).toUpperCase()}
                </span>
                <span className="owner-topbar-name">{user?.name || user?.email || "Owner"}</span>
              </button>

              {userMenuOpen ? (
                <div className="owner-user-menu" role="menu" aria-label="User menu">
                  <Link
                    to="/owner/profile"
                    className="owner-user-menu-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Hồ sơ
                  </Link>
                  <Link
                    to="/wallet"
                    className="owner-user-menu-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Ví
                  </Link>
                  <button
                    type="button"
                    className="owner-user-menu-item owner-user-menu-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;

