import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { clearRegistrationPending } from "../../store/authSlice";
import { verifyOTP } from "../../services/authService";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./VerifyOTP.css";
import { OPEN_AUTH_STATE_KEY } from "../../context/AuthModalContext";

const otpSchema = yup.object({
  otpCode: yup
    .string()
    .required("Nhập mã xác minh")
    .matches(/^\d{6}$/, "Nhập đủ 6 chữ số"),
});

const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const VerifyOTP = ({ isPopup = false, onClose, onOpenLogin, onOpenRegister }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { registrationEmail, registrationPending } = useSelector(
    (state) => state.auth,
  );

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [expiryTimeLeft, setExpiryTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendTimeLeft, setResendTimeLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);

  const {
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(otpSchema),
    mode: "onSubmit",
    defaultValues: { otpCode: "" },
  });

  useEffect(() => {
    setValue("otpCode", otp.join(""), { shouldValidate: false });
  }, [otp, setValue]);

  useEffect(() => {
    if (!registrationPending || !registrationEmail) {
      if (isPopup) {
        if (typeof onOpenRegister === "function") onOpenRegister();
        else if (typeof onClose === "function") onClose();
      } else {
        navigate("/", { replace: true, state: { [OPEN_AUTH_STATE_KEY]: "register" } });
      }
    }
  }, [registrationPending, registrationEmail, navigate, isPopup, onClose, onOpenRegister]);

  useEffect(() => {
    const expiryTimer = setInterval(() => {
      setExpiryTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(expiryTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resendTimer = setInterval(() => {
      setResendTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(resendTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(expiryTimer);
      clearInterval(resendTimer);
    };
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i += 1) {
        newOtp[i] = pasted[i] || "";
      }
      setOtp(newOtp);
      const focusIdx = Math.min(pasted.length, 5);
      otpRefs.current[focusIdx]?.focus();
    }
  };

  const onVerify = async ({ otpCode }) => {
    setIsLoading(true);

    try {
      await verifyOTP(registrationEmail, otpCode);

      toast.success("Xác minh tài khoản thành công");

      dispatch(clearRegistrationPending());

      setTimeout(() => {
        try {
          sessionStorage.setItem("postVerifyLoginEmail", registrationEmail);
        } catch (_) {}
        if (isPopup) {
          if (typeof onOpenLogin === "function") onOpenLogin();
          else if (typeof onClose === "function") onClose();
        } else {
          navigate("/", {
            replace: true,
            state: { [OPEN_AUTH_STATE_KEY]: "login" },
          });
        }
      }, 1500);
    } catch (error) {
      toast.error(error.message || "Mã OTP không hợp lệ. Vui lòng thử lại.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      toast.info("Đã gửi lại mã OTP tới email của bạn");
      setExpiryTimeLeft(OTP_EXPIRY_SECONDS);
      setResendTimeLeft(RESEND_COOLDOWN_SECONDS);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (error) {
      toast.error("Không thể gửi lại OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`verify-otp-card${isPopup ? " verify-otp-card--popup" : ""}`}
    >
        <div className="verify-otp-header">
          <h2 className="verify-otp-title">Xác minh email</h2>
          <p className="verify-otp-subtitle">
            Nhập mã gồm 6 chữ số đã được gửi tới
          </p>
          <p className="verify-otp-email">{registrationEmail}</p>
        </div>

        <form className="verify-otp-form" onSubmit={handleSubmit(onVerify)} noValidate>
          <div className="verify-otp-panel">
            <div className="verify-otp-panel-head">
              <span className="verify-otp-panel-label">Mã OTP</span>
            </div>
          <div className="otp-input-group" onPaste={handleOtpPaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                disabled={isLoading}
                placeholder=""
                aria-label={`Chữ số ${index + 1}`}
              />
            ))}
          </div>
          <p className="verify-otp-helper">Bạn có thể dán toàn bộ 6 chữ số vào bất kỳ ô nào.</p>
          {errors.otpCode && (
            <p className="verify-otp-field-error" role="alert">
              {errors.otpCode.message}
            </p>
          )}
          </div>

          <div className="otp-footer">
            <p className="otp-timer" style={{
              marginTop: "15px"
            }}>
              {timeLeft > 0 ? (
                <>
                  Mã có hiệu lực trong <span className="timer">{formatTime(expiryTimeLeft)}</span>
                </>
              ) : (
                <>
                  Mã đã hết hạn.{" "}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="resend-link"
                  >
                    Gửi lại
                  </button>
                </>
              )}
            </p>
          </div>

          <button
            type="submit"
            className="verify-button"
            disabled={isLoading || otp.some((digit) => !digit)}
          >
            {isLoading ? "Đang xác minh..." : "Xác minh tài khoản"}
          </button>
        </form>

        <div className="verify-otp-help">
          <p>Không nhận được mã hoặc mã đã hết hạn?</p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={resendTimeLeft > 0 || isLoading}
            className="resend-pill"
          >
            {resendTimeLeft > 0 ? `Gửi lại sau ${resendTimeLeft}s` : "Gửi lại"}
          </button>
        </div>
      </motion.div>
  );

  if (isPopup) return card;

  return <div className="verify-otp-page">{card}</div>;
};

export default VerifyOTP;
