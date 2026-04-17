import React from 'react';
import './SearchBar.css';
import { Search, SlidersHorizontal, Map, CheckSquare, Heart, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, FormControl } from 'react-bootstrap';
import { useAuthModal } from '../../../context/AuthModalContext';
import VenuesMegaMenu from '../VenuesMegaMenu/VenuesMegaMenu';


const SearchBar = ({ searchQuery, setSearchQuery, onSearch, isAuthenticated, variant = 'icon' }) => {
  const navigate = useNavigate();
  const { openLogin } = useAuthModal();
  const [venuesMegaActive, setVenuesMegaActive] = React.useState(false);

  const renderSearchButton = () => {
    if (variant === 'none') return null;
    if (variant === 'text') {
      return (
        <Button variant="primary" onClick={onSearch} className="d-flex align-items-center">
          <Search size={16} className="me-1" />
          <span>Tìm kiếm</span>
        </Button>
      );
    }
    if (variant === 'outline') {
      return (
        <Button variant="outline-success" onClick={onSearch} className="p-2 ch-search-btn rounded-pill">
          <Search size={16} />
        </Button>
      );
    }
    // default: icon (light)
    return (
      <Button variant="outline-success" onClick={onSearch} className="p-2 ch-search-btn rounded-pill">
        <Search size={18} />
      </Button>
    );
  };

  return (
    <>
      <div className="ch-search-section">
        <div className="ch-search-inner">
          <div className="ch-search-bar d-flex align-items-center">
            <div className="me-2">{renderSearchButton()}</div>
            <FormControl
              type="text"
              className="ch-search-input"
              placeholder="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <div
              className="ch-mega-wrapper"
              onMouseEnter={() => setVenuesMegaActive(true)}
              onMouseLeave={() => setVenuesMegaActive(false)}
              onFocusCapture={() => setVenuesMegaActive(true)}
              onBlurCapture={(event) => {
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setVenuesMegaActive(false);
              }}
            >
              <button type="button" className="ch-mega-trigger" aria-haspopup="true" aria-expanded={venuesMegaActive}>
                Sân
                <ChevronDown size={16} className="ch-mega-chevron" aria-hidden />
              </button>
              <VenuesMegaMenu align="end" active={venuesMegaActive} />
            </div>
            <Button
              variant="light"
              className="ms-2 ch-filter-btn"
              type="button"
              aria-label="Mở trang tìm sân"
              onClick={() => navigate("/venues")}
            >
              <SlidersHorizontal size={18} />
            </Button>
          </div>

          <div className="ch-nav-tabs d-flex gap-2 mt-2">
            <Button variant="link" className="ch-nav-tab p-0" onClick={() => navigate('/map')}>
              <Map size={16} /> <span className="ms-1">Bản đồ</span>
            </Button>
            <Button
              variant="link"
              className="ch-nav-tab p-0"
              onClick={() => (isAuthenticated ? navigate('/bookings') : openLogin())}
            >
              <CheckSquare size={16} /> <span className="ms-1">Sân đã đặt</span>
            </Button>
            <Button variant="link" className="ch-nav-tab p-0" onClick={() => !isAuthenticated && openLogin()}>
              <Heart size={16} fill="#22c55e" /> <span className="ms-1">Yêu thích</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="ch-search-spacer" aria-hidden="true" />
    </>
  );
};

export default SearchBar;
