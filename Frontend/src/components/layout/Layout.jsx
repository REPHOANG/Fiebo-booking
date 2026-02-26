import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../landing/Header";
import BottomNav from "./BottomNav";
import Footer from "../landing/Footer";

const Layout = () => {
  return (
    <div className="layout">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
      <Footer />
    </div>
  );
};

export default Layout;
