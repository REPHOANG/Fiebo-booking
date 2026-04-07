import React, { use } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "../landing/Header";
import BottomNav from "./BottomNav";
import Footer from "../landing/Footer";
import { useSelector } from "react-redux";

const Layout = () => {
  const location = useLocation();
  const isBookingPage = location.pathname.includes("/booking");
  const isVenuesPage = location.pathname === "/venues";
  const isVenueDetailPage = /^\/venue\/[0-9]+$/.test(location.pathname);
  const user = useSelector((state) => state.auth.user);
  const role = user?.role?.toLowerCase();
  if(role === "fieldowner"){
    return <Navigate to="/owner" replace />
  } else if(role === "admin"){
    return <Navigate to="/admin" replace />
  }
  return (
    <div className="layout">
      <Header />
      {/* draft banner removed */}
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
      {!isBookingPage && !isVenuesPage && !isVenueDetailPage && <Footer />}
    </div>
  );
};

export default Layout;
