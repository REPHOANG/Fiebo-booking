import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookingDraftReducer from './bookingDraftSlice';
import bookedSlotsReducer from './bookedSlotsSlice';
import paymentDraftReducer from './paymentDraftSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookingDrafts: bookingDraftReducer,
    bookedSlots: bookedSlotsReducer,
    paymentDraft: paymentDraftReducer,
  }
});


export default store;
