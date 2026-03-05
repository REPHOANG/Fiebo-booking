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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.message || `HTTP Error: ${response.status}`,
        data,
      };
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
        message: 'Cannot reach backend. Please check the server or network.',
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
  const response = await fetchAPI('/api/Booking/reserve', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
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
 * Release reservation before TTL (optional)
 * payload: { reservationId }
 */
export const releaseReservation = async (payload) => {
  const response = await fetchAPI('/api/Booking/release', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};

export default {
  reserveSlots,
  confirmReservation,
  releaseReservation,
};
