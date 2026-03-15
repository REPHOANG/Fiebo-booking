// src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials, AUTH_STORAGE_KEY, encodeAuthStorage } from '../../store/authSlice';
import { login, loginWithGoogle, sendPhoneLoginOtp, verifyPhoneLoginOtp } from '../../services/authService';
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
    .required('Vui lòng nhập email hoặc số điện thoại')
    .test('email-or-phone', 'Email hoặc số điện thoại không hợp lệ', (val) => {
      if (!val) return false;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const phoneOk = /^[0-9]{9,11}$/.test(val.replace(/\D/g, ''));
      return emailOk || phoneOk;
    }),
  password: yup
    .string()
    .required('Vui lòng nhập mật khẩu'),
});

// ── Yup schema for phone OTP login ─────────────────────────────────────────
const phoneSchema = yup.object({
  phoneNumber: yup
    .string()
    .required('Vui lòng nhập số điện thoại')
    .test('is-phone', 'Số điện thoại không hợp lệ', (val) => {
      if (!val) return false;
      return /^[0-9]{9,11}$/.test(val.replace(/\D/g, ''));
    }),
});


const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Tab state: 'password' | 'otp'
  const [loginMethod, setLoginMethod] = useState('password');

  // Shared state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  // OTP-specific state
  const [otpSent, setOtpSent] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);

  // Password login form
  const {
    register: field,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
    mode: 'onTouched',
  });

  // Phone OTP form
  const {
    register: phoneField,
    handleSubmit: handlePhoneSubmit,
    formState: { errors: phoneErrors },
  } = useForm({
    resolver: yupResolver(phoneSchema),
    mode: 'onTouched',
  });

  // Load saved identifier only (không lưu mật khẩu vào localStorage)
  useEffect(() => {
    try {
      // Xóa key cũ có thể chứa mật khẩu
      localStorage.removeItem('rememberedCredentials');
      const saved = localStorage.getItem('rememberedIdentifier');
      if (saved) {
        const { identifier } = JSON.parse(saved);
        if (identifier) {
          setValue('identifier', identifier);
          setRememberMe(true);
        }
      }
    } catch (_) {}
  }, [setValue]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setOtpTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpTimeLeft]);

  // Reset OTP state when switching tabs
  useEffect(() => {
    setAlertInfo(null);
    setOtpSent(false);
    setOtpPhone('');
    setOtp(['', '', '', '', '', '']);
    setOtpTimeLeft(0);
    setCanResend(false);
  }, [loginMethod]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Detect if input is email or phone
  const detectIdentifierType = (input) => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return 'email';
    if (/^[0-9]{9,11}$/.test(input.replace(/\D/g, ''))) return 'phone';
    return 'unknown';
  };

  // ── Password login handler ────────────────────────────────────────────────
  const onSubmit = async (data) => {
    const idType = detectIdentifierType(data.identifier);
    const loginPayload = idType === 'email'
      ? { email: data.identifier, password: data.password }
      : { phone: data.identifier, password: data.password };

    setIsLoading(true);
    setAlertInfo(null);
    try {
      const response = await login(loginPayload);
      const token = response.accessToken || response.token;
      dispatch(setCredentials({ user: response.user, token }));

      if (rememberMe) {
        localStorage.setItem('rememberedIdentifier', JSON.stringify({
          identifier: data.identifier,
        }));
      } else {
        localStorage.removeItem('rememberedIdentifier');
      }

      localStorage.setItem('accessToken', token);
      localStorage.setItem(AUTH_STORAGE_KEY, encodeAuthStorage({ user: response.user, token }));

      toast.success('Đăng nhập thành công! Chào mừng ' + (response.user?.name || response.user?.email), {
        position: 'top-right', autoClose: 3000,
      });

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
        return;
      }
      if (isOwner) {
        navigate('/owner', { replace: true });
        return;
      }
      const userRole = (response.user?.role || '').toLowerCase();
      navigate(userRole === 'admin' ? '/admin' : '/', { replace: true });

    } catch (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setAlertInfo({ type: 'error', message: 'Email/Số điện thoại hoặc mật khẩu không chính xác' });
      } else if (msg.includes('not found')) {
        setAlertInfo({ type: 'error', message: 'Tài khoản không tìm thấy. Vui lòng đăng ký' });
      } else {
        setAlertInfo({ type: 'error', message: error.message || 'Đăng nhập thất bại' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Send OTP to phone ─────────────────────────────────────────────────────
  const onSendOtp = async (data) => {
    setIsLoading(true);
    setAlertInfo(null);
    try {
      await sendPhoneLoginOtp(data.phoneNumber);
      setOtpPhone(data.phoneNumber);
      setOtpSent(true);
      setOtpTimeLeft(300); // 5 minutes
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      toast.success('Mã OTP đã được gửi đến số ' + data.phoneNumber);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      setAlertInfo({ type: 'error', message: error.message || 'Không thể gửi mã OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify OTP and login ──────────────────────────────────────────────────
  const onVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setAlertInfo({ type: 'error', message: 'Vui lòng nhập đủ 6 chữ số OTP' });
      return;
    }

    setIsLoading(true);
    setAlertInfo(null);
    try {
      const response = await verifyPhoneLoginOtp(otpPhone, otpCode);
      const token = response.accessToken || response.token;
      dispatch(setCredentials({ user: response.user, token }));
      localStorage.setItem('accessToken', token);
      localStorage.setItem(AUTH_STORAGE_KEY, encodeAuthStorage({ user: response.user, token }));

      toast.success('Đăng nhập thành công! Chào mừng ' + (response.user?.name || response.user?.phone), {
        position: 'top-right', autoClose: 3000,
      });

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
        return;
      }
      if (isOwner) {
        navigate('/owner', { replace: true });
        return;
      }
      const userRole = (response.user?.role || '').toLowerCase();
      navigate(userRole === 'admin' ? '/admin' : '/', { replace: true });
    } catch (error) {
      setAlertInfo({ type: 'error', message: error.message || 'Mã OTP không hợp lệ' });
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (!canResend || !otpPhone) return;
    setIsLoading(true);
    try {
      await sendPhoneLoginOtp(otpPhone);
      setOtpTimeLeft(300);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      toast.info('Đã gửi lại mã OTP');
    } catch (error) {
      toast.error('Không thể gửi lại mã OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const focusIdx = Math.min(pasted.length, 5);
      otpRefs.current[focusIdx]?.focus();
    }
  };

  // ── Google login ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        setAlertInfo({ type: 'error', message: 'Google credential bị thiếu' });
        return;
      }
      setIsLoading(true);
      setAlertInfo(null);
      const response = await loginWithGoogle(credential);
      const token = response.accessToken || response.token;
      dispatch(setCredentials({ user: response.user, token }));
      localStorage.setItem('accessToken', token);
      localStorage.setItem(AUTH_STORAGE_KEY, encodeAuthStorage({ user: response.user, token }));
      toast.success('Đăng nhập Google thành công!', {
        position: 'top-right',
        autoClose: 3000,
      });
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
        return;
      }
      navigate(isOwner ? '/owner' : '/', { replace: true });
    } catch (error) {
      setAlertInfo({ type: 'error', message: error.message || 'Đăng nhập Google thất bại' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setAlertInfo({ type: 'error', message: 'Đăng nhập Google bị hủy hoặc thất bại' });
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
          onClick={() => navigate('/')}
          aria-label="Back to Home"
        >
          Quay lại trang chủ
        </button>
        <a
          className="owner-toggle-btn"
          href="/owner/login"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open owner login in new tab"
        >
          Chủ sân
        </a>
        <div className="login-header">
          <img src={fieboLogo} alt="Fiebo Logo" className="login-logo" />
        </div>

        {/* ── Login Method Tabs ── */}
        <div className="login-method-tabs">
          <button
            type="button"
            className={`method-tab${loginMethod === 'password' ? ' active' : ''}`}
            onClick={() => setLoginMethod('password')}
          >
            Mật khẩu
          </button>
          <button
            type="button"
            className={`method-tab${loginMethod === 'otp' ? ' active' : ''}`}
            onClick={() => setLoginMethod('otp')}
          >
            Mã OTP
          </button>
        </div>

        {/* ── Alert ── */}
        <Collapse in={!!alertInfo}>
          {alertInfo && (
            <Alert
              severity={alertInfo.type}
              
              sx={{ mb: 2, mt: 1 }}
            >
              {alertInfo.message}
            </Alert>
          )}
        </Collapse>

        {/* ═══════════ PASSWORD TAB ═══════════ */}
        {loginMethod === 'password' && (
          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <div className="input-group">
                <label htmlFor="identifier">Email hoặc số điện thoại</label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className={`input-field${errors.identifier ? ' input-error' : ''}`}
                  placeholder="Nhập email hoặc số điện thoại"
                  disabled={isLoading}
                  {...field('identifier')}
                />
                {errors.identifier && <p className="field-error">{errors.identifier.message}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input-field${errors.password ? ' input-error' : ''}`}
                    placeholder="Nhập mật khẩu của bạn"
                    disabled={isLoading}
                    {...field('password')}
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
                {errors.password && <p className="field-error">{errors.password.message}</p>}
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
              className={`login-btn ${isLoading ? 'loading' : ''}`}
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
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap={false} />
            </div>

            <div className="signup-prompt">
              <span>Chưa có tài khoản? </span>
              <Link to="/register" className="signup-link">
                Đăng ký tại đây
              </Link>
            </div>
          </form>
        )}

        {/* ═══════════ OTP TAB ═══════════ */}
        {loginMethod === 'otp' && (
          <>
            {!otpSent ? (
              /* ── Step 1: Enter phone number ── */
              <form className="login-form" onSubmit={handlePhoneSubmit(onSendOtp)} noValidate>
                <div className="form-group">
                  <div className="input-group">
                    <label htmlFor="phoneNumber">Số điện thoại</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      className={`input-field${phoneErrors.phoneNumber ? ' input-error' : ''}`}
                      placeholder="Nhập số điện thoại của bạn"
                      disabled={isLoading}
                      {...phoneField('phoneNumber')}
                    />
                    {phoneErrors.phoneNumber && (
                      <p className="field-error">{phoneErrors.phoneNumber.message}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`login-btn ${isLoading ? 'loading' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Đang gửi mã OTP...</span>
                    </>
                  ) : (
                    "Gửi mã OTP"
                  )}
                </button>

                <div className="login-divider">
                  <span>hoặc</span>
                </div>

                <div className="google-login">
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap={false} />
                </div>

                <div className="signup-prompt">
                  <span>Chưa có tài khoản? </span>
                  <Link to="/register" className="signup-link">
                    Đăng ký tại đây
                  </Link>
                </div>
              </form>
            ) : (
              /* ── Step 2: Enter OTP code ── */
              <div className="login-form">
                <div className="otp-login-header">
                  <p className="otp-login-subtitle">
                    Nhập mã 6 chữ số đã gửi đến<br />
                    <strong>{otpPhone}</strong>
                  </p>
                  <button
                    type="button"
                    className="change-phone-btn"
                    onClick={() => { setOtpSent(false); setAlertInfo(null); }}
                    disabled={isLoading}
                  >
                    Đổi số
                  </button>
                </div>

                <div className="otp-login-input-group" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="otp-login-input"
                      disabled={isLoading}
                      placeholder="0"
                    />
                  ))}
                </div>

                <div className="otp-login-timer">
                  {otpTimeLeft > 0 ? (
                    <span>Mã hết hạn sau: <strong className="timer-text">{formatTime(otpTimeLeft)}</strong></span>
                  ) : (
                    <span>
                      Mã đã hết hạn.{' '}
                      <button
                        type="button"
                        className="resend-otp-btn"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                      >
                        Gửi lại
                      </button>
                    </span>
                  )}
                  {otpTimeLeft > 0 && canResend === false && (
                    <button
                      type="button"
                      className="resend-otp-btn"
                      onClick={handleResendOtp}
                      disabled={!canResend || isLoading}
                      style={{ opacity: 0.4, cursor: 'not-allowed', marginLeft: 8 }}
                    >
                      Gửi lại
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isLoading || otp.join('').length !== 6}
                  className={`login-btn ${isLoading ? 'loading' : ''}`}
                  onClick={onVerifyOtp}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    "Xác nhận đăng nhập"
                  )}
                </button>

                <div className="signup-prompt">
                  <span>Chưa có tài khoản? </span>
                  <Link to="/register" className="signup-link">
                    Đăng ký tại đây
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Login;