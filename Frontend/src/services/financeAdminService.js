import api from './api';

// ─── Payouts ─────────────────────────────────────────────────────────────────

const normalizePayout = (item) => ({
  id: item?.id ?? item?.Id ?? '',
  ownerName: item?.ownerName ?? item?.OwnerName ?? item?.owner ?? '',
  venueName: item?.venueName ?? item?.VenueName ?? item?.venue ?? '',
  amount: Number(item?.amount ?? item?.Amount ?? 0),
  status: item?.status ?? item?.Status ?? '',
  year: item?.year ?? item?.Year ?? null,
  month: item?.month ?? item?.Month ?? null,
  processedBy: item?.processedBy ?? item?.ProcessedBy ?? null,
  processedAt: item?.processedAt ?? item?.ProcessedAt ?? null,
});

/**
 * GET /api/admin/payouts
 * Filterable by status, year, month
 */
export const getOwnerPayouts = async ({ status, year, month } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (year)   params.year   = year;
  if (month)  params.month  = month;
  const res = await api.get('/api/admin/payouts', { params });
  const data = res.data?.data ?? res.data ?? [];
  const items = Array.isArray(data) ? data : data?.items ?? [];
  return items.map(normalizePayout);
};

/**
 * PATCH /api/admin/payouts/{id}/complete
 */
export const completePayout = async (id) => {
  const res = await api.patch(`/api/admin/payouts/${id}/complete`);
  return res.data;
};

// ─── Withdrawal Requests ──────────────────────────────────────────────────────

const normalizeWithdrawal = (item) => ({
  id: item?.id ?? item?.Id ?? '',
  customerName: item?.customerName ?? item?.CustomerName ?? item?.customer ?? '',
  bankAccountNumber: item?.bankAccountNumber ?? item?.BankAccountNumber ?? '',
  bankName: item?.bankName ?? item?.BankName ?? '',
  walletBalance: Number(item?.walletBalance ?? item?.WalletBalance ?? 0),
  amount: Number(item?.amount ?? item?.Amount ?? 0),
  requestedAt: item?.requestedAt ?? item?.RequestedAt ?? item?.createdAt ?? '',
  status: item?.status ?? item?.Status ?? '',
});

/**
 * GET /api/admin/withdraw-requests
 * Filterable by status
 */
export const getWithdrawalRequests = async ({ status } = {}) => {
  const params = {};
  if (status) params.status = status;
  const res = await api.get('/api/admin/withdraw-requests', { params });
  const data = res.data?.data ?? res.data ?? [];
  const items = Array.isArray(data) ? data : data?.items ?? [];
  return items.map(normalizeWithdrawal);
};

/**
 * GET /api/admin/withdraw-requests/{id}
 */
export const getWithdrawalRequestDetail = async (id) => {
  const res = await api.get(`/api/admin/withdraw-requests/${id}`);
  const data = res.data?.data ?? res.data ?? {};
  return normalizeWithdrawal(data);
};

/**
 * PATCH /api/admin/withdraw-requests/{id}/complete
 */
export const completeWithdrawalRequest = async (id) => {
  const res = await api.patch(`/api/admin/withdraw-requests/${id}/complete`);
  return res.data;
};

/**
 * PATCH /api/admin/withdraw-requests/{id}/reject
 * @param {string|number} id
 * @param {string} reason — required
 */
export const rejectWithdrawalRequest = async (id, reason) => {
  const res = await api.patch(`/api/admin/withdraw-requests/${id}/reject`, { reason });
  return res.data;
};

// ─── Finance Transactions & Payout Batches (New API) ──────────

export const getTransactions = async (params) => {
  const res = await api.get('/api/admin/finance/transactions', { params });
  return res.data?.data ?? res.data;
};

export const getTransactionDetail = async (id) => {
  const res = await api.get(`/api/admin/finance/transaction/${id}`);
  return res.data?.data ?? res.data;
};

export const getPayoutBatches = async (params) => {
  const res = await api.get('/api/admin/finance/payout-batches', { params });
  return res.data?.data ?? res.data;
};

export const getPayoutsInBatch = async (batchId, params) => {
  const res = await api.get(`/api/admin/finance/payout-batch/${batchId}/payouts`, { params });
  return res.data?.data ?? res.data;
};

export const getPayoutDetail = async (payoutId) => {
  const res = await api.get(`/api/admin/finance/payout/${payoutId}`);
  return res.data?.data ?? res.data;
};
