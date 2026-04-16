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

/** Tất cả sân (paginated) để lọc lịch theo đúng môn — DTO có sportType + name. */
export const fetchVenueFieldCatalog = async (venueId) => {
  const pageSize = 100;
  let page = 1;
  const all = [];
  for (;;) {
    const data = await getVenueFields(venueId, page, pageSize);
    const items = data?.items ?? data?.Items ?? [];
    all.push(...items);
    const total = Number(data?.totalItems ?? data?.TotalItems);
    if (!items.length || items.length < pageSize) break;
    if (Number.isFinite(total) && total > 0 && all.length >= total) break;
    page += 1;
  }
  return all;
};

/**
 * Get venue schedule (slots + unavailable bookings) for a specific date
 * @param {string|number} venueId
 * @param {string|Date} date
 * @param {{ sportTypeId?: number|string }} [options] optional filter (nếu API hỗ trợ query sportTypeId)
 */
export const getVenueSchedule = async (venueId, date, options = {}) => {
  const q = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  const params = { date: q };
  if (options.sportTypeId != null && options.sportTypeId !== '') {
    params.sportTypeId = options.sportTypeId;
  }
  const response = await api.get(`/api/Venue/${venueId}/schedule`, {
    params,
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
 * GET `/api/owner/venue/{venueId}/fields` (fallback `/api/owner/venues/{venueId}/fields`)
 * @param {number|string} venueId
 * @returns {Promise<Array>} OwnerFieldListItemResponse[]
 */
export const getOwnerVenueFields = async (venueId) => {
  try {
    const response = await api.get(`/api/owner/venue/${venueId}/fields`);
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Backward compatibility with older backend route.
    const status = error?.response?.status;
    if (status !== 404 && status !== 405) throw error;
    const response = await api.get(`/api/owner/venues/${venueId}/fields`);
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : [];
  }
};

/**
 * Owner: Get field detail by field id
 * GET `/api/owner/field/{id}`
 * @param {number|string} fieldId
 * @returns {Promise<Object>} OwnerFieldDetailResponse
 */
export const getOwnerFieldDetail = async (fieldId) => {
  const response = await api.get(`/api/owner/field/${fieldId}`);
  return response.data?.data ?? response.data;
};

/**
 * Owner: Create a new field in venue
 * POST `/api/owner/venues/{venueId}/fields` — khớp VenueController.CreateField (số nhiều `venues`)
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
  const response = await api.post(`/api/owner/venues/${venueId}/fields`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data ?? response.data;
};

/**
 * Owner: Update a field (Fiebo: PUT multipart `/api/owner/field/{id}` — name, description, sportTypeId)
 * @param {number|string} fieldId
 * @param {{name:string,description?:string,sportTypeId:number|string,status?:string}} payload
 * @param {number|string} [venueId] fallback PATCH routes
 */
export const updateOwnerField = async (fieldId, payload, venueId) => {
  const form = new FormData();
  form.append("name", String(payload?.name ?? ""));
  form.append("description", payload?.description != null ? String(payload.description) : "");
  form.append("sportTypeId", String(payload?.sportTypeId ?? ""));

  try {
    const response = await api.put(`/api/owner/field/${fieldId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data?.data ?? response.data;
  } catch (e) {
    const status = e?.response?.status;
    if (status !== 404 && status !== 405) throw e;
  }

  const body = {
    ...(payload?.name != null ? { name: payload.name } : {}),
    ...(payload?.description != null ? { description: payload.description } : {}),
    ...(payload?.sportTypeId != null ? { sportTypeId: payload.sportTypeId } : {}),
    ...(payload?.status != null ? { status: payload.status } : {}),
  };

  const candidates = [
    `/api/owner/fields/${fieldId}`,
    `/api/owner/field/${fieldId}`,
    ...(venueId != null ? [`/api/owner/venues/${venueId}/fields/${fieldId}`, `/api/owner/venue/${venueId}/fields/${fieldId}`] : []),
  ];

  let lastError;
  for (const url of candidates) {
    try {
      const response = await api.patch(url, body);
      return response.data?.data ?? response.data;
    } catch (error) {
      lastError = error;
      const st = error?.response?.status;
      if (st !== 404 && st !== 405) throw error;
    }
  }
  throw lastError;
};

/**
 * Owner: Toggle field status Active/Inactive
 * PATCH `/api/owner/venue/{venueId}/fields/{fieldId}`
 * @param {number|string} venueId
 * @param {number|string} fieldId
 */
export const toggleOwnerFieldStatus = async (venueId, fieldId) => {
  const response = await api.patch(`/api/owner/venue/${venueId}/fields/${fieldId}`);
  return response.data?.data ?? response.data;
};

/** Owner: thêm ảnh cho sân đã tồn tại (POST `/api/Media/field/{id}/upload`) */
export const uploadOwnerFieldImages = async (fieldId, files) => {
  const arr = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!arr.length) return null;
  const form = new FormData();
  arr.forEach((file) => form.append("files", file));
  const response = await api.post(`/api/Media/field/${fieldId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data ?? response.data;
};

/** Owner: xóa ảnh sân đã tồn tại (POST `/api/Media/field/delete/{publicId}`) */
export const deleteOwnerFieldImage = async (publicId) => {
  const pid = String(publicId ?? "").trim();
  if (!pid) throw new Error("Thiếu publicId ảnh cần xóa.");
  // Backend route uses catch-all `{*publicId}` so slash `/` inside publicId must be preserved.
  // Encode each segment, then join by `/` to keep folder structure.
  const safePid = pid
    .split("/")
    .filter((s) => s !== "")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const response = await api.post(`/api/Media/field/delete/${safePid}`);
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
  provinceId,
  wardId,
} = {}) => {
  const params = { page, pageSize };
  if (location) params.name = location;
  if (date) params.date = date;
  if (time) params.time = time;
  if (sportTypeId != null && sportTypeId !== '') params.sportTypeId = sportTypeId;
  if (radiusKm != null) params.radiusKm = radiusKm;
  if (userLat != null) params.userLat = userLat;
  if (userLng != null) params.userLng = userLng;
  if (provinceId != null && provinceId !== '') params.provinceId = provinceId;
  if (wardId != null && wardId !== '') params.wardId = wardId;
  const response = await api.get('/api/Venue/search', { params });
  const raw = response.data?.data ?? response.data ?? {};
  const items = raw.items ?? raw.Items ?? [];
  const totalItems = Number(raw.totalItems ?? raw.TotalItems ?? 0) || 0;
  const ps = Number(raw.pageSize ?? raw.PageSize ?? pageSize) || pageSize;
  const pg = Number(raw.page ?? raw.Page ?? page) || page;
  const fromApi = Number(raw.totalPages ?? raw.TotalPages);
  const totalPages =
    Number.isFinite(fromApi) && fromApi > 0
      ? fromApi
      : totalItems > 0
        ? Math.ceil(totalItems / ps)
        : 0;
  return {
    items: Array.isArray(items) ? items : [],
    totalItems,
    totalPages,
    page: pg,
    pageSize: ps,
  };
};
