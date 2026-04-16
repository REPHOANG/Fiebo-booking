import React from "react";
import { createPortal } from "react-dom";
import ForgotPassword from "../../../pages/auth/ForgotPassword";
import "../LoginPopup/LoginPopup.css";
import "./ForgotPasswordPopup.css";

const ForgotPasswordPopup = ({ open, onClose, onOpenLogin }) => {
  if (!open) return null;

  const modal = (
    <div
      className="login-popup-overlay forgot-password-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Quên mật khẩu"
    >
      <div className="login-popup-modal forgot-password-popup-modal">
        <button
          type="button"
          className="login-popup-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="login-popup-content forgot-password-popup-content">
          <ForgotPassword onClose={onClose} onOpenLogin={onOpenLogin} isPopup />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ForgotPasswordPopup;