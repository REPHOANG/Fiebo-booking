// src/pages/Register.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setRegistrationPending } from '../store/authSlice';
import { register } from '../services/authService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import fieboLogo from '../assets/images/Logo với chữ.png';
import AnimatedBallBackground from '../components/AnimatedBallBackground';
import '../pages/Register.css';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // Validate password strength
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'mật khẩu phải có ít nhất 8 ký tự';
    }
    if (!/[A-Z]/.test(password)) {
      return 'mật khẩu phải có ít nhất một ký tự viết hoa';
    }
    if (!/[a-z]/.test(password)) {
      return 'mật khẩu phải có ít nhất một ký tự viết thường';
    }
    if (!/[0-9]/.test(password)) {
      return 'mật khẩu phải có ít nhất một số';
    }
    if (!/[\W_]/.test(password)) {
      return 'mật khẩu phải có ít nhất một ký tự đặc biệt (!@#$%^&* etc)';
    }
    return null;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 Form submitted', formData);
    
    // Validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.dateOfBirth || !formData.password || !formData.confirmPassword) {
      console.warn('❌ Missing fields');
      toast.error('All fields are required');
      return;
    }
    
    // Full name validation
    if (formData.fullName.length < 4) {
      console.warn('❌ Full name too short:', formData.fullName);
      toast.error('họ và tên phải có ít nhất 4 ký tự');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      console.warn('❌ Invalid email:', formData.email);
      toast.error('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }
    
    // Phone validation
    if (!/^[0-9]{9,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      console.warn('❌ Invalid phone:', formData.phone);
      toast.error('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    
    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      console.warn('❌ Password error:', passwordError);
      toast.error(passwordError);
      return;
    }
    
    // Confirm password match
    if (formData.password !== formData.confirmPassword) {
      console.warn('❌ Passwords do not match');
      toast.error('mật khẩu xác nhận không khớp');
      return;
    }
    
    // Date of birth validation
    const dob = new Date(formData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    if (age < 13) {
      console.warn('❌ Age too young:', age);
      toast.error('bạn phải ít nhất 13 tuổi để đăng ký');
      return;
    }
    
    console.log('✅ All validation passed, sending to backend...');
    setIsLoading(true);
    
    try {
      // Call backend registration
      const response = await register({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        dateOfBirth: formData.dateOfBirth,
      });
      
      console.log('✅ Registration response:', response);
      
      // Set pending registration state (waiting for OTP verification)
      dispatch(setRegistrationPending({
        email: formData.email,
        phone: formData.phone,
      }));
      
      toast.success('Account created! Please check your email for the OTP code.');
      
      // Navigate to OTP verification page
      navigate('/verify-otp');
      
    } catch (error) {
      console.error('❌ Registration error object:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      const errorMsg = error.message || error.details || 'Registration failed';
      
      // Handle specific error cases
      if (errorMsg.toLowerCase().includes('already exist')) {
        toast.error('Email hoặc số điện thoại đã được đăng ký');
      } else if (errorMsg.toLowerCase().includes('validation')) {
        toast.error(errorMsg);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <AnimatedBallBackground />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="register-card"
      >
        <div className="register-header">
          <img src={fieboLogo} alt="Fiebo Logo" className="register-logo" />
          {/* <p className="register-subtitle">Create your account and get started</p> */}
        </div>
        
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            {/* Full Name Input */}
            <div className="input-group">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="input-field"
                placeholder="Nhập họ và tên của bạn"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            {/* Email Input */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            {/* Phone Input */}
            <div className="input-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className="input-field"
                placeholder="Nhập số điện thoại của bạn"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            {/* Date of Birth Input */}
            <div className="input-group">
              <label htmlFor="dateOfBirth">Ngày sinh</label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                className="input-field"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            {/* Password Input */}
            <div className="input-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input-field"
                  placeholder="Nhập mật khẩu của bạn"
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
              <p className="password-hint">
                Min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character (!@#$%^&*)
              </p>
            </div>
            
            {/* Confirm Password Input */}
            <div className="input-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input-field"
                  placeholder="Xác nhận mật khẩu của bạn"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="toggle-password"
                  aria-label="Toggle password visibility"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>
          </div>

          <div className="terms-agreement">
            <input
              type="checkbox"
              id="terms"
              required
              disabled={isLoading}
            />
            <label htmlFor="terms">
              I agree to the <Link to="/terms" className="terms-link">Terms of Service</Link> and <Link to="/privacy" className="terms-link">Privacy Policy</Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`register-btn ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              "Tạo tài khoản"
            )}
          </button>

          <div className="signin-prompt">
            <span>Already have an account? </span>
            <Link to="/login" className="signin-link">
              Sign in here
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;


  