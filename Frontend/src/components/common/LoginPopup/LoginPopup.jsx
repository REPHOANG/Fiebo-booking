import React from 'react';
import { createPortal } from 'react-dom';
import Login from '../../../pages/auth/Login';
import './LoginPopup.css';

/**
 * Popup đăng nhập riêng — overlay + modal, bên trong dùng trang Login.
 * Khi đăng nhập thành công gọi onClose (giữ nguyên trang hiện tại).
 */
const LoginPopup = ({ open, onClose }) => {
  if (!open) return null;

  const modal = (
    <div
      className="login-popup-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
          <Login onLoginSuccess={onClose} />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LoginPopup;
