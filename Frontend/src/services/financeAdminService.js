import api from './api';

// ─── Payouts ─────────────────────────────────────────────────────────────────



/**
 * PATCH /api/admin/payouts/{id}/complete
 */
export const completePayout = async (id) => {
  const res = await api.patch(`/api/admin/payouts/${id}/complete`);
  return res.data;
};

/**
 * PATCH /api/admin/payouts/{id}/process
 * Kế toán bắt đầu xử lý payout (Pending → Processing)
 */
export const startProcessingPayout = async (id) => {
  const res = await api.patch(`/api/admin/payouts/${id}/process`);
  return res.data;
};

/**
 * PATCH /api/admin/payouts/{id}/fail
 * Kế toán đánh dấu payout thất bại (Processing → Failed)
 */
export const markPayoutAsFailed = async (id, failureReason) => {
  const res = await api.patch(`/api/admin/payouts/${id}/fail`, { failureReason });
  return res.data;
};

/**
 * PATCH /api/admin/finance/payout-batch/{id}/complete
 */
export const completePayoutBatch = async (id) => {
  const res = await api.patch(`/api/admin/finance/payout-batch/${id}/complete`);
  return res.data;
};

// ─── Withdrawal Requests ──────────────────────────────────────────────────────

const normalizeWithdrawal = (item) => ({
  id: item?.transactionId ?? item?.TransactionId ?? item?.id ?? item?.Id ?? '',
  customerId: item?.customerId ?? item?.CustomerId ?? '',
  customerName: item?.customerName ?? item?.CustomerName ?? item?.customer ?? '',
  bankAccountNumber: item?.bankAccountNumber ?? item?.BankAccountNumber ?? item?.accountNumber ?? item?.AccountNumber ?? '',
  bankName: item?.bankName ?? item?.BankName ?? '',
  accountHolderName: item?.accountHolderName ?? item?.AccountHolderName ?? '',
  walletBalance: Number(item?.walletBalance ?? item?.WalletBalance ?? 0),
  amount: Number(item?.amount ?? item?.Amount ?? 0),
  requestedAt: item?.requestedAt ?? item?.RequestedAt ?? item?.createdAt ?? '',
  processedAt: item?.processedAt ?? item?.ProcessedAt ?? '',
  processedBy: item?.processedBy ?? item?.ProcessedBy ?? '',
  rejectionReason: item?.rejectionReason ?? item?.RejectionReason ?? '',
  description: item?.description ?? item?.Description ?? '',
  status: item?.status ?? item?.Status ?? '',
});

/**
 * GET /api/admin/withdraw-requests
 * Filterable by status, supports pagination
 */
export const getWithdrawalRequests = async ({ status, page = 1, pageSize = 20 } = {}) => {
  const params = { page, pageSize };
  if (status) params.status = status;
  const res = await api.get('/api/admin/withdraw-requests', { params });
  const data = res.data?.data ?? res.data ?? {};
  if (Array.isArray(data)) return { items: data.map(normalizeWithdrawal), totalItems: data.length };
  const items = (data?.items ?? data?.Items ?? []).map(normalizeWithdrawal);
  const totalItems = data?.totalItems ?? data?.TotalItems ?? items.length;
  return { items, totalItems };
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
  const res = await api.patch(`/api/admin/withdraw-requests/${id}/reject`, { rejectionReason: reason });
  return res.data;
};

/**
 * PATCH /api/admin/withdraw-requests/{id}/process
 * Kế toán bắt đầu xử lý (Pending → Processing)
 */
export const startProcessingWithdraw = async (id) => {
  const res = await api.patch(`/api/admin/withdraw-requests/${id}/process`);
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
