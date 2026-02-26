import React from 'react'
import { Link } from 'react-router-dom'
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
} from 'lucide-react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Cột 1 */}
        <div className="footer-column">
          <h2 className="footer-logo">Fiebo</h2>
          <p className="footer-text">
            The ultimate platform for booking fields and sports
          </p>
          <div className="footer-socials">
            <a href="#"><FacebookIcon size={20} /></a>
            <a href="#"><InstagramIcon size={20} /></a>
            <a href="#"><TwitterIcon size={20} /></a>
          </div>
        </div>

        {/* Cột 2 */}
        <div className="footer-column">
          <h3 className="footer-heading">Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
          </ul>
        </div>

        {/* Cột 3 */}
        <div className="footer-column">
          <h3 className="footer-heading">Categories</h3>
          <ul>
            <li><Link to="/category/academic">pickerball</Link></li>
            <li><Link to="/category/music">football</Link></li>
            <li><Link to="/category/workshop">tenis</Link></li>
            <li><Link to="/category/club">basketball</Link></li>
            <li><Link to="/category/sports">volleyball</Link></li>
            <li><Link to="/category/sports"></Link></li>
            <li><Link to="/category/sports"></Link></li>
          </ul>
        </div>

        {/* Cột 4 */}
        <div className="footer-column">
          <h3 className="footer-heading">Contact Us</h3>
          <ul className="footer-contact">
            <li><MapPinIcon size={16} /> <span>FPT University, Hoa Lac Hi-Tech Park, Hanoi</span></li>
            <li><PhoneIcon size={16} /> <span>+84 123 456 789</span></li>
            <li><MailIcon size={16} /> <span>supportfiebo@gmail.com</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Fiebo. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
