import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'bookedSlots';

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load booked slots', e);
  }
  return {};
};

const initialState = loadInitial();

const bookedSlotsSlice = createSlice({
  name: 'bookedSlots',
  initialState,
  reducers: {
    addBookedSlots: (state, action) => {
      // payload: { venueId, date, slots: [{fieldIdx, slotIdx}, ...], ttlSeconds }
      try {
        // eslint-disable-next-line no-console
        console.debug('[bookedSlotsSlice] addBookedSlots action', action.payload);
      } catch (e) {}
      const { venueId, date, slots, ttlSeconds } = action.payload || {};
      if (!venueId || !date || !Array.isArray(slots)) return;
      state[venueId] = state[venueId] || {};
      state[venueId][date] = state[venueId][date] || [];
      const existing = state[venueId][date];
      const map = new Map();
      existing.forEach((s) => map.set(`${s.fieldIdx}_${s.slotIdx}`, s));

      const expiresAt = ttlSeconds && Number(ttlSeconds) > 0 ? Date.now() + Number(ttlSeconds) * 1000 : null;

      slots.forEach((s) => {
        const key = `${s.fieldIdx}_${s.slotIdx}`;
        if (map.has(key)) {
          // update expiry if provided and later
          const existingEntry = map.get(key);
          if (expiresAt && (!existingEntry.expiresAt || existingEntry.expiresAt < expiresAt)) {
            existingEntry.expiresAt = expiresAt;
          }
        } else {
          existing.push({ fieldIdx: s.fieldIdx, slotIdx: s.slotIdx, expiresAt });
        }
      });
    },
    clearBookedSlotsForVenueDate: (state, action) => {
      const { venueId, date } = action.payload || {};
      if (!venueId) return;
      if (date) {
        if (state[venueId]) delete state[venueId][date];
      } else {
        delete state[venueId];
      }
    },
    // optional: purge expired entries across store
    purgeExpired: (state) => {
      const now = Date.now();
      Object.keys(state).forEach((venueId) => {
        const dates = state[venueId];
        Object.keys(dates).forEach((date) => {
          dates[date] = dates[date].filter((e) => !e.expiresAt || e.expiresAt > now);
          if (dates[date].length === 0) delete dates[date];
        });
        if (Object.keys(dates).length === 0) delete state[venueId];
      });
    },
  },
});

export const { addBookedSlots, clearBookedSlotsForVenueDate, purgeExpired } = bookedSlotsSlice.actions;

export default bookedSlotsSlice.reducer;
