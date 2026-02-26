// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { login, loginWithGoogle } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import fieboLogo from '../../assets/images/Logo với chữ.png';
import './Login.css';

// ── Yup schema ──────────────────────────────────────────────────────────────
const schema = yup.object({
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


const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register: field,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onTouched',
  });

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rememberedCredentials');
      if (saved) {
        const { identifier, password } = JSON.parse(saved);
        setValue('identifier', identifier || '');
        setValue('password', password || '');
        setRememberMe(true);
      }
    } catch (_) {}
  }, [setValue]);

  // Detect if input is email or phone
  const detectIdentifierType = (input) => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return 'email';
    if (/^[0-9]{9,11}$/.test(input.replace(/\D/g, ''))) return 'phone';
    return 'unknown';
  };

  const onSubmit = async (data) => {
    const idType = detectIdentifierType(data.identifier);
    const loginPayload = idType === 'email'
      ? { email: data.identifier, password: data.password }
      : { phone: data.identifier, password: data.password };

    setIsLoading(true);
    try {
      const response = await login(loginPayload);
      dispatch(setCredentials({ user: response.user, token: response.accessToken || response.token }));

      if (rememberMe) {
        localStorage.setItem('rememberedCredentials', JSON.stringify({
          identifier: data.identifier, password: data.password,
        }));
      } else {
        localStorage.removeItem('rememberedCredentials');
      }

      localStorage.setItem('authState', JSON.stringify({
        user: response.user,
        token: response.accessToken || response.token,
        isAuthenticated: true,
      }));

      toast.success('✅ Đăng nhập thành công! Chào mừng ' + (response.user?.name || response.user?.email), {
        position: 'top-right', autoClose: 3000,
      });

      const userRole = (response.user?.role || '').toLowerCase();
      navigate(userRole === 'admin' ? '/admin' : '/home', { replace: true });

    } catch (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        toast.error('❌ Email/Số điện thoại hoặc mật khẩu không chính xác', { position: 'top-right', autoClose: 3000 });
      } else if (msg.includes('not found')) {
        toast.error('❌ Tài khoản không tìm thấy. Vui lòng đăng ký', { position: 'top-right', autoClose: 3000 });
      } else {
        toast.error('❌ ' + (error.message || 'Đăng nhập thất bại'), { position: 'top-right', autoClose: 3000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        toast.error('❌ Google credential bị thiếu', {
          position: 'top-right',
          autoClose: 3000,
        });
        return;
      }
      setIsLoading(true);
      const response = await loginWithGoogle(credential);
      dispatch(setCredentials({
        user: response.user,
        token: response.accessToken || response.token
      }));
      toast.success('✅ Đăng nhập Google thành công!', {
        position: 'top-right',
        autoClose: 3000,
      });
      navigate('/');
    } catch (error) {
      toast.error('❌ ' + (error.message || 'Đăng nhập Google thất bại'), {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('❌ Đăng nhập Google bị hủy hoặc thất bại', {
      position: 'top-right',
      autoClose: 3000,
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
          onClick={() => navigate('/home')}
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
          {/* <p className="login-subtitle">Welcome back to your account</p> */}
        </div>

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

            {/* Password Input */}
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
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Nhớ tài khoản</span>
            </label>
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

          <div className="divider">
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
      </motion.div>
    </div>
  );
};

export default Login;