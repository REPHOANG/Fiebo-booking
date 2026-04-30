import React from "react";
import { createPortal } from "react-dom";
import Register from "../../../pages/auth/Register";
import "./RegisterPopup.css";

const RegisterPopup = ({
  open,
  onClose,
  onOpenLogin,
  onOpenVerifyOTP,
  accountRole = "Customer",
  onOpenOwnerRegister,
  onOpenCustomerRegister,
}) => {
  if (!open) return null;

  const modal = (
    <div
      className="login-popup-overlay register-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng ký"
    >
      <div className="login-popup-modal register-popup-modal">
        <button
          type="button"
          className="login-popup-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="login-popup-content register-popup-content">
          <Register
            onSwitchToLogin={onOpenLogin}
            onClose={onClose}
            onOpenVerifyOTP={onOpenVerifyOTP}
            accountRole={accountRole}
            variant={accountRole === "FieldOwner" ? "owner" : "default"}
            onSwitchToOwnerRegister={onOpenOwnerRegister}
            onSwitchToCustomerRegister={onOpenCustomerRegister}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default RegisterPopup;
