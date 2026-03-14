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

// NOTE: Previously we persisted slices to localStorage here.
// That behavior was removed to avoid duplicating state (Redux is the source of truth).

export default store;
