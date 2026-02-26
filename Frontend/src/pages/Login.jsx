// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { login, loginWithGoogle } from '../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import fieboLogo from '../assets/images/Logo với chữ.png';
import AnimatedBallBackground from '../components/AnimatedBallBackground';
import '../pages/Login.css';


const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Form state
  const [formData, setFormData] = useState({
    identifier: '', // Can be email or phone
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailInfo, setShowEmailInfo] = useState(false);
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rememberedCredentials');
      if (saved) {
        const { identifier, password } = JSON.parse(saved);
        setFormData(prev => ({ ...prev, identifier: identifier || '', password: password || '' }));
        setRememberMe(true);
      }
    } catch (_) {}
  }, []);

  // Detect if input is email or phone
  const detectIdentifierType = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{9,11}$/;

    if (emailRegex.test(input)) return 'email';
    if (phoneRegex.test(input.replace(/\D/g, ''))) return 'phone';
    return 'unknown';
  };

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.identifier || !formData.password) {
      toast.error('⚠️ Vui lòng nhập email/số điện thoại và mật khẩu', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    const idType = detectIdentifierType(formData.identifier);

    if (idType === 'unknown') {
      toast.error('❌ Email hoặc số điện thoại không hợp lệ', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const loginPayload = idType === 'email'
        ? { email: formData.identifier, password: formData.password }
        : { phone: formData.identifier, password: formData.password };

      console.log('📤 Sending login:', loginPayload);
      const response = await login(loginPayload);

      console.log('📥 Backend response:', response);
      console.log('🔑 Token from response:', response.accessToken || response.token);
      console.log('👤 User from response:', response.user);
      
      // Dispatch credentials to Redux
      console.log('💾 Dispatching setCredentials...');
      dispatch(setCredentials({
        user: response.user,
        token: response.accessToken || response.token
      }));

      // Save or clear remembered credentials
      if (rememberMe) {
        localStorage.setItem('rememberedCredentials', JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }));
      } else {
        localStorage.removeItem('rememberedCredentials');
      }

      // Also save to localStorage immediately (backup)
      const authData = {
        user: response.user,
        token: response.accessToken || response.token,
        isAuthenticated: true
      };
      localStorage.setItem('authState', JSON.stringify(authData));
      console.log('✅ Saved to localStorage:', authData);

      console.log('✅ User logged in:', response.user);
      
      toast.success('✅ Đăng nhập thành công! Chào mừng ' + (response.user?.name || response.user?.email), {
        position: 'top-right',
        autoClose: 3000,
      });

      // Navigate immediately
      const userRole = (response.user?.role || '').toLowerCase();
      console.log('🔍 User role:', userRole);
      console.log('📍 Current path:', window.location.pathname);
      
      if (userRole === 'admin') {
        console.log('➡️ Navigating to /admin');
        navigate('/admin', { replace: true });
      } else {
        console.log('➡️ Navigating to /home');
        navigate('/home', { replace: true });
      }
      
      console.log('📍 After navigate:', window.location.pathname);

    } catch (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        toast.error('❌ Email/Số điện thoại hoặc mật khẩu không chính xác', {
          position: 'top-right',
          autoClose: 3000,
        });
      } else if (msg.includes('not found')) {
        toast.error('❌ Tài khoản không tìm thấy. Vui lòng đăng ký', {
          position: 'top-right',
          autoClose: 3000,
        });
      } else {
        toast.error('❌ ' + (error.message || 'Đăng nhập thất bại'), {
          position: 'top-right',
          autoClose: 3000,
        });
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
      <AnimatedBallBackground />
      <div class="bg-element football"></div>
      <div class="bg-element basketball"></div>
      <div class="bg-element tennis"></div>
      <div class="bg-element shuttlecock"></div>
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

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-group">
              <label htmlFor="identifier">Email hoặc số điện thoại</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                className="input-field"
                placeholder="Enter your email or phone number"
                value={formData.identifier}
                onChange={handleChange}
                disabled={isLoading}
              />
              {/* <p className="hint-text">You can log in with either email (user@example.com) or phone (0123456789)</p> */}
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input-field"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                  aria-label="Toggle password visibility"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
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
                <span>Logging in...</span>
              </>
            ) : (
              "Login"
            )}
          </button>

          <div className="divider">
            <span>or</span>
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