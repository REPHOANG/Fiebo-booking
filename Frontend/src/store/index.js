import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer
  }
});

// Subscribe to store changes and save to localStorage
store.subscribe(() => {
  const state = store.getState();
  try {
    localStorage.setItem('authState', JSON.stringify(state.auth));
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
});

export default store;
