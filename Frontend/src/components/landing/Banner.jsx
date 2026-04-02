import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import "./Banner.css";
import { useNavigate } from "react-router-dom";

const Banner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length
    );
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <section className="banner">
      <div className="banner-container">
        <div className="banner-slider">
          {featuredEvents.map((event, index) => (
            <div
              key={event.id}
              className={`banner-slide ${
                index === currentSlide ? "active" : ""
              }`}
            >
              <div className="banner-image">
                <img src={event.image} alt={event.title} />
                <div className="banner-overlay"></div>
              </div>

              <div className="banner-content">
                <div className="container">
                  <div className="banner-text">
                    <span className="banner-category">{event.category}</span>
                    <h1 className="banner-title">{event.title}</h1>
                    <p className="banner-subtitle">{event.subtitle}</p>

                    <div className="banner-details">
                      <div className="banner-detail">
                        <Calendar size={18} />
                        <span>
                          {event.date} • {event.time}
                        </span>
                      </div>
                      <div className="banner-detail">
                        <MapPin size={18} />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    <div className="banner-actions">
                      {/* <button className="btn btn-primary" onClick={() => navigate(`/event/${event.id}`)}>Get Tickets</button> */}
                      <button className="btn btn-secondary" onClick={() => navigate(`/field/${field.id}`)}>View Field</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="banner-nav banner-nav-prev" onClick={prevSlide}>
          <ChevronLeft size={24} />
        </button>
        <button className="banner-nav banner-nav-next" onClick={nextSlide}>
          <ChevronRight size={24} />
        </button>

        <div className="banner-dots">
          {featuredEvents.map((_, index) => (
            <button
              key={index}
              className={`banner-dot ${index === currentSlide ? "active" : ""}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Banner;
