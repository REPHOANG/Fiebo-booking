// Booking Service - client calls for reservation and confirmation
import { store } from '../store';
import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

function getAuthToken() {
  return store.getState()?.auth?.token ?? null;
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

    // Debug log for outgoing token and Authorization header
    // eslint-disable-next-line no-console
    console.debug('[bookingService] fetchAPI', {
      endpoint,
      token,
      authorizationHeader: fetchOptions.headers.Authorization,
      headers: fetchOptions.headers,
    });

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
      console.error('[bookingService] request failed', { url, status: response.status, data: err.data });
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw { status: 408, message: `Request timeout (${API_TIMEOUT}ms)` };
    }
    if (error instanceof TypeError || String(error.message).includes('Failed to fetch')) {
      const url = `${API_BASE_URL}${endpoint}`;
      console.error('[bookingService] network error — backend unreachable', {
        url,
        hint: 'Kiểm tra backend đã chạy (ví dụ http://localhost:8080) và CORS.',
      });
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
 * Booking API chỉ còn 2 endpoint:
 * 1. POST /api/Booking — giữ slot, tạo booking Pending, trả về bookingId và expiredAt
 * 2. POST /api/Booking/{bookingId}/payment — thanh toán đặt chỗ bằng ví
 */

/**
 * Giữ slot và tạo booking Pending.
 * Payload: { venueId, bookingDate, fullname, phoneNumber, bookingNote?, details: [{ fieldId, slotId }] }
 * Trả về: { bookingId, expiredAt, totalPrice, bookingStatus }
 */
export const createBooking = async (payload) => {
  const response = await fetchAPI('/api/Booking', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

/**
 * Thanh toán đặt chỗ bằng ví (Complete booking payment using customer's wallet).
 * @param {number|string} bookingId
 * @param {Object} payload e.g. { paymentMethod: 'wallet' }
 */
export const payBooking = async (bookingId, payload) => {
  const response = await fetchAPI(`/api/Booking/${bookingId}/payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

/**
 * Notify backend webhook about completed payment.
 * This calls POST /api/webhook/payment with a small payload.
 */
export const callPaymentWebhook = async (bookingId, payload = {}) => {
  const body = { bookingId, ...payload };
  const response = await fetchAPI('/api/webhook/payment', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data ?? response;
};

/**
 * Lấy chi tiết đặt chỗ theo id (GET /api/Booking/{id}).
 */
export const getBookingById = async (bookingId) => {
  const response = await fetchAPI(`/api/Booking/${bookingId}`, { method: 'GET' });
  return response.data ?? response;
};

/**
 * Lấy lịch sử đặt sân của user (GET /api/Booking/history).
 * @param {Object} params - { pageNumber, pageSize, fromDate?, toDate? }
 * @returns {Promise<{ page, pageSize, totalItems, items }>} items: [{ bookingId, status, bookingDate, venueName, address, province, ward, venueId }]
 */
export const getBookingHistory = async (params = {}) => {
  const sp = new URLSearchParams();
  if (params.pageNumber != null) sp.set('pageNumber', params.pageNumber);
  if (params.pageSize != null) sp.set('pageSize', params.pageSize);
  if (params.fromDate != null) sp.set('fromDate', params.fromDate);
  if (params.toDate != null) sp.set('toDate', params.toDate);
  const query = sp.toString();
  const response = await fetchAPI(`/api/Booking/history${query ? `?${query}` : ''}`, { method: 'GET' });
  const data = response.data ?? response;
  const items = data?.items ?? data?.Items ?? [];
  const totalItems = data?.totalItems ?? data?.TotalItems ?? items.length;
  const page = data?.page ?? data?.Page ?? 1;
  const pageSize = data?.pageSize ?? data?.PageSize ?? 10;
  return { page, pageSize, totalItems, items: Array.isArray(items) ? items : [] };
};

export const getCancelBookingPreview = async (id) => {
  const response = await api.get(`/api/booking/${id}/cancel-preview`);
  return response.data.data ?? response;
}

export const cancelBookingApi = async (id) => {
  const response = api.post(`/api/booking/${id}/cancel`);
  return response.data.data ?? response;
}

export default {
  createBooking,
  payBooking,
  getBookingById,
  getBookingHistory,
};
