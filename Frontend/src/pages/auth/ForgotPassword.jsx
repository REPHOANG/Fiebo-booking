// src/pages/ForgotPassword.jsx
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  requestPasswordReset,
  verifyResetOTP,
  resetPassword,
} from '../../services/authService';
import './ForgotPassword.css';

// ── Yup schemas ───────────────────────────────────────────────────────────
const emailSchema = yup.object({
  email: yup.string().email('Địa chỉ email không hợp lệ').required('Vui lòng nhập email của bạn'),
});

const resetSchema = yup.object({
  newPassword: yup
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .matches(/[A-Z]/, 'Mật khẩu phải có ít nhất một chữ hoa')
    .matches(/[a-z]/, 'Mật khẩu phải có ít nhất một chữ thường')
    .matches(/[0-9]/, 'Mật khẩu phải có ít nhất một chữ số')
    .matches(/[\W_]/, 'Mật khẩu phải có ít nhất một ký tự đặc biệt (!@#$%^&*)')
    .required('Vui lòng nhập mật khẩu mới'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp')
    .required('Vui lòng xác nhận mật khẩu'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState(null);

  // OTP boxes state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpValue, setOtpValue] = useState('');
  const otpRefs = useRef([]);

  // ── Step 1 form (email) ──
  const {
    register: emailField,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm({ resolver: yupResolver(emailSchema), mode: 'onTouched' });

  // ── Step 3 form (reset password) ──
  const {
    register: resetField,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm({ resolver: yupResolver(resetSchema), mode: 'onTouched' });

  // ── OTP handlers ──
  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setOtpValue(newDigits.join(''));
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
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
    setOtpValue(newDigits.join(''));
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    otpRefs.current[nextEmpty]?.focus();
  };

  // ── Step 1: Request reset ──
  const onEmailSubmit = async (data) => {
    setIsLoading(true);
    try {
      await requestPasswordReset(data.email);
      setEmail(data.email);
      toast.success('Mã xác minh đã được gửi đến email của bạn!');
      setStep(2);
    } catch (error) {
      toast.error(error.message || 'Không thể gửi mã xác minh. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpValue || otpValue.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 chữ số của mã xác minh');
      return;
    }
    setIsLoading(true);
    try {
      const response = await verifyResetOTP(email, otpValue);
      setResetToken(response.resetToken);
      toast.success('Xác minh mã thành công!');
      setStep(3);
    } catch (error) {
      const errorMsg = error.message || 'Mã xác minh không hợp lệ hoặc đã hết hạn.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Reset password ──
  const onResetSubmit = async (data) => {
    setIsLoading(true);
    try {
      await resetPassword({
        email,
        resetToken,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      toast.success('Đặt lại mật khẩu thành công!');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/login');
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      toast.success('Đã gửi lại mã! Kiểm tra email của bạn');
    } catch (error) {
      toast.error('Không thể gửi lại mã. Vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="forgot-password-page">
      <div className="bg-element football"></div>
      <div className="bg-element basketball"></div>
      <div className="bg-element tennis"></div>
      <div className="bg-element shuttlecock"></div>
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
            onSubmit={handleEmailSubmit(onEmailSubmit)}
            className="forgot-form"
            noValidate
          >
            <div className="step-info">
              <h3>Nhập Email Của Bạn</h3>
              <p>Chúng tôi sẽ gửi mã xác minh để đặt lại mật khẩu của bạn</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`input-field${emailErrors.email ? ' input-error' : ''}`}
                placeholder="Nhập email của bạn"
                disabled={isLoading}
                {...emailField('email')}
              />
              {emailErrors.email && <p className="field-error">{emailErrors.email.message}</p>}
            </div>
            
            <button type="submit" disabled={isLoading} className={`btn-submit ${isLoading ? 'loading' : ''}`}>
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
              <p>Nhập mã 6 chữ số chúng tôi đã gửi đến<br /><strong>{email}</strong></p>
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
            onSubmit={handleResetSubmit(onResetSubmit)}
            className="forgot-form"
            noValidate
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
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field${resetErrors.newPassword ? ' input-error' : ''}`}
                  placeholder="Nhập mật khẩu mới"
                  disabled={isLoading}
                  {...resetField('newPassword')}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="toggle-password">
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {resetErrors.newPassword
                ? <p className="field-error">{resetErrors.newPassword.message}</p>
                : <p className="hint">Tối thiểu 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt</p>
              }
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input-field${resetErrors.confirmPassword ? ' input-error' : ''}`}
                  placeholder="Xác nhận mật khẩu"
                  disabled={isLoading}
                  {...resetField('confirmPassword')}
                />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="toggle-password">
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {resetErrors.confirmPassword && <p className="field-error">{resetErrors.confirmPassword.message}</p>}
            </div>
            
            <button type="submit" disabled={isLoading} className={`btn-submit ${isLoading ? 'loading' : ''}`}>
              {isLoading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
