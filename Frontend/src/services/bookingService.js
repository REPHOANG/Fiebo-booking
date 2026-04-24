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
 * Trả về PagedResult: page, pageSize, totalItems, items.
 * Query (OwnerBookingFilter): bookingId?, venueId?, venueName?, fieldName?, fromDate?, toDate?, status?, pageNumber?, pageSize?
 */
export const getOwnerBookingList = async (params = {}) => {
  const response = await api.get(OWNER_BOOKINGS_LIST_PATH, { params });
  const data = response.data?.data ?? response.data ?? {};
  const items = data?.items ?? data?.Items ?? [];
  const totalItems = Number(data?.totalItems ?? data?.TotalItems ?? 0) || 0;
  const page = Number(data?.page ?? data?.Page ?? 1) || 1;
  const pageSize = Number(data?.pageSize ?? data?.PageSize ?? 10) || 10;
  return {
    page,
    pageSize,
    totalItems,
    items: Array.isArray(items) ? items : [],
  };
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

/**
 * Owner confirms a pending booking.
 */
export const confirmBookingApi = async (id) => {
  const response = await api.post(`/api/Booking/${id}/confirm`);
  return response.data?.data ?? response.data ?? response;
};

/**
 * Owner rejects a pending booking.
 */
export const rejectBookingApi = async (id, cancelReason) => {
  const response = await api.post(`/api/Booking/${id}/reject`, {
    cancelReason: String(cancelReason || ""),
  });
  return response.data?.data ?? response.data ?? response;
};

// ─── Customer Report APIs ──────────────────────────────────────────────────────

/**
 * POST /api/Report/send-booking-report
 * Customer sends a report for a completed booking.
 * @param {{ bookingId: number, title: string, content: string }} payload
 */
export const sendBookingReport = async (payload) => {
  const response = await api.post('/api/Report/send-booking-report', payload);
  return response.data;
};

/**
 * GET /api/Report/my-reports/{id}
 * Customer views detail of a specific report (including admin response).
 * @param {number} reportId
 */
export const getMyReportDetail = async (reportId) => {
  const response = await api.get(`/api/Report/my-reports/${reportId}`);
  const data = response.data?.data ?? response.data;
  return data;
};

