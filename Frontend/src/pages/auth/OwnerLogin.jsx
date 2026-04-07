import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { setCredentials, AUTH_STORAGE_KEY } from '../../store/authSlice';
import { login } from '../../services/authService';
import { toast } from 'react-toastify';
import fieboLogo from '../../assets/images/Logo với chữ.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './Login.css';
import { OPEN_AUTH_STATE_KEY } from '../../context/AuthModalContext';
import { getHomePathByRole } from '../../utils/roleUtils';

const ownerLoginSchema = yup.object({
  identifier: yup
    .string()
    .required('Vui lòng nhập email hoặc số điện thoại')
    .test('email-or-phone', 'Email hoặc số điện thoại không hợp lệ', (val) => {
      if (!val) return false;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const phoneOk = /^[0-9]{9,11}$/.test(val.replace(/\D/g, ''));
      return emailOk || phoneOk;
    }),
  password: yup.string().required('Vui lòng nhập mật khẩu'),
});

const OwnerLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(ownerLoginSchema),
    mode: 'onTouched',
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async ({ identifier, password }) => {
    setIsLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const idType = emailRegex.test(identifier) ? 'email' : 'phone';
      const payload =
        idType === 'email'
          ? { email: identifier, password }
          : { phone: identifier, password };

      const response = await login(payload);
      const token = response.accessToken || response.token;
      dispatch(setCredentials({ user: response.user, token }));
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      toast.success('Đăng nhập cho chủ sân thành công');
      navigate(getHomePathByRole(response.user), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <button type="button" className="back-home-btn" onClick={() => navigate('/home')}>Quay về Home</button>
        <div className="login-header">
          <img src={fieboLogo} alt="Fiebo Logo" className="login-logo" />
          <h3 className="login-subtitle">Đăng nhập - Quản lí sân của bạn</h3>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <div className="input-group">
              <label htmlFor="identifier">Email hoặc Số điện thoại</label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                className="input-field"
                placeholder="Nhập email hoặc số điện thoại"
                disabled={isLoading}
                {...register('identifier')}
              />
              {errors.identifier && (
                <span className="error-message" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                  {errors.identifier.message}
                </span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field"
                  placeholder="Nhập mật khẩu"
                  disabled={isLoading}
                  {...register('password')}
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
              {errors.password && (
                <span className="error-message" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                  {errors.password.message}
                </span>
              )}
            </div>
          </div>

          <button type="submit" className={`login-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="signup-prompt">
            <span>Muốn đăng nhập tài khoản khách? </span>
            <Link
              to="/"
              className="signup-link"
              state={{ [OPEN_AUTH_STATE_KEY]: 'login' }}
            >
              Chuyển sang
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerLogin;
