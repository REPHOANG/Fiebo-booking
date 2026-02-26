import React, { useState, useEffect } from "react";
import {
  MapPin,
  Calendar,
  Star,
  ArrowRight,
  Search,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/authSlice";
import "./CustomerHome.css";
import FadeInSection from "../../components/ui/FadeInSection";
import Header from "../../components/landing/Header";
import Footer from "../../components/landing/Footer";

const CustomerHome = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [displayName, setDisplayName] = useState('Người dùng');

  const [searchData, setSearchData] = useState({
    location: "",
    date: "",
    sportType: "All",
  });

  const sportsCategories = [
    { id: 1, name: "Bóng Đá", icon: "⚽" },
    { id: 2, name: "Bóng Rổ", icon: "🏀" },
    { id: 3, name: "Tennis", icon: "🎾" },
    { id: 4, name: "Cầu Lông", icon: "🏸" },
    { id: 5, name: "Bóng Chuyền", icon: "🏐" },
    { id: 6, name: "Squash", icon: "🎯" },
  ];

  const featuredVenues = [
    {
      id: 1,
      name: "Sân Bóng Đá Milan",
      location: "Quận 1, TP.HCM",
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
      rating: 4.8,
      reviews: 245,
      price: "500.000đ/giờ",
      sport: "Bóng Đá",
    },
    {
      id: 2,
      name: "Sân Tennis Premier Club",
      location: "Quận 2, TP.HCM",
      image:
        "https://images.unsplash.com/photo-1554284154-83cb3142d9c1?w=800",
      rating: 4.9,
      reviews: 308,
      price: "350.000đ/giờ",
      sport: "Tennis",
    },
    {
      id: 3,
      name: "Sân Cầu Lông Pro",
      location: "Quận 3, TP.HCM",
      image:
        "https://images.unsplash.com/photo-1546519638-68711109d298?w=800",
      rating: 4.7,
      reviews: 182,
      price: "300.000đ/giờ",
      sport: "Cầu Lông",
    },
  ];

  const handleSearch = () => {
    console.log(searchData);
    // TODO: Implement search functionality
  };

  // Update display name when user data changes
  React.useEffect(() => {
    if (user) {
      const name = user?.name || user?.email || 'Người dùng';
      setDisplayName(name);
      console.log('✅ User updated:', name);
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
    // Clear any stored tokens or user data
    localStorage.removeItem('token');
    localStorage.removeItem('authState');
    sessionStorage.removeItem('token');
    navigate("/login");
  };

  return (
    <div className="customer-home">
      {/* Header Component */}
      <Header />

      <div className="customer-container">
        {/* HERO */}
        <FadeInSection>
          <section className="hero">
            <div className="hero-overlay" />

            <div className="hero-content">
              <h1>
                Đặt Sân Thể Thao <span>Chỉ Trong Vài Giây</span>
              </h1>
              <p>
                Tìm kiếm – So sánh – Đặt sân nhanh chóng với trải nghiệm cao cấp.
              </p>

              <div className="search-bar">
                <div className="search-field">
                  <MapPin size={18} />
                  <input
                    type="text"
                    placeholder="Nhập địa điểm"
                    value={searchData.location}
                    onChange={(e) =>
                      setSearchData({ ...searchData, location: e.target.value })
                    }
                  />
                </div>

                <div className="divider" />

                <div className="search-field">
                  <Calendar size={18} />
                  <input
                    type="date"
                    value={searchData.date}
                    onChange={(e) =>
                      setSearchData({ ...searchData, date: e.target.value })
                    }
                  />
                </div>

                <div className="divider" />

                <select
                  className="sport-select"
                  value={searchData.sportType}
                  onChange={(e) =>
                    setSearchData({ ...searchData, sportType: e.target.value })
                  }
                >
                  <option value="All">Tất cả</option>
                  {sportsCategories.map((sport) => (
                    <option key={sport.id} value={sport.name}>
                      {sport.name}
                    </option>
                  ))}
                </select>

                <button className="search-btn" onClick={handleSearch}>
                  <Search size={18} />
                </button>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* CATEGORIES */}
        <FadeInSection>
          <section className="categories">
            <h2>Khám Phá Theo Môn Thể Thao</h2>

            <div className="categories-grid">
              {sportsCategories.map((sport) => (
                <div key={sport.id} className="category-card">
                  <div className="icon">{sport.icon}</div>
                  <p>{sport.name}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>

        {/* FEATURED */}
        <FadeInSection>
          <section className="featured">
            <div className="section-header">
              <h2>Sân Nổi Bật</h2>
              <a href="/venues">
                Xem tất cả <ArrowRight size={16} />
              </a>
            </div>

            <div className="venue-grid">
              {featuredVenues.map((venue) => (
                <div key={venue.id} className="venue-card">
                  <div className="image-wrapper">
                    <img src={venue.image} alt={venue.name} />
                    <span className="badge">{venue.sport}</span>
                  </div>

                  <div className="venue-content">
                    <h3>{venue.name}</h3>

                    <div className="location">
                      <MapPin size={14} /> {venue.location}
                    </div>

                    <div className="bottom-row">
                      <div className="rating">
                        <Star size={14} />
                        <span>{venue.rating}</span>
                        <small>({venue.reviews})</small>
                      </div>

                      <div className="price">{venue.price}</div>
                    </div>

                    <button className="book-btn">Đặt ngay</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>

        {/* CTA */}
        <section className="cta">
          <h2>Sẵn Sàng Bắt Đầu?</h2>
          <p>Hơn 10.000 người dùng đã tin tưởng Fiebo</p>
          <button className="cta-btn" onClick={handleSearch}>Đặt Sân Ngay</button>
        </section>
      </div>
      <Footer />
    </div>
        
  );
 

};
 
export default CustomerHome;
