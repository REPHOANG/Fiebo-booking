// src/pages/Login.jsx
import React, { useState } from 'react';
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
      toast.error('Email/Phone and password are required');
      return;
    }

    const idType = detectIdentifierType(formData.identifier);

    if (idType === 'unknown') {
      toast.error('Please enter a valid email or phone number');
      return;
    }

    setIsLoading(true);

    try {
      const loginPayload = idType === 'email'
        ? { email: formData.identifier, password: formData.password }
        : { phone: formData.identifier, password: formData.password };

      const response = await login(loginPayload);

      // Ensure we use accessToken consistently
      dispatch(setCredentials({
        user: response.user,
        token: response.accessToken || response.token
      }));

      toast.success('Login successful!');

      if ((response.user?.role || '').toLowerCase() === 'admin') {
        navigate('/admin'); // Admin users to admin overview
      } else {
        navigate('/home'); // Regular users
      }

    } catch (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        toast.error('Email/Phone or password is incorrect');
      } else if (msg.includes('not found')) {
        toast.error('Account not found. Please register first.');
      } else {
        toast.error(error.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        toast.error('Google credential missing');
        return;
      }
      setIsLoading(true);
      const response = await loginWithGoogle(credential);
      dispatch(setCredentials({
        user: response.user,
        token: response.accessToken || response.token
      }));
      toast.success('Login with Google successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login was cancelled or failed');
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
        <div className="login-header">
          <img src={fieboLogo} alt="Fiebo Logo" className="login-logo" />
          {/* <p className="login-subtitle">Welcome back to your account</p> */}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-group">
              <label htmlFor="identifier">Email or Phone Number</label>
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
              <label htmlFor="password">Password</label>
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
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
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
            <span>Don't have an account? </span>
            <Link to="/register" className="signup-link">
              Sign up here
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;