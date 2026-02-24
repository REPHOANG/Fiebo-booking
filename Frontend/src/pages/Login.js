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
import '../pages/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Form state
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation based on login method
    if (loginMethod === 'email') {
      if (!formData.email || !formData.password) {
        toast.error('Email and password are required');
        return;
      }
    } else {
      if (!formData.phone || !formData.password) {
        toast.error('Phone number and password are required');
        return;
      }
      if (!/^[0-9]{9,11}$/.test(formData.phone.replace(/\D/g, ''))) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const loginPayload = loginMethod === 'email' 
        ? { email: formData.email, password: formData.password }
        : { phone: formData.phone, password: formData.password };
      
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-card"
      >
        <div className="login-header">
          <h2 className="login-title">
            <div className="logo-placeholder">Fiebo</div>
          </h2>
          <p className="login-subtitle">Welcome back to your account</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {/* Login Method Tabs */}
          <div className="login-method-tabs">
            <button
              type="button"
              className={`method-tab ${loginMethod === 'email' ? 'active' : ''}`}
              onClick={() => setLoginMethod('email')}
            >
              Email
            </button>
            <button
              type="button"
              className={`method-tab ${loginMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setLoginMethod('phone')}
            >
              Phone
            </button>
          </div>

          <div className="form-group">
            {loginMethod === 'email' ? (
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <div className="input-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="input-field"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            )}
            
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                  aria-label="Toggle password visibility"
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