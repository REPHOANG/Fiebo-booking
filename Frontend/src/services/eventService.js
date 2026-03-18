import api from "./api";

const unwrap = (res) => res?.data?.data ?? res?.data;

export const joinEvent = async (eventId, payload = {}) => {
  const response = await api.post(`/api/Event/${eventId}/Join`, payload);
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

