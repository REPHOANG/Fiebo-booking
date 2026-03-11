import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'bookingDrafts';

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load booking drafts', e);
  }
  return {};
};

const initialState = loadInitial();

const bookingDraftSlice = createSlice({
  name: 'bookingDrafts',
  initialState,
  reducers: {
    setDraft: (state, action) => {
      // payload: { venueId, draft }
      const { venueId, draft } = action.payload;
      if (!venueId) return;
      state[venueId] = draft;
    },
    clearDraft: (state, action) => {
      const venueId = action.payload;
      if (!venueId) return;
      delete state[venueId];
    },
  },
});

export const { setDraft, clearDraft } = bookingDraftSlice.actions;

export default bookingDraftSlice.reducer;
