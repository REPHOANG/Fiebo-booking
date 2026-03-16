import React from 'react'
import { Link } from 'react-router-dom'
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Heart,
  Send,
} from 'lucide-react'
import './Footer.css'
import FieboLogo from '../../assets/images/Logo Fiebo.png'

const Footer = () => {
  return (
    <footer className="ft">
      {/* Gradient top border */}
      <div className="ft-top-line" />

      <div className="ft-main">
        {/* ── Brand ── */}
        <div className="ft-col ft-brand">
          <div className="ft-logo-row">
            <img src={FieboLogo} alt="Fiebo" className="ft-logo-img" />
            <h2 className="ft-logo">Fiebo</h2>
          </div>
          <p className="ft-desc">
            Nền tảng đặt sân thể thao trực tuyến hàng đầu Việt Nam. Tìm sân, đặt lịch và chơi ngay chỉ với vài thao tác.
          </p>
          <div className="ft-socials">
            <a href="#" aria-label="Facebook" className="ft-social fb"><Facebook size={16} /></a>
            <a href="#" aria-label="Instagram" className="ft-social ig"><Instagram size={16} /></a>
            <a href="#" aria-label="Twitter" className="ft-social tw"><Twitter size={16} /></a>
            <a href="#" aria-label="Youtube" className="ft-social yt"><Youtube size={16} /></a>
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div className="ft-col">
          <h3 className="ft-heading">Khám phá</h3>
          <ul className="ft-links">
            <li><Link to="/"><ChevronRight size={14} /> Trang chủ</Link></li>
            <li><Link to="/venues"><ChevronRight size={14} /> Danh sách sân</Link></li>
            <li><Link to="/about"><ChevronRight size={14} /> Về chúng tôi</Link></li>
            <li><Link to="/faq"><ChevronRight size={14} /> Câu hỏi thường gặp</Link></li>
          </ul>
        </div>

        {/* ── Sports ── */}
        <div className="ft-col">
          <h3 className="ft-heading">Môn thể thao</h3>
          <ul className="ft-links ft-sports">
            <li><span className="ft-sport-dot" style={{background:'#22c55e'}} /> Bóng đá</li>
            <li><span className="ft-sport-dot" style={{background:'#ef4444'}} /> Bóng rổ</li>
            <li><span className="ft-sport-dot" style={{background:'#a855f7'}} /> Tennis</li>
            <li><span className="ft-sport-dot" style={{background:'#3b82f6'}} /> Pickleball</li>
          </ul>
        </div>

        {/* ── Contact ── */}
        <div className="ft-col">
          <h3 className="ft-heading">Liên hệ</h3>
          <ul className="ft-contact">
            <li>
              <div className="ft-icon-circle"><MapPin size={14} /></div>
              <span>Đại học FPT, Khu CNC Hòa Lạc, Hà Nội</span>
            </li>
            <li>
              <div className="ft-icon-circle"><Phone size={14} /></div>
              <span>+84 123 456 789</span>
            </li>
            <li>
              <div className="ft-icon-circle"><Mail size={14} /></div>
              <span>supportfiebo@gmail.com</span>
            </li>
          </ul>

          {/* Mini newsletter */}
          <div className="ft-newsletter">
            <p className="ft-nl-label">Nhận tin mới nhất</p>
            <div className="ft-nl-input">
              <input type="email" placeholder="Email của bạn" />
              <button aria-label="Subscribe"><Send size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="ft-bottom">
        <p>
          © {new Date().getFullYear()} Fiebo. Tất cả quyền được bảo lưu. Made with{' '}
          <Heart size={12} className="ft-heart" />{' '} in Vietnam.
        </p>
      </div>
    </footer>
  )
}

export default Footer
