import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "../landing/Header";
import BottomNav from "./BottomNav";
import Footer from "../landing/Footer";
import { useSelector } from "react-redux";
import { hasRole } from "../../utils/roleUtils";

const Layout = () => {
  const location = useLocation();
  const isBookingPage = location.pathname.includes("/booking");
  const isVenuesPage = location.pathname === "/venues";
  const isVenueDetailPage = /^\/venue\/[0-9]+$/.test(location.pathname);
  const isMapPage = location.pathname.startsWith("/map");
  const user = useSelector((state) => state.auth.user);
  if (hasRole(user, "fieldowner")) {
    return <Navigate to="/owner" replace />
  } else if (hasRole(user, "admin")) {
    return <Navigate to="/admin" replace />
  } else if (hasRole(user, "staff")) {
    return <Navigate to="/staff" replace />
  } else if (hasRole(user, "financeadmin")) {
    return <Navigate to="/finance" replace />
  }
  return (
    <div className="layout">
      <Header />
      {/* draft banner removed */}
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
      {!isBookingPage && !isVenuesPage && !isVenueDetailPage && !isMapPage && <Footer />}
    </div>
  );
};

export default Layout;
