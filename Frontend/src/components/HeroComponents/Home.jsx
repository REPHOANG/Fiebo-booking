import React, { useState } from "react";
import { MapPin, Calendar, Users, Star, ArrowRight } from "lucide-react";
import "./Home.css";

const Home = () => {
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
    { id: 6, name: "Sqash", icon: "🎯" },
  ];

  const featuredVenues = [
    {
      id: 1,
      name: "Sân Bóng Đá Milan",
      location: "Quận 1, TP.HCM",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop",
      rating: 4.8,
      reviews: 245,
      price: "500.000đ/giờ",
      sport: "Bóng Đá",
    },
    {
      id: 2,
      name: "Sân Bóng Rổ Sports Center",
      location: "Quận 7, TP.HCM",
      image: "https://images.unsplash.com/photo-1546519638-68711109d298?w=400&h=300&fit=crop",
      rating: 4.7,
      reviews: 182,
      price: "400.000đ/giờ",
      sport: "Bóng Rổ",
    },
    {
      id: 3,
      name: "Sân Tennis Premier Club",
      location: "Quận 2, TP.HCM",
      image: "https://images.unsplash.com/photo-1554284154-83cb3142d9c1?w=400&h=300&fit=crop",
      rating: 4.9,
      reviews: 308,
      price: "350.000đ/giờ",
      sport: "Tennis",
    },
    {
      id: 4,
      name: "Sân Cầu Lông Pro",
      location: "Quận 3, TP.HCM",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop",
      rating: 4.6,
      reviews: 156,
      price: "300.000đ/giờ",
      sport: "Cầu Lông",
    },
    {
      id: 5,
      name: "Sân Bóng Chuyền Elite",
      location: "Quận 5, TP.HCM",
      image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=300&fit=crop",
      rating: 4.7,
      reviews: 201,
      price: "250.000đ/giờ",
      sport: "Bóng Chuyền",
    },
    {
      id: 6,
      name: "Sân Squash International",
      location: "Quận 10, TP.HCM",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop",
      rating: 4.5,
      reviews: 127,
      price: "280.000đ/giờ",
      sport: "Squash",
    },
  ];

  const testimonials = [
    {
      id: 1,
      name: "Nguyễn Văn A",
      avatar: "👨‍💼",
      text: "Dịch vụ rất tuyệt vời! Sân sạch sẽ, đội ngũ chuyên nghiệp. Tôi sẽ đặt lại!",
      rating: 5,
    },
    {
      id: 2,
      name: "Trần Thị B",
      avatar: "👩‍💼",
      text: "Bảng giá rõ ràng, không có chi phí ẩn. Rất hài lòng với trải nghiệm này.",
      rating: 5,
    },
    {
      id: 3,
      name: "Lê Hoàng C",
      avatar: "👨‍🏫",
      text: "Ứng dụng dễ sử dụng, đặt sân nhanh chóng. Recommend cho bạn bè!",
      rating: 4,
    },
  ];

  const handleSearch = () => {
    console.log("Search:", searchData);
    // Navigate to search results
  };

  return (
    <div>
      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>Đặt Sân Thể Thao Yêu Thích</h1>
            <p>Tìm và đặt sân bóng, cầu lông, tennis... với giá tốt nhất</p>

            {/* Search Box */}
            <div className="search-box-wrapper">
              <div className="search-box">
                <div className="search-input-group">
                  <div className="input-field">
                    <MapPin size={20} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Nhập địa điểm"
                      value={searchData.location}
                      onChange={(e) =>
                        setSearchData({ ...searchData, location: e.target.value })
                      }
                    />
                  </div>

                  <div className="input-field">
                    <Calendar size={20} className="input-icon" />
                    <input
                      type="date"
                      value={searchData.date}
                      onChange={(e) =>
                        setSearchData({ ...searchData, date: e.target.value })
                      }
                    />
                  </div>

                  <div className="input-field">
                    <select
                      value={searchData.sportType}
                      onChange={(e) =>
                        setSearchData({ ...searchData, sportType: e.target.value })
                      }
                    >
                      <option value="All">Tất cả loại sân</option>
                      {sportsCategories.map((sport) => (
                        <option key={sport.id} value={sport.name}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button className="search-btn" onClick={handleSearch}>
                    Tìm Sân
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <h3>500+</h3>
              <p>Sân thể thao</p>
            </div>
            <div className="stat">
              <h3>10K+</h3>
              <p>Khách hài lòng</p>
            </div>
            <div className="stat">
              <h3>24/7</h3>
              <p>Hỗ trợ khách hàng</p>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="categories-section">
          <div className="container">
            <h2>Chọn Loại Sân Thể Thao</h2>
            <div className="categories-grid">
              {sportsCategories.map((sport) => (
                <div key={sport.id} className="category-card">
                  <div className="category-icon">{sport.icon}</div>
                  <p>{sport.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Venues Section */}
        <section className="featured-section">
          <div className="container">
            <div className="section-header">
              <h2>Sân Nổi Bật Hôm Nay</h2>
              <a href="/venues" className="view-all">
                Xem tất cả <ArrowRight size={18} />
              </a>
            </div>
            <div className="venues-grid">
              {featuredVenues.map((venue) => (
                <div key={venue.id} className="venue-card">
                  <div className="venue-image">
                    <img src={venue.image} alt={venue.name} />
                    <span className="sport-badge">{venue.sport}</span>
                  </div>
                  <div className="venue-info">
                    <h3>{venue.name}</h3>
                    <p className="location">
                      <MapPin size={16} /> {venue.location}
                    </p>
                    <div className="rating-row">
                      <div className="rating">
                        <Star size={16} className="star" />
                        <span>{venue.rating}</span>
                        <span className="reviews">({venue.reviews} đánh giá)</span>
                      </div>
                      <span className="price">{venue.price}</span>
                    </div>
                    <button className="book-btn">Đặt Ngay</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works">
          <div className="container">
            <h2>Cách Hoạt Động</h2>
            <div className="steps-grid">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Tìm Sân</h3>
                <p>Chọn địa điểm và loại sân thể thao bạn muốn</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h3>Chọn Thời Gian</h3>
                <p>Xem lịch trống và chọn thời gian phù hợp</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h3>Thanh Toán</h3>
                <p>Thanh toán an toàn qua nhiều phương thức</p>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <h3>Thử Thách</h3>
                <p>Tới sân và tận hưởng trò chơi yêu thích</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="testimonials-section">
          <div className="container">
            <h2>Khách Hàng Nói Gì Về Chúng Tôi</h2>
            <div className="testimonials-grid">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="testimonial-card">
                  <div className="testimonial-header">
                    <span className="avatar">{testimonial.avatar}</span>
                    <div>
                      <p className="name">{testimonial.name}</p>
                      <div className="stars">
                        {"⭐".repeat(testimonial.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="testimonial-text">"{testimonial.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="container cta-content">
            <h2>Sẵn Sàng Đặt Sân?</h2>
            <p>Hơn 10,000 khách hàng đã tin tưởng Fiebo</p>
            <button className="cta-btn">Bắt Đầu Ngay</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;

