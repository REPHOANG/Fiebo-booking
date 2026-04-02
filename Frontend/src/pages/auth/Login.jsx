// src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials, AUTH_STORAGE_KEY } from '../../store/authSlice';
import { login, loginWithGoogle } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import fieboLogo from '../../assets/images/Logo với chữ.png';
import './Login.css';

// ── Yup schema for password login ──────────────────────────────────────────
const passwordSchema = yup.object({
  identifier: yup
    .string()
    .required("Vui lòng nhập email hoặc số điện thoại")
    .test("email-or-phone", "Email hoặc số điện thoại không hợp lệ", (val) => {
      if (!val) return false;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const phoneOk = /^[0-9]{9,11}$/.test(val.replace(/\D/g, ""));
      return emailOk || phoneOk;
    }),
  password: yup.string().required("Vui lòng nhập mật khẩu"),
});

// (Phone OTP removed)

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Shared state
  // Login uses password method only (OTP removed)
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  // OTP removed: no phone-login state

  // Password login form
  const {
    register: field,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
    mode: "onTouched",
  });

  // (phone OTP form removed)

  // Load saved identifier only (không lưu mật khẩu vào localStorage)
  useEffect(() => {
    try {
      // Xóa key cũ có thể chứa mật khẩu
      localStorage.removeItem("rememberedCredentials");
      const saved = localStorage.getItem("rememberedIdentifier");
      if (saved) {
        const { identifier } = JSON.parse(saved);
        if (identifier) {
          setValue("identifier", identifier);
          setRememberMe(true);
        }
      }
    } catch (_) {}
  }, [setValue]);

  // OTP logic removed

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Detect if input is email or phone
  const detectIdentifierType = (input) => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return "email";
    if (/^[0-9]{9,11}$/.test(input.replace(/\D/g, ""))) return "phone";
    return "unknown";
  };

  const hasOwnerRole = (user) => {
    const roleRaw = user?.role ?? user?.roles ?? "";
    if (Array.isArray(roleRaw)) {
      return roleRaw.some((r) => String(r).toLowerCase().trim() === "fieldowner");
    }
    return String(roleRaw)
      .split(",")
      .map((r) => r.toLowerCase().trim())
      .includes("fieldowner");
  };

  // ── Password login handler ────────────────────────────────────────────────
  const onSubmit = async (data) => {
    const idType = detectIdentifierType(data.identifier);
    const loginPayload =
      idType === "email"
        ? { email: data.identifier, password: data.password }
        : { phone: data.identifier, password: data.password };

    setIsLoading(true);
    setAlertInfo(null);
    try {
      const response = await login(loginPayload);
      const token = response.accessToken || response.token;
      dispatch(setCredentials({ user: response.user, token }));

      if (rememberMe) {
        localStorage.setItem(
          "rememberedIdentifier",
          JSON.stringify({
            identifier: data.identifier,
          }),
        );
      } else {
        localStorage.removeItem("rememberedIdentifier");
      }
      toast.success(
        "Đăng nhập thành công! Chào mừng " +
          (response.user?.name || response.user?.email),
        {
          position: "top-right",
          autoClose: 3000,
        },
      );

      localStorage.setItem(AUTH_STORAGE_KEY, token);

      toast.success('Đăng nhập thành công! Chào mừng ' + (response.user?.name || response.user?.email), {
        position: 'top-right', autoClose: 3000,
      });

      if (typeof onLoginSuccess === "function") {
        if (hasOwnerRole(response.user) || isOwner) {
          navigate("/owner", { replace: true });
        }
        onLoginSuccess();
        return;
      }
      if (hasOwnerRole(response.user) || isOwner) {
        navigate('/owner', { replace: true });
        return;
      }
      const roleVal = (response.user?.role || response.user?.roles || "").toString().toLowerCase();
      if (roleVal === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      navigate('/', { replace: true });

    } catch (error) {
      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials")) {
        setAlertInfo({
          type: "error",
          message: "Email/Số điện thoại hoặc mật khẩu không chính xác",
        });
      } else if (msg.includes("not found")) {
        setAlertInfo({
          type: "error",
          message: "Tài khoản không tìm thấy. Vui lòng đăng ký",
        });
      } else {
        setAlertInfo({
          type: "error",
          message: error.message || "Đăng nhập thất bại",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP code removed - login only supports password + Google

  // ── Google login ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        setAlertInfo({ type: "error", message: "Google credential bị thiếu" });
        return;
      }
      setIsLoading(true);
      setAlertInfo(null);
      const response = await loginWithGoogle(credential);
      const token = response.accessToken || response.token;
      dispatch(setCredentials({ user: response.user, token }));
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      toast.success('Đăng nhập Google thành công!', {
        position: 'top-right',
        autoClose: 3000,
      });
      if (typeof onLoginSuccess === "function") {
        if (hasOwnerRole(response.user) || isOwner) {
          navigate("/owner", { replace: true });
        }
        onLoginSuccess();
        return;
      }
      if (hasOwnerRole(response.user) || isOwner) {
        navigate('/owner', { replace: true });
        return;
      }
      const roleVal = (response.user?.role || response.user?.roles || "").toString().toLowerCase();
      if (roleVal === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      navigate('/', { replace: true });
    } catch (error) {
      setAlertInfo({
        type: "error",
        message: error.message || "Đăng nhập Google thất bại",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setAlertInfo({
      type: "error",
      message: "Đăng nhập Google bị hủy hoặc thất bại",
    });
  };

  return (
    <div className="login-page">
      <div className="bg-element football"></div>
      <div className="bg-element basketball"></div>
      <div className="bg-element tennis"></div>
      <div className="bg-element shuttlecock"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-card"
      >
        <button
          type="button"
          className="back-home-btn"
          onClick={() => navigate("/")}
          aria-label="Back to Home"
        >
          Quay lại trang chủ
        </button>
        {/* owner top-right button removed per request */}
        <div className="login-header">
          <img src={fieboLogo} alt="Fiebo Logo" className="login-logo" />
        </div>

        {/* Login uses password only (OTP removed) */}

        {/* ── Alert ── */}
        <Collapse in={!!alertInfo}>
          {alertInfo && (
            <Alert severity={alertInfo.type} sx={{ mb: 2, mt: 1 }}>
              {alertInfo.message}
            </Alert>
          )}
        </Collapse>

        {/* ═══════════ PASSWORD FORM ═══════════ */}
          <form
            className="login-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="form-group">
              <div className="input-group">
                <label htmlFor="identifier">Email hoặc số điện thoại</label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className={`input-field${errors.identifier ? " input-error" : ""}`}
                  placeholder="Nhập email hoặc số điện thoại"
                  disabled={isLoading}
                  {...field("identifier")}
                />
                {errors.identifier && (
                  <p className="field-error">{errors.identifier.message}</p>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
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
            </div>

            <div className="remember-forgot">
              <div className="checkbox-group">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span>Nhớ tài khoản</span>
                </label>

                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={isOwner}
                    onChange={e => setIsOwner(e.target.checked)}
                  />
                  <span>Chủ sân</span>
                </label>
              </div>

              <Link to="/forgot-password" className="forgot-link">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`login-btn ${isLoading ? "loading" : ""}`}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>

            <div className="login-divider">
              <span>hoặc</span>
            </div>

            <div className="google-login">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
              />
            </div>

            <div className="signup-prompt">
              <span>Chưa có tài khoản? </span>
              <Link to="/register" className="signup-link">
                Đăng ký tại đây
              </Link>
            </div>
          </form>

        {/* OTP login removed */}
      </motion.div>
    </div>
  );
};

export default Login;
