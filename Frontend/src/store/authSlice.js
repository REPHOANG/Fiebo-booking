import { createSlice } from '@reduxjs/toolkit';

// helper function to load initial state from localStorage
// This function attempts to load the auth state from localStorage and parse it.
// chức năng: cố gắng tải trạng thái auth từ localStorage và phân tích nó.
const getInitialState = () => {

  return {
    user: null,
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
};

const initialState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authenticated credentials
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      
      // xóa thông tin đăng ký tạm thời nếu có
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
  restoreAuthFromStorage,
} = authSlice.actions;

export default authSlice.reducer;