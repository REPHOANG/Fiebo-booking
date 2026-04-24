import api from "./api";

const unwrap = (res) => res?.data?.data ?? res?.data;

export const getStaffVenues = async (params) => {
  const response = await api.get("/api/Staff/venues", { params });
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
};

export const getStaffBookings = async (params) => {
  const response = await api.get("/api/Staff/bookings", { params });
  const data = unwrap(response) ?? {};
  const items = data?.items ?? data?.Items ?? [];
  const totalItems = Number(data?.totalItems ?? data?.TotalItems ?? 0) || 0;
  const page = Number(data?.page ?? data?.Page ?? 1) || 1;
  const pageSize = Number(data?.pageSize ?? data?.PageSize ?? 10) || 10;
  return {
    page,
    pageSize,
    totalItems,
    items: Array.isArray(items) ? items : [],
  };
};

export const getStaffBookingDetail = async (id) => {
  const response = await api.get(`/api/Staff/booking/${id}`);
  return unwrap(response) ?? response;
};

export const getStaffEvents = async (params) => {
  const response = await api.get("/api/Staff/events", { params });
  const data = unwrap(response);
  const items = data?.items ?? data?.Items ?? data;
  return Array.isArray(items) ? items : [];
};

export const getStaffEventDetail = async (id) => {
  const response = await api.get(`/api/Staff/event/${id}`);
  return unwrap(response) ?? response;
};
