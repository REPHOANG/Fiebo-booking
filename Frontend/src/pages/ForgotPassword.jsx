// src/pages/ForgotPassword.jsx
import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  requestPasswordReset,
  verifyResetOTP,
  resetPassword,
} from '../services/authService';
import '../pages/ForgotPassword.css';
import AnimatedBallBackground from '../components/AnimatedBallBackground';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: email, 2: verify OTP, 3: reset password
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [resetToken, setResetToken] = useState(null);

  // OTP boxes state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1); // keep only last char
    setOtpDigits(newDigits);
    setFormData(prev => ({ ...prev, otp: newDigits.join('') }));
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setOtpDigits(newDigits);
    setFormData(prev => ({ ...prev, otp: newDigits.join('') }));
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    otpRefs.current[nextEmpty]?.focus();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // Step 1: Request reset link
  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Please enter your email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📤 Requesting password reset for:', formData.email);
      await requestPasswordReset(formData.email);
      console.log('✅ Reset email sent successfully');
      toast.success('Verification code sent to your email!');
      setStep(2);
    } catch (error) {
      console.error('❌ Reset request error:', error);
      const errorMsg = error.message || 'Failed to send verification code. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!formData.otp) {
      toast.error('Please enter the verification code');
      return;
    }
    
    if (formData.otp.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📤 Verifying OTP for:', formData.email);
      const response = await verifyResetOTP(formData.email, formData.otp);
      console.log('✅ OTP verified successfully');
      setResetToken(response.resetToken);
      toast.success('Code verified successfully!');
      setStep(3);
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      const errorMsg = error.message || 'Invalid or expired verification code. Please try again.';
      if (error.status === 401 || error.status === 400) {
        toast.error('Invalid or expired verification code');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Please enter both passwords');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (!/[A-Z]/.test(formData.newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    
    if (!/[a-z]/.test(formData.newPassword)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    
    if (!/[0-9]/.test(formData.newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (!/[\W_]/.test(formData.newPassword)) {
      toast.error('Password must contain at least one special character (!@#$%^&*)');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📤 Resetting password for:', formData.email);
      await resetPassword({
        email: formData.email,
        resetToken: resetToken,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });
      console.log('✅ Password reset successfully');
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      console.error('❌ Password reset error:', error);
      const errorMsg = error.message || 'Failed to reset password';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBackClick = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/login');
    }
  };
  
  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      console.log('📤 Resending code to:', formData.email);
      await requestPasswordReset(formData.email);
      console.log('✅ Code resent successfully');
      toast.success('Code resent! Check your email');
    } catch (error) {
      console.error('❌ Resend error:', error);
      toast.error('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="forgot-password-page">
      <AnimatedBallBackground />
      <div class="bg-element football"></div>
      <div class="bg-element basketball"></div>
      <div class="bg-element tennis"></div>
      <div class="bg-element shuttlecock"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="forgot-password-card"
      >
        {/* Header */}
        <div className="forgot-header">
          <button onClick={handleBackClick} className="btn-back-fp">
            <FontAwesomeIcon icon={faArrowLeft} /> Quay Lại
          </button>
          <h2>Quên Mật Khẩu</h2>
          <div></div>
        </div>
        
        {/* Progress Dots */}
        <div className="progress-dots">
          <div className={`dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`connector ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`dot ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`connector ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`dot ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>
        
        {/* Step 1: Enter Email */}
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleRequestReset}
            className="forgot-form"
          >
            <div className="step-info">
              <h3>Nhập Email Của Bạn</h3>
              <p>Chúng tôi sẽ gửi mã xác minh để đặt lại mật khẩu của bạn</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input-field"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-submit ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Đang gửi...' : 'Tiếp tục'}
            </button>
            
            <div className="form-footer">
              <span>Nhớ mật khẩu của bạn? </span>
              <Link to="/login" className="link">Đăng nhập</Link>
            </div>
          </motion.form>
        )}
        
        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleVerifyOTP}
            className="forgot-form"
          >
            <div className="step-info">
              <h3>Xác Minh Mã Của Bạn</h3>
              <p>Nhập mã 6 chữ số chúng tôi đã gửi đến<br /><strong>{formData.email}</strong></p>
            </div>
            
            <div className="form-group">
              <label>Mã Xác Minh</label>
              <div className="otp-input-group">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => otpRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    className="otp-box"
                    value={digit}
                    onChange={e => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              <p className="hint">Nhập mã từ email của bạn</p>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-submit ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Đang xác minh...' : 'Xác minh'}
            </button>
            
            <div className="resend-section">
              <p>Không nhận được mã?</p>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="btn-resend"
              >
                Gửi lại mã
              </button>
            </div>
          </motion.form>
        )}
        
        {/* Step 3: Reset Password */}
        {step === 3 && (
          <motion.form
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleResetPassword}
            className="forgot-form"
          >
            <div className="step-info">
              <h3>Tạo Mật Khẩu Mới</h3>
              <p>Nhập mật khẩu mạnh để bảo vệ tài khoản của bạn</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">Mật Khẩu Mới</label>
              <div className="password-wrapper">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Nhập mật khẩu mới"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              <p className="hint">Tối thiểu 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Xác nhận mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="toggle-password"
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-submit ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
