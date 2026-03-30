// Venue Service - API calls for venue management (Owner)
import api from './api';

const unwrap = (res) => res?.data?.data ?? res?.data;

/** Swagger: GET/PATCH `/api/owner/venues` — danh sách / cập nhật (vô hiệu hóa) cơ sở */
export const OWNER_VENUES_BASE = '/api/owner/venues';

/** Swagger: GET `/api/owner/venue/{id}/schedule?date=` — lịch (path dùng số ít `venue`) */
export const ownerVenueScheduleUrl = (venueId) =>
  `/api/owner/venue/${venueId}/schedule`;

/**
 * Step 1 — Owner: tạo cơ sở nháp (multipart, khớp Swagger)
 * POST `/api/owner/venue/draft`
 * @param {FormData} formData — Name, OpenTime, CloseTime, Description?, AddressDetail, ProvinceId, WardId, Latitude, Longitude, Thumbnail?
 * @returns {Promise<{venueId:number,status:string}|any>}
 */
export const createVenue = async (formData) => {
  const response = await api.post('/api/owner/venue/draft', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response) ?? response;
};

/**
 * Step 2 — Owner: upload giấy tờ (multipart)
 * POST `/api/owner/venues/{venueId}/documents`
 * Form keys: LandUseDocument.IssueDate, LandUseDocument.ExpiryDate, LandUseDocument.Images (lặp),
 *            BusinessDocument.IssueDate, BusinessDocument.ExpiryDate, BusinessDocument.Images (lặp)
 */
export const addVenueDocuments = async (venueId, formData) => {
  const response = await api.post(`/api/owner/venues/${venueId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response) ?? response;
};

/**
 * Legacy / optional — gán bộ môn (nếu backend còn route `/api/venues/...`)
 * POST `/api/venues/{venueId}/sport-types`
 */
export const assignVenueSportTypes = async (venueId, payload) => {
  const response = await api.post(`/api/venues/${venueId}/sport-types`, payload);
  return unwrap(response) ?? response;
};

/**
 * Step 3 — Owner: gửi duyệt (DRAFT → PENDING)
 * PUT `/api/owner/venues/{venueId}/submit`
 */
export const submitVenue = async (venueId) => {
  const response = await api.put(`/api/owner/venues/${venueId}/submit`);
  return unwrap(response) ?? response;
};

/**
 * GET `/api/owner/venues/{venueId}/detail` — chi tiết cơ sở (nháp / owner), khớp VenueController.GetVenueDraft
 */
export const getVenueDraft = async (venueId) => {
  const response = await api.get(`/api/owner/venues/${venueId}/detail`);
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
