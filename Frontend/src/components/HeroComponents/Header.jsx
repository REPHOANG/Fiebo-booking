import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  SearchIcon,
  UserIcon,
  ShoppingCartIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import "./Header.css";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo + menu desktop */}
        <div className="header-left">
          <Link to="/" className="logo">
            Fiebo
          </Link>
          <nav className="menu-desktop">
            <Link to="/">Home</Link>
            <Link to="/events">Field</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>

        {/* Actions desktop */}
        <div className="header-actions">
          <button className="icon-btn">
            <SearchIcon size={20} />
          </button>
          <Link to="/cart" className="icon-btn">
            <ShoppingCartIcon size={20} />
          </Link>
          <Link to="/login" className="login-btn">
            <UserIcon size={18} className="icon" /> Login
          </Link>
        </div>

        {/* Toggle button mobile */}
        <div className="menu-toggle">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <nav className="menu-mobile">
          <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
          <Link to="/events" onClick={() => setIsMenuOpen(false)}>Events</Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>

          <div className="menu-mobile-bottom">
            <Link to="/cart" className="icon-btn">
              <ShoppingCartIcon size={20} />
            </Link>
            <Link to="/login" className="login-btn">
              <UserIcon size={18} className="icon" /> Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
