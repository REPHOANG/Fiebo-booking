import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { login } from '../../services/authService';
import { toast } from 'react-toastify';
import fieboLogo from '../../assets/images/Logo với chữ.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './Login.css';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      toast.error('Email/Phone and password are required');
      return;
    }

    setIsLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const idType = emailRegex.test(formData.identifier) ? 'email' : 'phone';
      const payload = idType === 'email'
        ? { email: formData.identifier, password: formData.password }
        : { phone: formData.identifier, password: formData.password };

      const response = await login(payload);
      dispatch(setCredentials({ user: response.user, token: response.accessToken || response.token }));
      toast.success('Đăng nhập cho chủ sân thành công');
      navigate('/owner');
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

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-group">
              <label htmlFor="identifier">Email hoặc Số điện thoại</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                className="input-field"
                placeholder="Nhập email hoặc số điện thoại"
                value={formData.identifier}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field"
                  placeholder="Nhập mật khẩu"
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

          <button type="submit" className={`login-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="signup-prompt">
            <span>Muốn đăng nhập tài khoản khách? </span>
            <Link to="/login" className="signup-link">Chuyển sang</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerLogin;
