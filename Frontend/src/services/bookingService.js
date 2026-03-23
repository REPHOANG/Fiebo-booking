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
 * Đặt sân offline / walk-in (chủ sân hoặc nhân viên).
 * POST /api/Booking/walk-in — cùng payload CreateBookingRequest, trạng thái Booked ngay.
 */
export const createWalkInBooking = async (payload) => {
  const response = await api.post('/api/Booking/walk-in', payload);
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

/** Danh sách: GET `/api/owner/bookings` (số nhiều). Chi tiết: GET `/api/owner/booking/{id}`. */
export const OWNER_BOOKINGS_LIST_PATH = '/api/owner/bookings';

/**
 * Danh sách đơn đặt sân của chủ sân (GET /api/owner/bookings).
 * Query (OwnerBookingFilter): bookingId?, venueName?, fieldName?, fromDate?, toDate?, status? (enum số hoặc tên).
 * Cần đăng nhập role FieldOwner.
 */
export const getOwnerBookingList = async (params = {}) => {
  const response = await api.get(OWNER_BOOKINGS_LIST_PATH, { params });
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};

/**
 * Chi tiết đơn đặt sân cho chủ sân (GET /api/owner/booking/{id}).
 * Cần đăng nhập role FieldOwner.
 */
export const getOwnerBookingDetail = async (bookingId) => {
  const response = await api.get(`/api/owner/booking/${bookingId}`);
  return response.data?.data ?? response.data ?? response;
};

export const cancelBookingApi = async (id) => {
  const response = await api.post(`/api/booking/${id}/cancel`);
  return response.data?.data ?? response.data;
};

/**
 * UC-59: Field Owner cancels a customer's booking with 100% refund.
 * Endpoint: POST /api/Booking/{id}/owner-cancel
 * @param {number|string} id
 * @param {string} cancelReason
 */
export const ownerCancelBookingApi = async (id, cancelReason) => {
  const response = await api.post(`/api/Booking/${id}/owner-cancel`, {
    cancelReason: String(cancelReason || ""),
  });
  return response.data?.data ?? response.data ?? response;
};

export default {
  createBooking,
  createWalkInBooking,
  payBooking,
  getBookingById,
  getBookingHistory,
  getOwnerBookingList,
  getOwnerBookingDetail,
  ownerCancelBookingApi,
};
