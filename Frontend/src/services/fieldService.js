// Field / Venue Service - API calls for field-related endpoints
import api from './api';

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
  const params = { userLat, userLng, limit };
  if (radiusKm != null) params.radiusKm = radiusKm;
  if (sportTypeId != null) params.sportTypeId = sportTypeId;
  const response = await api.get('/api/Venue/nearby', { params });
  return response.data?.data ?? response.data;
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
  const response = await api.get('/api/Venue/top-booking', {
    params: { userLat, userLng, limit },
  });
  return response.data?.data ?? response.data;
};

/**
 * Get venue detail by ID
 * @param {number} venueId
 * @returns {Promise<Object>} VenueDetailResponse
 */
export const getVenueDetail = async (venueId) => {
  const response = await api.get(`/api/Venue/${venueId}/details`);
  return response.data?.data ?? response.data;
};

/**
 * Get fields belonging to a venue (paginated)
 * @param {number} venueId
 * @param {number} [page=1]
 * @param {number} [pageSize=20]
 * @returns {Promise<Object>} PagedResult<FieldsDetailDTO>
 */
export const getVenueFields = async (venueId, page = 1, pageSize = 20) => {
  const response = await api.get(`/api/Venue/${venueId}/fields`, {
    params: { page, pageSize },
  });
  return response.data?.data ?? response.data;
};

/**
 * Get venue schedule (slots + unavailable bookings) for a specific date
 */
export const getVenueSchedule = async (venueId, date) => {
  const q = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  const response = await api.get(`/api/Venue/${venueId}/schedule`, {
    params: { date: q },
  });
  return response.data?.data ?? response.data;
};

// Backwards-compatible alias
export const getVenueScheduleForDate = getVenueSchedule;

/**
 * Get reviews for a venue (paginated)
 * @param {number} venueId
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=10]
 * @param {string} [options.sort] - Sort option (e.g. "newest", "highest")
 * @returns {Promise<Object>} PagedResult<ReviewDTO>
 */
export const getVenueReviews = async (venueId, { page = 1, pageSize = 10, sort } = {}) => {
  const params = { page, pageSize };
  if (sort) params.sort = sort;
  const response = await api.get(`/api/Venue/${venueId}/reviews`, { params });
  return response.data?.data ?? response.data;
};

/**
 * Owner: Get all fields under a venue
 * GET `/api/owner/venue/{venueId}/fields`
 * @param {number|string} venueId
 * @returns {Promise<Array>} OwnerFieldListItemResponse[]
 */
export const getOwnerVenueFields = async (venueId) => {
  const response = await api.get(`/api/owner/venue/${venueId}/fields`);
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};

/**
 * Owner: Create a new field in venue
 * POST `/api/owner/venue/{venueId}/fields`
 * Body (multipart/form-data): name, sportTypeId, description?, images[]
 * @param {number|string} venueId
 * @param {{name:string,sportTypeId:number|string,description?:string,images?:File[]}} payload
 */
export const createOwnerField = async (venueId, payload) => {
  const form = new FormData();
  form.append("name", String(payload?.name ?? ""));
  form.append("sportTypeId", String(payload?.sportTypeId ?? ""));
  if (payload?.description) form.append("description", String(payload.description));
  const images = Array.isArray(payload?.images) ? payload.images : [];
  images.forEach((file) => {
    if (file) form.append("images", file);
  });
  const response = await api.post(`/api/owner/venue/${venueId}/fields`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data ?? response.data;
};

/**
 * Search venues by location, date, time and sport type
 * @param {Object} params
 * @param {string} [params.location]
 * @param {string} [params.date] - "YYYY-MM-DD"
 * @param {string} [params.time] - "HH:mm:ss"
 * @param {number} [params.sportTypeId]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=10]
 * @param {number} [params.radiusKm]
 * @param {number} [params.userLat]
 * @param {number} [params.userLng]
 * @returns {Promise<Object>} PagedResult<VenueInfoResponse>
 */
export const searchVenues = async ({
  location,
  date,
  time,
  sportTypeId,
  page = 1,
  pageSize = 10,
  radiusKm,
  userLat,
  userLng,
} = {}) => {
  const params = { page, pageSize };
  if (location) params.location = location;
  if (date) params.date = date;
  if (time) params.time = time;
  if (sportTypeId != null) params.sportTypeId = sportTypeId;
  if (radiusKm != null) params.radiusKm = radiusKm;
  if (userLat != null) params.userLat = userLat;
  if (userLng != null) params.userLng = userLng;
  const response = await api.get('/api/Venue/search', { params });
  return response.data?.data ?? response.data;
};
