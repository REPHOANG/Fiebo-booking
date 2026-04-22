import { createSlice } from '@reduxjs/toolkit';

// Chỉ lưu accessToken trong localStorage; user profile được đồng bộ từ API /auth/profile.
export const AUTH_STORAGE_KEY = 'accessToken';
export const REFRESH_STORAGE_KEY = 'refreshToken';

/** Đọc auth từ storage (token), user sẽ được lấy từ API profile. */
function getStoredAuth() {
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (!token) return null;

    return { token, refreshToken };
  } catch {
    return null;
  }
}

const getInitialState = () => {
  const stored = getStoredAuth();
  return {
    user: null,
    token: stored?.token ?? null,
    refreshToken: stored?.refreshToken ?? null,
    isAuthenticated: Boolean(stored?.token),
    profile: null,
    profileLoading: Boolean(stored?.token),
    registrationPending: false,
    registrationEmail: null,
    registrationPhone: null,
    resetEmail: null,
    resetPending: false,
    isLoading: false,
    error: null,
  };
};

export { getStoredAuth };

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
      const nextRefreshToken = action.payload.refreshToken;
      if (nextRefreshToken !== undefined) state.refreshToken = nextRefreshToken;
      
      state.isAuthenticated = Boolean(state.token);
      if (action.payload.user) state.profileLoading = false;
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
      state.refreshToken = null;
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
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.profile = null;
      state.profileLoading = false;
      state.resetEmail = null;
      state.resetPending = false;
      state.isLoading = false;
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