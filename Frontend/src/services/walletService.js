// Wallet Service — GET balance, POST top-up
import { store } from '../store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

function getAuthToken() {
  try {
    const state = store.getState();
    if (state?.auth?.token) return state.auth.token;
  } catch (_) {}
  const raw = localStorage.getItem('token');
  if (raw) return raw;
  try {
    const a = JSON.parse(localStorage.getItem('authState') || '{}');
    return a?.token ?? a?.accessToken ?? null;
  } catch (_) {}
  return null;
}

const fetchAPI = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const token = getAuthToken();
    const fetchOptions = {
      signal: controller.signal,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    };

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const err = {
        status: response.status,
        message: data?.message || (typeof data === 'string' ? data : null) || `HTTP ${response.status}`,
        data,
      };
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw { status: 408, message: `Request timeout (${API_TIMEOUT}ms)` };
    }
    if (error instanceof TypeError || String(error.message).includes('Failed to fetch')) {
      throw {
        status: 0,
        message: 'Không kết nối được máy chủ. Kiểm tra backend đã chạy và mạng.',
        details: error.message,
      };
    }
    throw error;
  }
};

/**
 * Lấy số dư ví (GET /api/Wallet/balance).
 * @returns {Promise<{ balance: number }>} — balance có thể từ response.data hoặc response
 */
export const getWalletBalance = async () => {
  const response = await fetchAPI('/api/Wallet/balance', { method: 'GET' });
  const balance = response?.data?.balance ?? response?.balance ?? 0;
  return { balance: Number(balance), raw: response };
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
  const body = typeof payload?.amount === 'number' ? { amount: payload.amount } : payload;
  const response = await fetchAPI('/api/Wallet/top-up', {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
  const d = response?.data ?? response;
  return {
    qrImageUrl: d?.qrImageUrl ?? d?.QrImageUrl ?? '',
    bankName: d?.bankName ?? d?.BankName ?? '',
    accountName: d?.accountName ?? d?.AccountName ?? '',
    accountNumber: d?.accountNumber ?? d?.AccountNumber ?? '',
    amount: Number(d?.amount ?? d?.Amount ?? 0),
    transferContent: d?.transferContent ?? d?.TransferContent ?? '',
  };
};
