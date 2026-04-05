import { createSlice } from "@reduxjs/toolkit";

/** Dùng khi cần kiểm tra TTL ngoài component (hiện chưa dùng trong app). */
export function isDraftExpired(draft) {
  if (!draft) return true;
  if (draft.expiresAt) {
    try {
      const t = new Date(draft.expiresAt).getTime();
      return Date.now() > t;
    } catch (e) {
      return false;
    }
  }
  const saved = draft.savedAt || 0;
  return Date.now() - saved > 1000 * 60 * 10;
}

const paymentDraftSlice = createSlice({
  name: "paymentDraft",
  initialState: {
    draft: null,
  },
  reducers: {
    setPaymentDraft: (state, action) => {
      const payload = action.payload;
      if (
        !payload ||
        typeof payload !== "object" ||
        (!payload.bookingId &&
          !(payload.venueId && payload.selectedSlots?.length))
      ) {
        state.draft = null;
        return;
      }
      state.draft = { ...payload, savedAt: Date.now() };
    },
    clearPaymentDraft: (state) => {
      state.draft = null;
    },
  },
});

export const { setPaymentDraft, clearPaymentDraft } = paymentDraftSlice.actions;
export const selectPaymentDraft = (state) => state.paymentDraft.draft;

export default paymentDraftSlice.reducer;
