// src/pages/ForgotPassword.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { OPEN_AUTH_STATE_KEY } from '../../context/AuthModalContext';
import './ForgotPassword.css';

const goCustomerHomeLogin = (navigate) =>
  navigate('/', { state: { [OPEN_AUTH_STATE_KEY]: 'login' } });

// ── Yup schemas ───────────────────────────────────────────────────────────
const accountSchema = yup.object({
  account: yup
    .string()
    .required('Vui lòng nhập email hoặc số điện thoại')
    .test('email-or-phone', 'Email hoặc số điện thoại không hợp lệ', (val) => {
      if (!val) return false;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const phoneOk = /^[0-9]{9,11}$/.test(val.replace(/\D/g, ''));
      return emailOk || phoneOk;
    }),
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
  const [account, setAccount] = useState('');
  const [resetToken, setResetToken] = useState(null);

  // OTP boxes state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpValue, setOtpValue] = useState('');
  const otpRefs = useRef([]);

  // 60s resend cooldown
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const startCooldown = useCallback(() => {
    setCooldown(60);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => clearInterval(cooldownRef.current);
  }, []);

  // ── Step 1 form (account: email or phone) ──
  const {
    register: accountField,
    handleSubmit: handleAccountSubmit,
    formState: { errors: accountErrors },
  } = useForm({ resolver: yupResolver(accountSchema), mode: 'onTouched' });

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

  // ── Helper: detect if input is email ──
  const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // ── Step 1: Request reset ──
  const onAccountSubmit = async (data) => {
    setIsLoading(true);
    try {
      await requestPasswordReset(data.account);
      setAccount(data.account);
      startCooldown();
      const destination = isEmail(data.account) ? data.account : 'email liên kết với SĐT của bạn';
      toast.success(`Mã xác minh đã được gửi đến ${destination}!`);
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
      const response = await verifyResetOTP(account, otpValue);
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
        account,
        resetToken,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      toast.success('Đặt lại mật khẩu thành công!');
      goCustomerHomeLogin(navigate);
    } catch (error) {
      toast.error(error.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = () => {
    if (step > 1) setStep(step - 1);
    else goCustomerHomeLogin(navigate);
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      await requestPasswordReset(account);
      startCooldown();
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
            onSubmit={handleAccountSubmit(onAccountSubmit)}
            className="forgot-form"
            noValidate
          >
            <div className="step-info">
              <h3>Nhập Email hoặc Số Điện Thoại</h3>
              <p>Chúng tôi sẽ gửi mã xác minh (OTP) đến email liên kết với tài khoản của bạn</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="account">Email hoặc Số điện thoại</label>
              <input
                id="account"
                type="text"
                className={`input-field${accountErrors.account ? ' input-error' : ''}`}
                placeholder="Nhập email hoặc số điện thoại"
                disabled={isLoading}
                {...accountField('account')}
              />
              {accountErrors.account && <p className="field-error">{accountErrors.account.message}</p>}
            </div>
            
            <button type="submit" disabled={isLoading} className={`btn-submit ${isLoading ? 'loading' : ''}`}>
              {isLoading ? 'Đang gửi...' : 'Gửi mã xác minh'}
            </button>
            
            <div className="form-footer">
              <span>Nhớ mật khẩu của bạn? </span>
              <Link
                to="/"
                className="link"
                state={{ [OPEN_AUTH_STATE_KEY]: 'login' }}
              >
                Đăng nhập
              </Link>
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
              <p>Nhập mã 6 chữ số chúng tôi đã gửi đến email của<br /><strong>{account}</strong></p>
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
                disabled={isLoading || cooldown > 0}
                className="btn-resend"
              >
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
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
