import api from "./api";

const unwrap = (res) => res?.data?.data ?? res?.data;

/** POST /api/Owner/event - Tạo sự kiện drop-in (Owner) */
export const createEvent = async (payload) => {
  const response = await api.post("/api/Owner/event", payload);
  return unwrap(response);
};

/** GET /api/Event - Danh sách sự kiện (Pending) */
export const getEventList = async () => {
  const response = await api.get("/api/Event");
  return unwrap(response);
};

/** GET /api/owner/events - Danh sách sự kiện (Owner) */
export  const getEventListOwner = async () => {
  const response = await api.get("/api/owner/events");
  return unwrap(response);
};


/** GET /api/Owner/event/{id} - Chi tiết sự kiện cho Owner (kèm danh sách người tham gia) */
export const getEventOwner = async (eventId) => {
  const response = await api.get(`/api/Owner/event/${eventId}`);
  return unwrap(response);
};

/** PUT /api/Owner/event/{id} - Cập nhật sự kiện (chỉ khi chưa có người tham gia) */
export const updateEventOwner = async (eventId, payload) => {
  const response = await api.put(`/api/Owner/event/${eventId}`, payload);
  return unwrap(response);
};

/** POST /api/owner/event/{id}/cancel - Hủy sự kiện (Owner) */
export const cancelEventOwner = async (eventId, payload) => {
  const response = await api.post(`/api/owner/event/${eventId}/cancel`, payload);
  return unwrap(response);
};

export const joinEvent = async (eventId, payload = {}) => {
  // Backend: POST /api/Event/{id}/join
  const response = await api.post(`/api/Event/${eventId}/join`, payload);
  return unwrap(response);
};

export const getEventById = async (eventId) => {
  const response = await api.get(`/api/Event/${eventId}`);
  return unwrap(response);
};

export const getEventTicketById = async (ticketId) => {
  const response = await api.get(`/api/Event/ticket/${ticketId}`);
  return unwrap(response);
};

export const payEventTicket = async (ticketId, payload = {}) => {
  const response = await api.post(`/api/Event/ticket/${ticketId}/payment`, payload);
  return unwrap(response);
};

/** POST /api/Event/ticket/{id}/cancel - Hủy vé sự kiện (Customer) */
export const cancelEventTicket = async (ticketParticipantId, payload = {}) => {
  const response = await api.patch(
    `/api/Event/ticket/${ticketParticipantId}/cancel`,
    payload,
  );
  return unwrap(response);
};

/**
 * Lịch sử vé / tham gia sự kiện của khách (GET /api/Event/history).
 * Query: pageIndex, pageSize (backend EventHistoryFilter).
 * @returns {Promise<{ page, pageSize, totalItems, items }>}
 */
export const getCustomerEventHistory = async (params = {}) => {
  const pageIndex = params.pageIndex ?? params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const response = await api.get("/api/Event/history", {
    params: { pageIndex, pageSize },
  });
  const data = response.data?.data ?? response.data ?? {};
  const items = data?.items ?? data?.Items ?? [];
  const totalItems = data?.totalItems ?? data?.TotalItems ?? items.length;
  const page = data?.page ?? data?.Page ?? pageIndex;
  const ps = data?.pageSize ?? data?.PageSize ?? pageSize;
  return {
    page,
    pageSize: ps,
    totalItems,
    items: Array.isArray(items) ? items : [],
  };
};
