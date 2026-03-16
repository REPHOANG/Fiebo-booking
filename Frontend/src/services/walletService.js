// Wallet Service — GET balance, POST top-up
import api from './api';

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
 * Tạo yêu cầu nạp và trả về thông tin chuyển khoản (QR, tài khoản nhận, số tiền, nội dung).
 * @param {{ amount: number }} payload — amount (VND)
 * @returns {Promise<{
 *   qrImageUrl: string,
 *   bankName: string,
 *   accountName: string,
 *   accountNumber: string,
 *   amount: number,
 *   transferContent: string
 * }>}
 */
export const topUpWallet = async (payload) => {
  const body = typeof payload?.amount === 'number' ? { amount: payload.amount } : payload ?? {};
  const response = await api.post('/api/Wallet/top-up', body);
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
