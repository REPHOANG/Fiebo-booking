// Field / Venue Service - API calls for field-related endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;

const fetchAPI = async (endpoint) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

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
 * Get nearby fields/venues based on user location
 * @param {Object} params
 * @param {number} params.userLat - User latitude (default: Hanoi)
 * @param {number} params.userLng - User longitude (default: Hanoi)
 * @param {number} [params.limit=5] - Max results
 * @param {number} [params.radiusKm] - Search radius in km
 * @param {number} [params.sportTypeId] - Filter by sport type
 * @returns {Promise<Array>} List of nearby venues
 */
export const getNearbyFields = async ({
  userLat = 21.027381,
  userLng = 105.833529,
  limit = 5,
  radiusKm,
  sportTypeId,
} = {}) => {
  const params = new URLSearchParams();
  params.append('userLat', userLat);
  params.append('userLng', userLng);
  params.append('limit', limit);
  if (radiusKm != null) params.append('radiusKm', radiusKm);
  if (sportTypeId != null) params.append('sportTypeId', sportTypeId);

  const response = await fetchAPI(`/api/Venue/nearby?${params.toString()}`);
  return response.data; // ApiResponse<List<VenueInfoResponse>> → .data
};

/**
 * Get top booking venues
 * @param {Object} params
 * @param {number} params.userLat
 * @param {number} params.userLng
 * @param {number} [params.limit=5]
 * @returns {Promise<Array>} List of popular venues
 */
export const getTopBookingFields = async ({
  userLat = 21.027381,
  userLng = 105.833529,
  limit = 5,
} = {}) => {
  const params = new URLSearchParams();
  params.append('userLat', userLat);
  params.append('userLng', userLng);
  params.append('limit', limit);

  const response = await fetchAPI(`/api/Venue/top-booking?${params.toString()}`);
  return response.data;
};
