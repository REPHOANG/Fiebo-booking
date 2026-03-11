import React from 'react';
import Login from '../../../pages/auth/Login';
import './LoginPopup.css';

const LoginPopup = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="login-popup-overlay">
      <div className="login-popup-modal">
        <button className="login-popup-close" onClick={onClose}>×</button>
        <Login />
      </div>
    </div>
  );
};

export default LoginPopup;
