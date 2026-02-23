import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  
  // OTP Registration State
  registrationPending: false,
  registrationEmail: null,
  registrationPhone: null,
  
  // Loading states
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authenticated credentials
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
      state.error = null;
      
      // Clear registration state when logging in
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
} = authSlice.actions;

export default authSlice.reducer;
