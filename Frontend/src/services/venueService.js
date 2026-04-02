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
    timeout: 120000,
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
    timeout: 180000,
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
 * Update venue basic information (owner).
 * PUT `/api/owner/venues/{venueId}` with multipart form — matches VenueController.UpdateVenue.
 * Do not PATCH this path: PATCH on the same URL is DeactivateVenue (sets inactive).
 */
export const updateOwnerVenueInfo = async (venueId, payload) => {
  const form = new FormData();
  form.append('Name', String(payload?.name ?? '').trim());
  if (payload?.description != null && String(payload.description).trim() !== '') {
    form.append('Description', String(payload.description).trim());
  }
  form.append('AddressDetail', String(payload?.addressDetail ?? '').trim());
  form.append('ProvinceId', String(Number(payload?.provinceId)));
  form.append('WardId', String(Number(payload?.wardId)));
  form.append('Latitude', String(Number(payload?.latitude ?? 0)));
  form.append('Longitude', String(Number(payload?.longitude ?? 0)));
  form.append('OpenTime', payload?.openTime ?? '');
  form.append('CloseTime', payload?.closeTime ?? '');
  if (payload?.thumbnailFile) {
    form.append('ThumbnailImage', payload.thumbnailFile);
  }

  const response = await api.put(`/api/owner/venues/${venueId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
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

export const getVenueServices = async (venueId, page, pageSize, searchKeyword) => {
  const response = await api.get(`/api/venue/${venueId}/services`, {
    params: {
      page,
      pageSize,
      ...(searchKeyword ? { searchKeyword } : {}), // chỉ gửi khi có giá trị
    }
  });
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