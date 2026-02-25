import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../HeroComponents/Header";
import BottomNav from "./BottomNav";

const Layout = () => {
  return (
    <div className="layout">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
