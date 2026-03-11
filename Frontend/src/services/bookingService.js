// Booking Service - client calls for reservation and confirmation
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

const fetchAPI = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const rawToken = localStorage.getItem('token');
    const token = rawToken || (() => {
      try {
        const a = JSON.parse(localStorage.getItem('authState'));
        return a?.token || a?.accessToken || null;
      } catch (e) {
        return null;
      }
    })();
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
 * Reserve slots on server for a limited TTL.
 * payload should include venueId, date (YYYY-MM-DD), items: [{ fieldId, ranges }], customer info
 * Returns server response which ideally contains { reservationId, expiresInSeconds }
 */
export const reserveSlots = async (payload) => {
  try {
    const response = await fetchAPI('/api/Booking/reserve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data ?? response;
  } catch (err) {
    // If backend doesn't implement /reserve, fallback to creating a booking (unconfirmed)
    if (err && err.status === 404) {
      const fallback = await fetchAPI('/api/Booking', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return fallback.data ?? fallback;
    }
    throw err;
  }
};

/**
 * Confirm reservation (finalize booking & payment)
 * payload: { reservationId, paymentMethod, paymentRef }
 */
export const confirmReservation = async (payload) => {
  const response = await fetchAPI('/api/Booking/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

/**
 * Hủy đặt chỗ trước khi hết TTL (tùy chọn)
 * payload: { reservationId }
 */
export const releaseReservation = async (payload) => {
  const response = await fetchAPI('/api/Booking/release', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

/**
 * Gửi OTP đặt chỗ đến số điện thoại
 * @param {string} phoneNumber
 */
export const sendBookingOtp = async (phoneNumber) => {
  const response = await fetchAPI('/api/Booking/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
  return response.data ?? response;
};

/**
 * Xác thực OTP cho đặt chỗ
 * @param {string} phoneNumber
 * @param {string} otpCode
 */
export const verifyBookingOtp = async (phoneNumber, otpCode, fullName) => {
  const body = { phoneNumber, otpCode };
  if (fullName) body.fullname = fullName;
  const response = await fetchAPI('/api/Booking/verify-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data ?? response;
};

/**
 * Tạo đặt chỗ mới (đã xác thực)
 * @param {Object} payload
 */
export const createBooking = async (payload) => {
  const response = await fetchAPI('/api/Booking', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

/**
 * Thanh toán cho một đặt chỗ sử dụng ví hoặc tham chiếu thanh toán
 * @param {number|string} bookingId
 * @param {Object} payload
 */
export const payBooking = async (bookingId, payload) => {
  const response = await fetchAPI(`/api/Booking/${bookingId}/payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

export default {
  reserveSlots,
  confirmReservation,
  releaseReservation,
  sendBookingOtp,
  verifyBookingOtp,
  createBooking,
  payBooking,
};
