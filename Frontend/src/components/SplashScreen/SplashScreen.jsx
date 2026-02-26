import React from 'react';
import './SplashScreen.css';
import fieboLogo from '../../assets/images/Logo với chữ.png';

const SplashScreen = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img src={fieboLogo} alt="Fiebo Logo" className="splash-logo" />
        
        <p className="splash-subtitle">Đặt lịch sân thể thao mọi lúc mọi nơi</p>
        
        <div className="splash-loader">
          <div className="loader-line"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
