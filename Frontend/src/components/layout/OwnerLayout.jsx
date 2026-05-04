import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  Mail,
  Menu,
  X,
  ChevronLeft,
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
  LogOut,
  CircleDollarSign,
  Wallet,
} from "lucide-react";
import { logout, AUTH_STORAGE_KEY } from "../../store/authSlice";
import { useQueryClient } from "@tanstack/react-query";
import { isFieldOwnerUser, resolveOwnerSubscriptionState } from "../../utils/ownerSubscription";
import "./OwnerLayout.css";

const OwnerLayout = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [venuesOpen, setVenuesOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const userMenuRef = useRef(null);

  const activePath = location?.pathname || "";
  const isOwnerUser = isFieldOwnerUser(user);

  const ownerPlanState = useMemo(() => {
    if (!isOwnerUser) {
      return resolveOwnerSubscriptionState(user);
    }

    const statusRaw = user?.hasSubscription ?? user?.HasSubscription ?? null;
    const normalizedStatus =
      typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : statusRaw;

    let status = "expired";
    if (normalizedStatus === "inactive" || Number(statusRaw) === -1) status = "inactive";
    else if (normalizedStatus === "expired" || normalizedStatus === false || Number(statusRaw) === 0) {
      status = "expired";
    } else if (normalizedStatus === "active" || normalizedStatus === true || Number(statusRaw) === 1) {
      status = "active";
    }

    if (statusRaw == null) {
      return resolveOwnerSubscriptionState(user);
    }

    return {
      checked: true,
      status,
      active: status === "active",
      reason:
        status === "inactive"
          ? "Tài khoản của bạn đang bị tạm ngưng. Vui lòng liên hệ hỗ trợ để mở lại."
          : status === "expired"
            ? "Gói hiện tại đã hết hạn. Một số tính năng sẽ bị khóa cho đến khi bạn gia hạn."
            : "",
    };
  }, [isOwnerUser, user]);

  const planStatus = ownerPlanState.status || (ownerPlanState.active ? "active" : "expired");
  const isOwnerPlanInactive = ownerPlanState.checked && planStatus === "inactive";
  const isOwnerPlanExpired = ownerPlanState.checked && planStatus === "expired";
  const shouldLockSidebar = isOwnerPlanInactive;
  const shouldHideSidebar = isOwnerPlanInactive;
  const shouldDisableCreateVenue = isOwnerPlanExpired;
  const shouldDisableCreateEvent = isOwnerPlanExpired;
  const isOnSubscriptionPlans = activePath.startsWith("/owner/subscription/plans");
  const isOnSubscriptionOverview = activePath.startsWith("/owner/subscription/overview");
  const isOnOwnerProfile = activePath.startsWith("/owner/profile");
  const isOnOwnerWallet = activePath.startsWith("/owner/wallet");

  const isAccountSectionActive = useMemo(() => {
    return (
      activePath.startsWith("/owner/profile") ||
      activePath.startsWith("/owner/subscription") ||
      activePath.startsWith("/owner/wallet")
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
    if (activePath.startsWith("/owner/subscription/plans")) return ["Hồ sơ & gói", "Mua gói"];
    if (activePath.startsWith("/owner/subscription")) return ["Hồ sơ & gói", "Thông tin gói"];
    if (activePath.startsWith("/owner/wallet")) return ["Hồ sơ & gói", "Ví"];
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
      queryClient.clear();
    } catch (e) {
      // ignore
    }
    navigate("/", { replace: true }); // Không truyền state để không tự động mở login popup
    setMenuOpen(false);
  };

  const getBreadcrumbIcon = (label) => {
    if (label === "Tổng quan") return <LayoutDashboard size={12} />;
    if (label === "Cơ sở") return <Building2 size={12} />;
    if (label === "Đặt sân offline") return <CalendarClock size={12} />;
    if (label === "Cơ sở của tôi" || label === "Tạo cơ sở") return <Building2 size={12} />;
    if (label === "Hồ sơ cá nhân") return <UserCircle size={12} />;
    if (label === "Hồ sơ & gói" || label === "Gói") return <UserCircle size={12} />;
    if (label === "Ví") return <Wallet size={12} />;
    if (label === "Payout") return <ReceiptText size={12} />;
    if (label === "Đơn đặt sân") return <ReceiptText size={12} />;
    if (label === "Nhân viên") return <UserCircle size={12} />;
    if (label === "Sự kiện" || label === "Danh sách sự kiện" || label === "Tạo sự kiện") return <CalendarDays size={12} />;
    return null;
  };

  const handleSidebarNavigate = () => {
    setMenuOpen(false);
  };

  const handleCreateVenueSidebar = (e) => {
    const hasBank = user?.hasBankAccount || user?.HasBankAccount;
    if (!hasBank) {
      e.preventDefault();
      setMenuOpen(false);
      import("sweetalert2").then((Swal) => {
        Swal.default.fire({
          icon: "warning",
          title: "Thiếu thông tin ngân hàng",
          text: "Bạn cần thêm tài khoản ngân hàng trong Hồ sơ trước khi tạo cơ sở để có thể nhận thanh toán.",
          showCancelButton: true,
          confirmButtonText: "Đến Hồ sơ",
          cancelButtonText: "Đóng",
          confirmButtonColor: "#045e36",
          cancelButtonColor: "#64748b",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/owner/profile");
          }
        });
      });
    } else {
      handleSidebarNavigate();
    }
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

  useEffect(() => {
    if (!isOwnerPlanInactive || isOnSubscriptionPlans || isOnSubscriptionOverview || isOnOwnerProfile || isOnOwnerWallet) return;

    navigate("/owner/subscription/plans", { replace: true });
    setMenuOpen(false);
  }, [
    isOnSubscriptionOverview,
    isOwnerPlanInactive,
    isOnSubscriptionPlans,
    isOnOwnerProfile,
    isOnOwnerWallet,
    navigate,
  ]);

  return (
    <div className={`owner-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {!shouldHideSidebar ? (
        <aside className={`owner-sidebar ${menuOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""} ${shouldLockSidebar ? "locked" : ""}`}>

        <div className="owner-sidebar-top">
          <div className="owner-sidebar-brand">
            <span className="owner-logo">{sidebarCollapsed ? "" : "Chủ sân"}</span>
            <button
              type="button"
              className="owner-sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          {shouldLockSidebar && !sidebarCollapsed ? (
            <div className="owner-sidebar-lock-note">
              <span>{ownerPlanState.reason}</span>
            </div>
          ) : null}
        </div>

        <nav className={`owner-sidebar-nav ${shouldLockSidebar ? "disabled" : ""}`} data-disabled={shouldLockSidebar}>
          <NavLink
            to="/owner"
            end
            onClick={handleSidebarNavigate}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <LayoutDashboard size={16} />
            <span className="owner-sidebar-text">Tổng quan</span>
          </NavLink>
          <div className={`owner-nav-group ${isAccountSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className="owner-nav-group-btn"
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
              title="Hồ sơ và gói"
              disabled={shouldLockSidebar}
            >
              <span className="owner-nav-group-label">
                <UserCircle size={16} />
                <span className="owner-sidebar-text">Hồ sơ & gói</span>
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
                <span className="owner-sidebar-text">Hồ sơ</span>
              </NavLink>
              <NavLink
                to="/owner/subscription/overview"
                onClick={handleSidebarNavigate}
                className={({ isActive }) => `owner-sidebar-sublink ${isActive ? "active" : ""}`}
              >
                <ListChecks size={15} />
                <span className="owner-sidebar-text">Thông tin gói</span>
              </NavLink>
              <NavLink
                to="/owner/subscription/plans"
                onClick={handleSidebarNavigate}
                className={({ isActive }) => `owner-sidebar-sublink ${isActive ? "active" : ""}`}
              >
                <ListChecks size={15} />
                <span className="owner-sidebar-text">Mua gói</span>
              </NavLink>
              <NavLink
                to="/owner/wallet"
                onClick={handleSidebarNavigate}
                className={({ isActive }) => `owner-sidebar-sublink ${isActive ? "active" : ""}`}
              >
                <Wallet size={15} />
                <span className="owner-sidebar-text">Ví</span>
              </NavLink>
            </div>
          </div>

          <div className={`owner-nav-group ${isVenuesSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className="owner-nav-group-btn"
              onClick={() => setVenuesOpen((v) => !v)}
              aria-expanded={venuesOpen}
              title="Cơ sở"
              disabled={shouldLockSidebar}
            >
              <span className="owner-nav-group-label">
                <Building2 size={16} />
                <span className="owner-sidebar-text">Cơ sở</span>
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
                <span className="owner-sidebar-text">Cơ sở của tôi</span>
              </NavLink>
              <NavLink
                to="/owner/offline-booking"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <CalendarClock size={15} />
                <span className="owner-sidebar-text">Đặt sân offline</span>
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
                onClick={(e) => {
                  if (shouldDisableCreateVenue) {
                    e.preventDefault();
                    return;
                  }
                  handleCreateVenueSidebar(e);
                }}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""} ${shouldDisableCreateVenue ? "is-disabled" : ""}`
                }
                aria-disabled={shouldDisableCreateVenue}
                tabIndex={shouldDisableCreateVenue ? -1 : undefined}
              >
                <PlusSquare size={15} />
                <span className="owner-sidebar-text">Tạo cơ sở</span>
              </NavLink>
               <NavLink
                to="/owner/staff"
                onClick={handleSidebarNavigate}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""}`
                }
              >
                <UsersRound size={15} />
                <span className="owner-sidebar-text">Nhân viên</span>
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
            <span className="owner-sidebar-text">Đơn đặt sân</span>
          </NavLink>

          <NavLink
            to="/owner/payout"
            onClick={handleSidebarNavigate}
            className={({ isActive }) =>
              `owner-sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <CircleDollarSign size={16} />
            <span className="owner-sidebar-text">Payout</span>
          </NavLink>

          <div className="owner-sidebar-divider" />

          <div className={`owner-nav-group ${isEventsSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className="owner-nav-group-btn"
              onClick={() => setEventsOpen((v) => !v)}
              aria-expanded={eventsOpen}
              title="Sự kiện"
              disabled={shouldLockSidebar}
            >
              <span className="owner-nav-group-label">
                <CalendarDays size={16} />
                <span className="owner-sidebar-text">Sự kiện</span>
              </span>
              <ChevronDown size={16} className={`owner-nav-caret ${eventsOpen ? "open" : ""}`} />
            </button>
            <div className={`owner-nav-sub ${eventsOpen ? "open" : "closed"}`}>
              <NavLink
                to="/owner/events/create"
                onClick={(e) => {
                  if (shouldDisableCreateEvent) {
                    e.preventDefault();
                    return;
                  }
                  handleSidebarNavigate();
                }}
                className={({ isActive }) =>
                  `owner-sidebar-sublink ${isActive ? "active" : ""} ${shouldDisableCreateEvent ? "is-disabled" : ""}`
                }
                aria-disabled={shouldDisableCreateEvent}
                tabIndex={shouldDisableCreateEvent ? -1 : undefined}
              >
                <PlusSquare size={15} />
                <span className="owner-sidebar-text">Tạo sự kiện</span>
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
                <span className="owner-sidebar-text">Danh sách sự kiện</span>
              </NavLink>
            </div>
          </div>
        </nav>

        <div className="owner-sidebar-footer">
          <button className="owner-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span className="owner-sidebar-text">Đăng xuất</span>
          </button>
        </div>
      </aside>
      ) : null}
      {menuOpen && !shouldHideSidebar ? (
        <button
          type="button"
          className="owner-sidebar-overlay"
          aria-label="Close owner menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <main className="owner-content">
        <div className="owner-topbar">
          {!shouldHideSidebar ? (
            <button
              type="button"
              className="owner-topbar-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          ) : null}
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
                    to="/owner/wallet"
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

