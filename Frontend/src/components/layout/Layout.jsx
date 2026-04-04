import React, { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../landing/Header";
import BottomNav from "./BottomNav";
import Footer from "../landing/Footer";
import { FIEBO_LAST_APP_PATH_KEY } from "../../constants/fieboSession";

const Layout = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    try {
      sessionStorage.setItem(
        FIEBO_LAST_APP_PATH_KEY,
        `${location.pathname}${location.search}`,
      );
    } catch (_) {}
  }, [location.pathname, location.search]);

  const isBookingPage = location.pathname.includes("/booking");
  const isVenuesPage = location.pathname === "/venues";
  const isVenueDetailPage = /^\/venue\/[0-9]+$/.test(location.pathname);
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
