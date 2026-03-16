// Booking Service - client calls for reservation and confirmation
import api from './api';

/**
 * Giữ slot và tạo booking Pending.
 * Payload: { venueId, bookingDate, fullname, phoneNumber, bookingNote?, details: [{ fieldId, slotId }] }
 * Trả về: { bookingId, expiredAt, totalPrice, bookingStatus }
 */
export const createBooking = async (payload) => {
  const response = await api.post('/api/Booking', payload);
  return response.data?.data ?? response.data ?? response;
};

/**
 * Thanh toán đặt chỗ bằng ví (Complete booking payment using customer's wallet).
 * @param {number|string} bookingId
 * @param {Object} payload e.g. { paymentMethod: 'wallet' }
 */
export const payBooking = async (bookingId, payload) => {
  const response = await api.post(`/api/Booking/${bookingId}/payment`, payload);
  return response.data?.data ?? response.data ?? response;
};

/**
 * Notify backend webhook about completed payment.
 * This calls POST /api/webhook/payment with a small payload.
 */
export const callPaymentWebhook = async (bookingId, payload = {}) => {
  const response = await api.post('/api/webhook/payment', { bookingId, ...payload });
  return response.data?.data ?? response.data ?? response;
};

/**
 * Lấy chi tiết đặt chỗ theo id (GET /api/Booking/{id}).
 */
export const getBookingById = async (bookingId) => {
  const response = await api.get(`/api/Booking/${bookingId}`);
  return response.data?.data ?? response.data ?? response;
};

/**
 * Lấy lịch sử đặt sân của user (GET /api/Booking/history).
 * @param {Object} params - { pageNumber, pageSize, fromDate?, toDate? }
 * @returns {Promise<{ page, pageSize, totalItems, items }>} items: [{ bookingId, status, bookingDate, venueName, address, province, ward, venueId }]
 */
export const getBookingHistory = async (params = {}) => {
  const response = await api.get('/api/Booking/history', { params });
  const data = response.data?.data ?? response.data ?? {};
  const items = data?.items ?? data?.Items ?? [];
  const totalItems = data?.totalItems ?? data?.TotalItems ?? items.length;
  const page = data?.page ?? data?.Page ?? 1;
  const pageSize = data?.pageSize ?? data?.PageSize ?? 10;
  return {
    page,
    pageSize,
    totalItems,
    items: Array.isArray(items) ? items : [],
  };
};

export const getCancelBookingPreview = async (id) => {
  const response = await api.get(`/api/booking/${id}/cancel-preview`);
  return response.data?.data ?? response.data;
};

export const cancelBookingApi = async (id) => {
  const response = await api.post(`/api/booking/${id}/cancel`);
  return response.data?.data ?? response.data;
};

export default {
  createBooking,
  payBooking,
  getBookingById,
  getBookingHistory,
};
