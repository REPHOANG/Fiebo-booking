import { createSlice } from '@reduxjs/toolkit';

// Key ít gợi ý, không dùng tên "authState" để không lộ trong localStorage
const AUTH_STORAGE_KEY = '_fs';

function encodeAuthStorage(payload) {
  try {
    const json = JSON.stringify(payload);
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
}

function decodeAuthStorage(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const json = decodeURIComponent(atob(raw));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Decode JWT payload (không verify chữ ký). */
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
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
}

/** Kiểm tra accessToken đã hết hạn chưa (exp trong JWT là seconds since epoch). */
export function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || payload.exp == null) return true;
  const expMs = payload.exp * 1000;
  const nowMs = Date.now();
  return expMs < nowMs;
}

// Load auth from localStorage; nếu token hết hạn thì không restore và xóa storage.
const getInitialState = () => {
  const base = {
    user: null,
    token: null,
    isAuthenticated: false,
    profile: null,
    profileLoading: false,
    registrationPending: false,
    registrationEmail: null,
    registrationPhone: null,
    resetEmail: null,
    resetPending: false,
    isLoading: false,
    error: null,
  };
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const data = raw ? decodeAuthStorage(raw) : null;
    if (!data) return base;
    const token = data?.token ?? data?.accessToken ?? null;
    if (!token) return base;
    if (isTokenExpired(token)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('accessToken');
      return base;
    }
    return {
      ...base,
      user: data?.user ?? null,
      token,
      isAuthenticated: true,
    };
  } catch {
    return base;
  }
};

/** Đọc auth đã lưu từ storage (đã decode), dùng cho ProtectedRoute và các service lấy token. */
function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? decodeAuthStorage(raw) : null;
  } catch {
    return null;
  }
}

export { AUTH_STORAGE_KEY, encodeAuthStorage, getStoredAuth };

const initialState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authenticated credentials (token optional so getProfile can refresh user without clearing token)
    setCredentials: (state, action) => {
      state.user = action.payload.user ?? state.user;
      const nextToken = action.payload.token ?? action.payload.accessToken;
      if (nextToken !== undefined) state.token = nextToken;
      state.isAuthenticated = true;
      state.error = null;
      state.registrationPending = false;
      state.registrationEmail = null;
      state.registrationPhone = null;
    },

    // Set registration pending (waiting for OTP)
    setRegistrationPending: (state, action) => {
      state.registrationPending = true;
      state.registrationEmail = action.payload.email;
      state.registrationPhone = action.payload.phone;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },

    // Clear registration pending
    clearRegistrationPending: (state) => {
      state.registrationPending = false;
      state.registrationEmail = null;
      state.registrationPhone = null;
    },

    // Logout
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.registrationPending = false;
      state.registrationEmail = null;
      state.registrationPhone = null;
    },

    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set profile
    setProfile: (state, action) => {
      state.profile = action.payload;
      state.profileLoading = false;
    },

    // Set profile loading
    setProfileLoading: (state, action) => {
      state.profileLoading = action.payload;
    },

    // Update profile
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
      state.user = { ...state.user, ...action.payload };
    },

    // Set reset email (for forgot password)
    setResetEmail: (state, action) => {
      state.resetEmail = action.payload;
      state.resetPending = true;
    },

    // Clear reset state
    clearResetState: (state) => {
      state.resetEmail = null;
      state.resetPending = false;
    },

  },
});

export const {
  setCredentials,
  setRegistrationPending,
  clearRegistrationPending,
  logout,
  setLoading,
  setError,
  clearError,
  setProfile,
  setProfileLoading,
  updateProfile,
  setResetEmail,
  clearResetState,
} = authSlice.actions;

export default authSlice.reducer;