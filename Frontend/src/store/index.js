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


export default store;
