// Wallet Service — GET balance, POST top-up
import api from './api';

export const BANK_ACCOUNTS_QUERY_KEY = ['bank-accounts'];

/**
 * Lấy số dư ví (GET /api/Wallet/balance).
 * @returns {Promise<{ balance: number }>} — balance có thể từ response.data hoặc response
 */
export const getWalletBalance = async () => {
  const response = await api.get('/api/Wallet/balance');
  const data = response.data?.data ?? response.data;
  const balance = data?.balance ?? data?.Balance ?? 0;
  return { balance: Number(balance), raw: response.data };
};

/**
 * Nạp tiền vào ví (POST /api/Wallet/top-up).
 * Tạo yêu cầu nạp và trả về top-up id.
 * @param {{ amount: number }} payload — amount (VND)
 * @returns {Promise<{ id: string | number }>}
 */
export const topUpWallet = async (payload) => {
  const body = typeof payload?.amount === 'number' ? { amount: payload.amount } : payload ?? {};
  const response = await api.post('/api/Wallet/top-up', body);
  const d = response.data?.data ?? response.data ?? {};
  return {
    id: d?.id ?? d?.Id ?? d?.topUpId ?? d?.TopUpId,
  };
};

/**
 * Lấy thông tin nạp ví theo top-up id (GET /api/wallet/top-up/{id}).
 * @param {string | number} id
 * @returns {Promise<{
 *   qrImageUrl: string,
 *   bankName: string,
 *   accountName: string,
 *   accountNumber: string,
 *   amount: number,
 *   transferContent: string
 * }>} 
 */
export const getTopUpDetail = async (id) => {
  const response = await api.get(`/api/wallet/top-up/${id}`);
  const d = response.data?.data ?? response.data ?? {};
  return {
    qrImageUrl: d?.qrImageUrl ?? d?.QrImageUrl ?? '',
    bankName: d?.bankName ?? d?.BankName ?? '',
    accountName: d?.accountName ?? d?.AccountName ?? '',
    accountNumber: d?.accountNumber ?? d?.AccountNumber ?? '',
    amount: Number(d?.amount ?? d?.Amount ?? 0),
    transferContent: d?.transferContent ?? d?.TransferContent ?? '',
  };
};
export const walletHistoryApi = async (page, size, from, to) => {
  const params = { page, size, from, to };
  const response = await api.get('/api/Wallet/transactions', { params });;
  return response.data.data;
};

const normalizeBankAccount = (account) => ({
  id: Number(account?.id ?? account?.Id ?? 0),
  bankName: account?.bankName ?? account?.BankName ?? '',
  accountNumber: account?.accountNumber ?? account?.AccountNumber ?? '',
  accountHolderName: account?.accountHolderName ?? account?.AccountHolderName ?? '',
});

export const getBankAccounts = async () => {
  const response = await api.get('/api/Wallet/bank-accounts');
  const data = response.data?.data ?? response.data ?? [];
  const items = Array.isArray(data) ? data : [];
  return items.map(normalizeBankAccount);
};

export const createBankAccount = async (payload) => {
  const response = await api.post('/api/Wallet/bank-accounts', {
    bankName: payload.bankName,
    accountNumber: payload.accountNumber,
    accountHolderName: payload.accountHolderName,
  });
  return normalizeBankAccount(response.data?.data ?? response.data ?? {});
};

export const updateBankAccount = async (id, payload) => {
  await api.put(`/api/Wallet/bank-accounts/${id}`, {
    bankName: payload.bankName,
    accountNumber: payload.accountNumber,
    accountHolderName: payload.accountHolderName,
  });
};

export const deleteBankAccount = async (id) => {
  await api.delete(`/api/Wallet/bank-accounts/${id}`);
};

export const withdrawWallet = async (payload) => {
  const response = await api.post('/api/Wallet/withdraw', {
    amount: Number(payload.amount),
    bankAccountId: Number(payload.bankAccountId),
  });
  const data = response.data?.data ?? response.data ?? {};
  return {
    transactionId: data?.transactionId ?? data?.TransactionId ?? null,
    amount: Number(data?.amount ?? data?.Amount ?? 0),
    remainingBalance: Number(data?.remainingBalance ?? data?.RemainingBalance ?? 0),
    status: data?.status ?? data?.Status ?? '',
    message: data?.message ?? data?.Message ?? 'Rút tiền thành công.',
  };
};