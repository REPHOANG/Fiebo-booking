import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookingDraftReducer from './bookingDraftSlice';
import bookedSlotsReducer from './bookedSlotsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookingDrafts: bookingDraftReducer,
    bookedSlots: bookedSlotsReducer,
  }
});

// Subscribe to store changes and save to localStorage
// Persist auth and bookingDrafts to localStorage
store.subscribe(() => {
  const state = store.getState();
  try {
    localStorage.setItem('authState', JSON.stringify(state.auth));
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
  try {
    localStorage.setItem('bookingDrafts', JSON.stringify(state.bookingDrafts || {}));
  } catch (e) {
    console.error('Failed to save booking drafts:', e);
  }
  try {
    localStorage.setItem('bookedSlots', JSON.stringify(state.bookedSlots || {}));
  } catch (e) {
    console.error('Failed to save booked slots:', e);
  }
});

export default store;
