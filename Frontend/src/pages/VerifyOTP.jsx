import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, clearRegistrationPending } from '../store/authSlice';
import { verifyOTP } from '../services/authService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import './VerifyOTP.css';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  
  // Get registration data from Redux state
  const { registrationEmail, registrationPhone, registrationPending } = useSelector(
    state => state.auth
  );

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);

  // Redirect if no pending registration
  useEffect(() => {
    if (!registrationPending || !registrationEmail) {
      navigate('/register');
    }
  }, [registrationPending, registrationEmail, navigate]);

  // Timer for OTP expiration
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    // Only allow single digits
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      const response = await verifyOTP(registrationEmail, otpCode);
      
      toast.success('Account verified successfully!');
      
      // Clear registration pending state
      dispatch(clearRegistrationPending());
      
      // Auto-redirect to login with email pre-filled
      setTimeout(() => {
        navigate('/login', {
          state: {
            email: registrationEmail,
            verified: true,
          },
        });
      }, 1500);
    } catch (error) {
      toast.error(error.message || 'Invalid OTP. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      // For now, show a message - in real implementation, 
      // you would call a resend endpoint
      toast.info('OTP resent to your email. Please check your inbox.');
      setTimeLeft(300); // Reset timer
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="verify-otp-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="verify-otp-card"
      >
        {/* Header */}
        <div className="verify-otp-header">
          <h2 className="verify-otp-title">Verify Your Account</h2>
          <p className="verify-otp-subtitle">
            Enter the 6-digit code sent to<br />
            <strong>{registrationEmail}</strong>
          </p>
        </div>

        {/* Form */}
        <form className="verify-otp-form" onSubmit={handleSubmit}>
          {/* OTP Input Fields */}
          <div className="otp-input-group">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => (otpRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="otp-input"
                disabled={isLoading}
                placeholder="0"
              />
            ))}
          </div>

          {/* Timer or Resend Button */}
          <div className="otp-footer">
            <p className="otp-timer">
              {timeLeft > 0 ? (
                <>
                  Code expires in: <span className="timer">{formatTime(timeLeft)}</span>
                </>
              ) : (
                <>
                  Code expired.{' '}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="resend-link"
                  >
                    Resend OTP
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="verify-button"
            disabled={isLoading || otp.some(digit => !digit)}
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        {/* Help Text */}
        <div className="verify-otp-help">
          <p>Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || isLoading}
            className="help-link"
          >
            Send again
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
