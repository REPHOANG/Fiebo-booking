import { createSlice } from '@reduxjs/toolkit';

// Restore auth state from localStorage
const getInitialState = () => {
  try {
    const savedAuth = localStorage.getItem('authState');
    if (savedAuth) {
      return JSON.parse(savedAuth);
    }
  } catch (error) {
    console.error('Failed to restore auth state:', error);
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    
    // User Profile State
    profile: null,
    profileLoading: false,
    
    // OTP Registration State
    registrationPending: false,
    registrationEmail: null,
    registrationPhone: null,
    
    // Password Reset State
    resetEmail: null,
    resetPending: false,
    
    // Loading states
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

    // Restore auth from localStorage (for hydration)
    restoreAuthFromStorage: (state) => {
      try {
        const savedAuth = localStorage.getItem('authState');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          if (parsed.user && parsed.token) {
            state.user = parsed.user;
            state.token = parsed.token;
            state.isAuthenticated = true;
            console.log('✅ Auth restored from localStorage:', parsed.user.email);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to restore auth from localStorage:', error);
      }
      // Reset if restore fails
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
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
