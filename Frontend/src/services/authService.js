// Frontend Authentication Service - Connected to Backend API
import api from './api';

// .NET ClaimTypes URIs used by backend
const CLAIM_NAME = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const CLAIM_ROLE = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getErrorPayload = (error) => ({
  status: error.response?.status,
  message: error.response?.data?.message ?? error.message,
  data: error.response?.data,
});

// Register new user - returns pending state waiting for OTP verification
export const register = async (data) => {
  try {
    const response = await api.post('/api/auth/register', {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: data.password,
      confirmPassword: data.confirmPassword,
      dateOfBirth: data.dateOfBirth,
    });
    const res = response.data;
    return {
      success: true,
      message: res.message,
      email: data.email,
      phone: data.phoneNumber,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    let errorMessage = payload.message || 'Registration failed';
    if (payload.data?.errors) {
      const errors = Object.values(payload.data.errors);
      if (Array.isArray(errors) && errors.length > 0) errorMessage = errors[0];
    } else if (payload.data?.message) errorMessage = payload.data.message;
    throw { message: errorMessage, details: errorMessage };
  }
};

// Verify OTP and activate account
export const verifyOTP = async (email, otp) => {
  try {
    const response = await api.post('/api/Auth/verify-otp', { email, otpCode: otp });
    const res = response.data;
    return {
      success: true,
      message: res.message,
      statusCode: res.statusCode || 200,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.message || 'OTP verification failed',
      details: payload.data?.message ?? payload.message,
      status: payload.status,
    };
  }
};

// Login with email or phone
export const login = async (credentials) => {
  try {
    const emailOrPhone = credentials.email || credentials.phone;
    const response = await api.post('/api/auth/login', {
      emailOrPhone,
      password: credentials.password,
    });
    const res = response.data;
    const token = res.data ?? res.accessToken ?? res.token ?? res.jwtToken;
    if (!token) throw { message: 'No token in response' };

    const decodedToken = decodeJWT(token);
    return {
      user: {
        id: decodedToken?.sub ?? decodedToken?.userId ?? decodedToken?.id ?? 'unknown',
        email: decodedToken?.email ?? credentials.email ?? 'user@example.com',
        phone: decodedToken?.phone ?? decodedToken?.phoneNumber ?? credentials.phone ?? '',
        name:
          decodedToken?.[CLAIM_NAME] ??
          decodedToken?.name ??
          decodedToken?.fullName ??
          decodedToken?.username ??
          credentials.email?.split('@')[0] ??
          'User',
        role: decodedToken?.[CLAIM_ROLE] ?? decodedToken?.role ?? 'customer',
        status: decodedToken?.status ?? 'active',
      },
      accessToken: token,
      token,
      expiresIn: res.expiresIn,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    if (payload.status === 401) throw { message: 'Invalid credentials' };
    if (payload.status === 404) throw { message: 'User not found' };
    throw { message: payload.data?.message ?? payload.message ?? 'Login failed' };
  }
};

// Login with Google OAuth
export const loginWithGoogle = async (credential) => {
  try {
    const response = await api.post('/api/auth/google-login', { idToken: credential });
    const res = response.data;
    const token = res.data ?? res.accessToken ?? res.token;
    if (!token) throw { message: 'No token in Google login response' };

    const decodedToken = decodeJWT(token);
    return {
      user: {
        id: decodedToken?.sub ?? decodedToken?.userId ?? 'unknown',
        email: decodedToken?.email ?? '',
        name:
          decodedToken?.[CLAIM_NAME] ??
          decodedToken?.name ??
          decodedToken?.fullName ??
          '',
        role: decodedToken?.[CLAIM_ROLE] ?? decodedToken?.role ?? 'customer',
        status: decodedToken?.status ?? 'active',
      },
      accessToken: token,
      token,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw { message: payload.data?.message ?? payload.message ?? 'Google login failed' };
  }
};

// Refresh access token using refresh token
export const refreshToken = async (token) => {
  try {
    const response = await api.post('/api/auth/refresh', { refreshToken: token }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = response.data;
    return {
      accessToken: res.accessToken ?? res.token,
      expiresIn: res.expiresIn,
    };
  } catch (error) {
    throw { message: getErrorPayload(error).message ?? 'Token refresh failed' };
  }
};

// Logout (optional - could also just clear local state)
export const logout = async (token) => {
  try {
    await api.post('/api/auth/logout', {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { success: true };
  } catch {
    return { success: true };
  }
};

// Get user profile
export const getProfile = async () => {
  try {
    const response = await api.get('/api/auth/profile');
    return response.data?.data ?? response.data;
  } catch {
    return undefined;
  }
};

// Update user profile
export const updateProfile = async (profileData) => {
  try {
    const payload = {
      fullName: profileData.fullName ?? null,
      phoneNumber:
        profileData.phoneNumber && String(profileData.phoneNumber).trim() !== ''
          ? profileData.phoneNumber
          : null,
      dateOfBirth:
        profileData.dateOfBirth && String(profileData.dateOfBirth).trim() !== ''
          ? profileData.dateOfBirth.trim().slice(0, 10)
          : null,
    };
    const response = await api.put('/api/auth/profile', payload);
    const data = response.data?.data ?? response.data;
    return {
      success: true,
      message: data?.message,
      user: data?.user ?? payload,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.data?.message ?? payload.message ?? 'Failed to update profile',
      status: payload.status,
    };
  }
};

// Change password
export const changePassword = async (passwordData) => {
  try {
    const { data } = await api.post('/api/auth/change-password', {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword,
    });
    return { success: true, message: data?.message };
  } catch (error) {
    const payload = getErrorPayload(error);
    if (payload.status === 401) throw { message: 'Current password is incorrect' };
    throw { message: payload.data?.message ?? payload.message ?? 'Failed to change password' };
  }
};

// Request password reset (forgot-password)
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/api/auth/forgot-password', { account: email });
    return {
      success: true,
      message: response.data?.message ?? 'Reset link sent to your email',
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.data?.message ?? payload.message ?? 'Failed to request password reset',
      status: payload.status,
    };
  }
};

// Verify reset OTP
export const verifyResetOTP = async (email, otp) => {
  try {
    const response = await api.post('/api/auth/verify-reset-otp', {
      account: email,
      otpCode: otp,
    });
    const res = response.data;
    return {
      success: true,
      message: res.message,
      resetToken:
        res.data?.resetToken ?? res.data?.token ?? res.resetToken ?? res.token,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.data?.message ?? payload.message ?? 'OTP verification failed',
      status: payload.status,
    };
  }
};

// Step 1: Send OTP to phone number for login
export const sendPhoneLoginOtp = async (phoneNumber) => {
  try {
    const response = await api.post('/api/auth/phone-login', { phoneNumber });
    return {
      success: true,
      message: response.data?.message ?? 'OTP đã được gửi đến số điện thoại của bạn',
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.data?.message ?? payload.message ?? 'Không thể gửi mã OTP',
      status: payload.status,
    };
  }
};

// Step 2: Verify OTP and get JWT token
export const verifyPhoneLoginOtp = async (phoneNumber, otpCode) => {
  try {
    const response = await api.post('/api/auth/phone-login/verify', {
      phoneNumber,
      otpCode,
    });
    const res = response.data;
    const token = res.data ?? res.accessToken ?? res.token;
    if (!token) throw { message: 'No token in response' };

    const decodedToken = decodeJWT(token);
    return {
      user: {
        id: decodedToken?.sub ?? decodedToken?.userId ?? decodedToken?.id ?? 'unknown',
        email: decodedToken?.email ?? '',
        phone: decodedToken?.phone ?? decodedToken?.phoneNumber ?? phoneNumber,
        name:
          decodedToken?.[CLAIM_NAME] ??
          decodedToken?.name ??
          decodedToken?.fullName ??
          'User',
        role: decodedToken?.[CLAIM_ROLE] ?? decodedToken?.role ?? 'customer',
        status: decodedToken?.status ?? 'active',
      },
      accessToken: token,
      token,
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.data?.message ?? payload.message ?? 'Xác thực OTP thất bại',
      status: payload.status,
    };
  }
};

// Reset password
export const resetPassword = async (resetPasswordData) => {
  try {
    const response = await api.post('/api/auth/reset-password', {
      resetToken: resetPasswordData.resetToken,
      newPassword: resetPasswordData.newPassword,
    });
    return {
      success: true,
      message: response.data?.message ?? 'Password reset successfully',
    };
  } catch (error) {
    const payload = getErrorPayload(error);
    throw {
      message: payload.data?.message ?? payload.message ?? 'Failed to reset password',
      status: payload.status,
    };
  }
};
