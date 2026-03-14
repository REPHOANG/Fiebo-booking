// Venue Service - API calls for venue management (Owner)
import store from '../store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

const getTokenFromRedux = () => store.getState()?.auth?.token ?? null;

const fetchAPI = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const token = getTokenFromRedux();
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
 * Create a new venue with fields
 * @param {Object} payload
 * @param {string} payload.name - Venue name
 * @param {string} [payload.description] - Venue description
 * @param {string} payload.openTime - "HH:mm:ss"
 * @param {string} payload.closeTime - "HH:mm:ss"
 * @param {number} payload.provinceId
 * @param {number} payload.wardId
 * @param {string} payload.addressDetail
 * @param {number} payload.latitude
 * @param {number} payload.longitude
 * @param {Array} payload.fields - Array of { name, sportTypeId, description }
 * @returns {Promise<Object>}
 */
export const createVenue = async (payload) => {
  const response = await fetchAPI('/api/Field', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data ?? response;
};
