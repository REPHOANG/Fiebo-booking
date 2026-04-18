import api from "./api";

export const getFinanceAdmins = async () => {
  const response = await api.get("/api/Admin/finance-admins");
  return response.data?.data ?? [];
};

export const createFinanceAdmin = async (payload) => {
  const response = await api.post("/api/Admin/finance-admins", payload);
  return response.data?.data ?? response.data;
};

export const getSportTypesAdmin = async () => {
  const response = await api.get("/api/sport-types");
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};

export const createSportTypeAdmin = async (payload) => {
  const response = await api.post("/api/sport-types", payload);
  return response.data?.data ?? response.data;
};

export const updateSportTypeAdmin = async (id, payload) => {
  const response = await api.put(`/api/sport-types/${id}`, payload);
  return response.data?.data ?? response.data;
};

export const getPendingVenues = async (params) => {
  const response = await api.get("/api/admin/venues/pending", {
    params,
  });
  return response.data?.data ?? response.data;
};

export const getVenueDetail = async (id) => {
  const response = await api.get(`/api/Admin/venues/pending/${id}`);
  return response.data?.data ?? response.data;
};

export const approveVenue = async (id) => {
  const res = await api.post(`/api/Admin/venues/${id}/approve`);
  return res.data;
};

export const rejectVenue = async ({ id, reason }) => {
  const res = await api.post(`/api/Admin/venues/${id}/reject`, {
    rejectionReason: reason,
  });
  return res.data;
};

export const getAdminDashboard = async (params = {}) => {
  const { fromDate, toDate } = params;

  const response = await api.get('/api/admin/dashboard', {
    params: {
      From: fromDate || undefined,
      To: toDate || undefined,
    },
  });

  return response.data.data ?? response.data;
};