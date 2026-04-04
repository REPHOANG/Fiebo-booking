import { createSlice } from "@reduxjs/toolkit";

export const PAYMENT_DRAFT_STORAGE_KEY = "fiebo_payment_draft_v1";

function readDraftFromStorage() {
  try {
    const raw = localStorage.getItem(PAYMENT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function writeDraftToStorage(draft) {
  try {
    if (draft == null) {
      localStorage.removeItem(PAYMENT_DRAFT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(PAYMENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

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
    draft: readDraftFromStorage(),
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
        writeDraftToStorage(null);
        return;
      }
      const next = { ...payload, savedAt: Date.now() };
      state.draft = next;
      writeDraftToStorage(next);
    },
    clearPaymentDraft: (state) => {
      state.draft = null;
      writeDraftToStorage(null);
    },
  },
});

export const { setPaymentDraft, clearPaymentDraft } = paymentDraftSlice.actions;
export const selectPaymentDraft = (state) => state.paymentDraft.draft;

export default paymentDraftSlice.reducer;
