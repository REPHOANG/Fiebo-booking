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

