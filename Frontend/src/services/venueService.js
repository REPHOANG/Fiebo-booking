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
 * Update an existing document using its ID (PUT)
 * Payload is FormData with IssueDate, ExpiryDate, Images (new), DeletedImageIds (array)
 */
export const updateOwnerDocument = async (documentId, formData) => {
  const response = await api.put(`/api/owner/document/${documentId}`, formData, {
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
 * GET `/api/owner/venue/select-option` — danh sách cơ sở nhẹ cho dropdown (id + name)
 * @returns {Promise<Array<{id:number,name:string}>>}
 */
export const getOwnerVenueSelectOptions = async () => {
  const response = await api.get("/api/owner/venue/select-option");
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
  // Đảm bảo gửi đúng format cho backend (dấu phẩy nếu cần)
  const safeLat = String(Number(payload?.latitude ?? 0)).replace(".", ",");
  const safeLng = String(Number(payload?.longitude ?? 0)).replace(".", ",");
  form.append('Latitude', safeLat);
  form.append('Longitude', safeLng);
  form.append('OpenTime', payload?.openTime ?? '');
  form.append('CloseTime', payload?.closeTime ?? '');
  if (payload?.thumbnailFile) {
    form.append('ThumbnailImage', payload.thumbnailFile);
  }

  // Optional — update legal documents (BusinessDocument).
  // Backend expects nested form fields:
  // - BusinessDocument.IssueDate / ExpiryDate / Images[]
  const businessDocument = payload?.businessDocument;
  if (businessDocument) {
    if (businessDocument.issueDate) {
      form.append("BusinessDocument.IssueDate", String(businessDocument.issueDate));
    }
    if (businessDocument.expiryDate) {
      form.append("BusinessDocument.ExpiryDate", String(businessDocument.expiryDate));
    }
    const files = Array.isArray(businessDocument.files) ? businessDocument.files : [];
    for (const file of files) {
      if (file) form.append("BusinessDocument.Images", file);
    }
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
      ...(searchKeyword ? { searchKeyword } : {}),
    },
  });
  const data = unwrap(response) ?? {};
  const items = data.items ?? data.Items ?? [];
  const ps = Number(data.pageSize ?? data.PageSize ?? pageSize) || pageSize;
  const totalItems = Number(data.totalItems ?? data.TotalItems ?? 0) || 0;
  const totalPagesRaw = Number(data.totalPages ?? data.TotalPages ?? 0);
  const totalPages =
    totalPagesRaw > 0 ? totalPagesRaw : Math.max(1, Math.ceil(totalItems / ps));
  return {
    items: Array.isArray(items) ? items : [],
    page: Number(data.page ?? data.Page ?? page) || page,
    pageSize: ps,
    totalItems,
    totalPages,
  };
};

export const addVenueService = async (venueId, serviceData) => {
  const formData = new FormData();
  formData.append("ServiceName", String(serviceData.serviceName ?? "").trim());
  formData.append("Price", String(Number(serviceData.price ?? 0)));
  if (serviceData.description != null && String(serviceData.description).trim() !== "") {
    formData.append("Description", String(serviceData.description).trim());
  }
  if (serviceData.imageFile) {
    formData.append("Image", serviceData.imageFile);
  }
  const response = await api.post(`/api/owner/venue/${venueId}/service`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return unwrap(response) ?? response.data ?? response;
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

export const getVenueMap = async (sportTypeId) => {
  const res = await api.get("/api/venue/map", {
    params: { sportTypeId },
  });

  return res.data.data; // luôn trả về array
};