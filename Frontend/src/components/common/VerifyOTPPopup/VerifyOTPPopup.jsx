import React from "react";
import { createPortal } from "react-dom";
import VerifyOTP from "../../../pages/auth/VerifyOTP";
import "../../common/LoginPopup/LoginPopup.css";

const VerifyOTPPopup = ({ open, onClose, onOpenLogin, onOpenRegister }) => {
  if (!open) return null;

  return createPortal(
    <div
      className="login-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Xác minh OTP"
    >
      <div className="login-popup-modal register-popup-modal verify-otp-popup-modal">
        <button
          type="button"
          className="login-popup-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="login-popup-content register-popup-content verify-otp-popup-content">
          <VerifyOTP
            isPopup
            onClose={onClose}
            onOpenLogin={onOpenLogin}
            onOpenRegister={onOpenRegister}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default VerifyOTPPopup;