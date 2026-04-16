// src/pages/Register.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setRegistrationPending } from "../../store/authSlice";
import { register } from "../../services/authService";
import { motion } from "framer-motion";
import fieboLogo from "../../assets/images/Logo với chữ.png";
import { OPEN_AUTH_STATE_KEY } from "../../context/AuthModalContext";
import "./Register.css";

// ── Yup schema ──────────────────────────────────────────────────────────────
const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);

const schema = yup.object({
  fullName: yup
    .string()
    .trim()
    .min(4, "Họ và tên phải có ít nhất 4 ký tự")
    .required("Vui lòng nhập họ và tên"),

  email: yup
    .string()
    .email("Địa chỉ email không hợp lệ")
    .required("Vui lòng nhập email"),

  phone: yup
    .string()
    .optional()
    .test("phone", "Số điện thoại không hợp lệ (9–11 chữ số)", (val) => {
      if (!val || val.trim() === "") return true;
      return /^[0-9]{9,11}$/.test(val.replace(/\D/g, ""));
    }),

  dateOfBirth: yup
    .string()
    .required("Vui lòng nhập ngày sinh")
    .test(
      "not-future",
      "Ngày sinh không được là hôm nay hoặc trong tương lai",
      (val) => {
        if (!val) return false;
        return new Date(val) < todayDate;
      },
    )
    .test("min-age", "Bạn phải ít nhất 13 tuổi để đăng ký", (val) => {
      if (!val) return false;
      const dob = new Date(val);
      let age = todayDate.getFullYear() - dob.getFullYear();
      const m = todayDate.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && todayDate.getDate() < dob.getDate())) age--;
      return age >= 13;
    }),

  password: yup
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .required("Vui lòng nhập mật khẩu"),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Mật khẩu xác nhận không khớp")
    .required("Vui lòng xác nhận mật khẩu"),
  agreeTerms: yup
    .boolean()
    .oneOf(
      [true],
      "Bạn phải đồng ý với Điều khoản dịch vụ và Chính sách bảo mật",
    ),
});

// ── Component ────────────────────────────────────────────────────────────────
const Register = ({
  onSwitchToLogin,
  onClose,
  accountRole = "Customer",
  variant = "default",
  onSwitchToOwnerRegister,
  onSwitchToCustomerRegister,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const isOwnerFlow = accountRole === "FieldOwner";
  const loginPath = "/login";
  const loginText = isOwnerFlow ? "Đăng nhập" : "Đăng nhập tại đây";
  const submitLabel = isOwnerFlow ? "Tạo tài khoản Owner" : "Tạo tài khoản";

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors, isSubmitted, submitCount },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onTouched",
  });

  const agreeChecked = watch("agreeTerms", false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError("");
    try {
      await register({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phone || "",
        password: data.password,
        confirmPassword: data.confirmPassword,
        dateOfBirth: data.dateOfBirth,
        role: accountRole,
      });

      dispatch(
        setRegistrationPending({ email: data.email, phone: data.phone || "" }),
      );
      onClose?.();
      navigate("/verify-otp");
    } catch (error) {
      const errorMsg = error.message || error.details || "Đăng ký thất bại";
      if (errorMsg.toLowerCase().includes("already exist")) {
        setServerError("Email hoặc số điện thoại đã được đăng ký");
      } else {
        setServerError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`register-page ${variant === "owner" ? "register-page-owner" : ""}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`register-card ${variant === "owner" ? "register-card-owner" : ""}`}
      >
        <div className="register-header">
          <img src={fieboLogo} alt="Fiebo Logo" className="register-logo" />
          {isOwnerFlow && (
            <p className="register-account-chip">Khu vực dành cho chủ sân</p>
          )}
        </div>

        <form
          className="register-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="form-group">
            {/* Full Name */}
            <div className="input-group">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                className={`input-field${errors.fullName ? " input-error" : ""}`}
                placeholder="Nhập họ và tên của bạn"
                disabled={isLoading}
                {...field("fullName")}
              />
              {errors.fullName && (
                <p className="field-error">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input-field${errors.email ? " input-error" : ""}`}
                placeholder="Nhập email của bạn"
                disabled={isLoading}
                {...field("email")}
              />
              {errors.email && (
                <p className="field-error">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div className="input-group">
              <label htmlFor="phone">
                Số điện thoại <span className="optional-label"></span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className={`input-field${errors.phone ? " input-error" : ""}`}
                placeholder="Nhập số điện thoại của bạn"
                disabled={isLoading}
                {...field("phone")}
              />
              {errors.phone && (
                <p className="field-error">{errors.phone.message}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="input-group">
              <label htmlFor="dateOfBirth">Ngày sinh</label>
              <input
                id="dateOfBirth"
                type="date"
                className={`input-field${errors.dateOfBirth ? " input-error" : ""}`}
                disabled={isLoading}
                max={
                  new Date(Date.now() - 86400000).toISOString().split("T")[0]
                }
                {...field("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="field-error">{errors.dateOfBirth.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="input-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`input-field${errors.password ? " input-error" : ""}`}
                  placeholder="Nhập mật khẩu của bạn"
                  disabled={isLoading}
                  {...field("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="toggle-password"
                  aria-label="Hiện/ẩn mật khẩu"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {errors.password && (
                <p className="field-error">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="input-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`input-field${errors.confirmPassword ? " input-error" : ""}`}
                  placeholder="Xác nhận mật khẩu của bạn"
                  disabled={isLoading}
                  {...field("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="toggle-password"
                  aria-label="Hiện/ẩn mật khẩu xác nhận"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon
                    icon={showConfirmPassword ? faEyeSlash : faEye}
                  />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="field-error">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="terms-agreement">
            <input
              type="checkbox"
              id="terms"
              disabled={isLoading}
              {...field("agreeTerms")}
            />
            <label htmlFor="terms">
              Tôi đồng ý với{" "}
              <Link to="/terms" className="terms-link">
                Điều khoản dịch vụ
              </Link>{" "}
              và{" "}
              <Link to="/privacy" className="terms-link">
                Chính sách bảo mật
              </Link>
            </label>
          </div>
          {errors.agreeTerms && (isSubmitted || submitCount > 0) && (
            <p className="field-error">{errors.agreeTerms.message}</p>
          )}

          {serverError && (
            <p className="field-error server-error">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`register-btn ${isLoading ? "loading" : ""}`}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              submitLabel
            )}
          </button>

          <div className="signin-prompt">
            <span>Đã có tài khoản? </span>
            {typeof onSwitchToLogin === "function" ? (
              <button
                type="button"
                className="signin-link auth-inline-link"
                onClick={onSwitchToLogin}
              >
                {loginText}
              </button>
            ) : (
              <Link to={loginPath} className="signin-link">
                {loginText}
              </Link>
            )}
          </div>

          <div className="switch-account-prompt">
            {isOwnerFlow ? (
              <>
                <span>Bạn muốn đặt sân như khách hàng? </span>
                {typeof onSwitchToCustomerRegister === "function" ? (
                  <button
                    type="button"
                    className="signin-link auth-inline-link"
                    onClick={onSwitchToCustomerRegister}
                  >
                    Đăng ký tài khoản khách
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="signin-link"
                    state={{ [OPEN_AUTH_STATE_KEY]: "register" }}
                  >
                    Đăng ký tài khoản khách
                  </Link>
                )}
              </>
            ) : (
              <>
                <span>Bạn là chủ sân? </span>
                {typeof onSwitchToOwnerRegister === "function" ? (
                  <button
                    type="button"
                    className="signin-link auth-inline-link"
                    onClick={onSwitchToOwnerRegister}
                  >
                    Đăng ký Owner
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="signin-link"
                    state={{ [OPEN_AUTH_STATE_KEY]: "register-owner" }}
                  >
                    Đăng ký Owner
                  </Link>
                )}
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
