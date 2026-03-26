// Venue Service - API calls for venue management (Owner)
import api from './api';

const unwrap = (res) => res?.data?.data ?? res?.data;

/** Swagger: GET/PATCH `/api/owner/venues` — danh sách / cập nhật (vô hiệu hóa) cơ sở */
export const OWNER_VENUES_BASE = '/api/owner/venues';

/** Swagger: GET `/api/owner/venue/{id}/schedule?date=` — lịch (path dùng số ít `venue`) */
export const ownerVenueScheduleUrl = (venueId) =>
  `/api/owner/venue/${venueId}/schedule`;

/**
 * Step 1 — Create venue draft
 * POST `/api/venues`
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} payload.ownerId
 * @param {string} payload.openTime - "HH:mm:ss"
 * @param {string} payload.closeTime - "HH:mm:ss"
 * @param {string} [payload.description]
 * @param {string} payload.addressDetail
 * @param {number} payload.provinceId
 * @param {number} payload.wardId
 * @param {number} payload.latitude
 * @param {number} payload.longitude
 * @param {string} [payload.thumbnailUrl]
 * @returns {Promise<{venueId:number,status:string}|any>}
 */
export const createVenue = async (payload) => {
  const response = await api.post('/api/venues', payload);
  return unwrap(response) ?? response;
};

/**
 * Step 2 — Add documents
 * POST `/api/venues/{venueId}/documents`
 * Body: { documents: [{ documentType, issueDate, expiryDate, images: [url] }] }
 */
export const addVenueDocuments = async (venueId, payload) => {
  const response = await api.post(`/api/venues/${venueId}/documents`, payload);
  return unwrap(response) ?? response;
};

/**
 * Step 3 — Assign sport types
 * POST `/api/venues/{venueId}/sport-types`
 * Body: { sportTypeIds: number[] }
 */
export const assignVenueSportTypes = async (venueId, payload) => {
  const response = await api.post(`/api/venues/${venueId}/sport-types`, payload);
  return unwrap(response) ?? response;
};

/**
 * Step 4 — Submit venue (DRAFT -> PENDING)
 * POST `/api/venues/{venueId}/submit`
 */
export const submitVenue = async (venueId) => {
  const response = await api.post(`/api/venues/${venueId}/submit`, {});
  return unwrap(response) ?? response;
};

/**
 * GET `/api/owner/venues` — danh sách cơ sở của chủ đăng nhập (Bearer, FieldOwner).
 * @returns {Promise<Array>}
 */
export const getOwnerVenues = async () => {
  const response = await api.get(OWNER_VENUES_BASE);
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
};

/**
 * PATCH `/api/owner/venues/{id}` — vô hiệu hóa cơ sở (backend: DeactivateVenue).
 */
export const deactivateOwnerVenue = async (venueId) => {
  const response = await api.patch(`${OWNER_VENUES_BASE}/${venueId}`);
  return unwrap(response) ?? response;
};

/**
 * GET `/api/owner/venue/{id}/schedule` — lịch sân theo ngày (query `date` yyyy-MM-dd).
 * @param {number|string} venueId
 * @param {string} date - yyyy-MM-dd
 */
export const getOwnerVenueSchedule = async (venueId, date) => {
  const response = await api.get(ownerVenueScheduleUrl(venueId), {
    params: { date },
  });
  return unwrap(response) ?? response;
};
