// Venue Service - API calls for venue management (Owner)
import api from './api';

/** Swagger: GET/PATCH `/api/owner/venues` — danh sách / cập nhật (vô hiệu hóa) cơ sở */
export const OWNER_VENUES_BASE = '/api/owner/venues';

/** Swagger: GET `/api/owner/venue/{id}/schedule?date=` — lịch (path dùng số ít `venue`) */
export const ownerVenueScheduleUrl = (venueId) =>
  `/api/owner/venue/${venueId}/schedule`;

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

/**
 * GET `/api/owner/venues` — danh sách cơ sở của chủ đăng nhập (Bearer, FieldOwner).
 * @returns {Promise<Array>}
 */
export const getOwnerVenues = async () => {
  const response = await api.get(OWNER_VENUES_BASE);
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};

/**
 * PATCH `/api/owner/venues/{id}` — vô hiệu hóa cơ sở (backend: DeactivateVenue).
 */
export const deactivateOwnerVenue = async (venueId) => {
  const response = await api.patch(`${OWNER_VENUES_BASE}/${venueId}`);
  return response.data?.data ?? response.data ?? response;
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
  return response.data?.data ?? response.data ?? response;
};

export const getVenueServices = async (venueId) => {
  const response = await api.get(`/api/venue/${venueId}/services`);
  return response.data.data;
}

export const addVenueService = async (venueId, serviceData) => {
  const formData = new FormData();
  formData.append("ServiceName", serviceData.serviceName);
  formData.append("Price", serviceData.price);
  if (serviceData.description) {
    formData.append("Description", serviceData.description);
  }
  if (serviceData.imageFile) {
    formData.append("Image", serviceData.imageFile);
  }
  const response = await api.post(
    `/api/owner/venue/${venueId}/service`,
    formData
  );
  return response.data?.data ?? response.data ?? response;
};

export const updateVenueService = async (venueId, serviceId, serviceData) => {
  const formData = new FormData();

  formData.append("ServiceName", serviceData.serviceName);
  formData.append("Description", serviceData.description || "");
  formData.append("Price", serviceData.price);

  if (serviceData.imageFile) {
    formData.append("Image", serviceData.imageFile);
  }

  const response = await api.put(
    `/api/owner/service/${serviceId}`,
    formData
  );

  return response.data?.data ?? response.data ?? response;
};

export const deleteVenueService = async (serviceId) => {
  const response = await api.delete(`/api/owner/service/${serviceId}`);
  return response.data?.data ?? response.data ?? response;
}