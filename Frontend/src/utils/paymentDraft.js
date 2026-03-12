const DRAFT_KEY = 'fiebo_payment_draft_v1';

export function savePaymentDraft(draft) {
  try {
    const payload = { ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    // ignore
  }
}

export function getPaymentDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearPaymentDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

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
  // fallback: TTL 10 minutes since saved
  const saved = draft.savedAt || 0;
  return Date.now() - saved > 1000 * 60 * 10;
}

export default { savePaymentDraft, getPaymentDraft, clearPaymentDraft, isDraftExpired };
