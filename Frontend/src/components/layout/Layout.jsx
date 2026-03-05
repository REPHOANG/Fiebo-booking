import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../landing/Header";
import BottomNav from "./BottomNav";
import Footer from "../landing/Footer";

const Layout = () => {
  const location = useLocation();
  const isBookingPage = location.pathname.includes("/booking");

  return (
    <div className="layout">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
      {!isBookingPage && <Footer />}
    </div>
  );
};

export default Layout;
