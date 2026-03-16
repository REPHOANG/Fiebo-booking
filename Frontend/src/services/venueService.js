// Venue Service - API calls for venue management (Owner)
import api from './api';

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
  const response = await api.post('/api/Field', payload);
  return response.data?.data ?? response.data ?? response;
};
