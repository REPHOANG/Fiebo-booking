import React from 'react';
import { createPortal } from 'react-dom';
import Login from '../../../pages/auth/Login';
import './LoginPopup.css';

/**
 * Popup đăng nhập riêng — overlay + modal, bên trong dùng trang Login.
 * Khi đăng nhập thành công gọi onClose. Chủ sân (Field Owner) được chuyển sang /owner.
 */
const LoginPopup = ({ open, onClose, onOpenRegister, redirectAfterLogin }) => {
  if (!open) return null;

  const modal = (
    <div
      className="login-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập"
    >
      <div className="login-popup-modal">
        <button
          type="button"
          className="login-popup-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="login-popup-content">
          <Login
            onLoginSuccess={onClose}
            onOpenRegister={onOpenRegister}
            redirectAfterLogin={redirectAfterLogin}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LoginPopup;
