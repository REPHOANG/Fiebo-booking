// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
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
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <h2>Reset Password</h2>
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
              <h3>Enter Your Email</h3>
              <p>We'll send you a verification code to reset your password</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input-field"
                placeholder="Enter your email"
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
              {isLoading ? 'Sending...' : 'Continue'}
            </button>
            
            <div className="form-footer">
              <span>Remember your password? </span>
              <Link to="/login" className="link">Sign in</Link>
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
              <h3>Verify Your Code</h3>
              <p>Enter the 6-digit code we sent to<br /><strong>{formData.email}</strong></p>
            </div>
            
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                name="otp"
                type="text"
                className="input-field otp-input"
                placeholder="000000"
                value={formData.otp}
                onChange={(e) => {
                  if (e.target.value.length <= 6 && /^\d*$/.test(e.target.value)) {
                    handleChange(e);
                  }
                }}
                maxLength="6"
                required
              />
              <p className="hint">Enter the code from your email</p>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-submit ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
            
            <div className="resend-section">
              <p>Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="btn-resend"
              >
                Resend Code
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
              <h3>Create New Password</h3>
              <p>Enter a strong password to secure your account</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-wrapper">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Create a password"
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
              <p className="hint">Min 8 characters, 1 uppercase, 1 lowercase, 1 number</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Confirm your password"
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
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
