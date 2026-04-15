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
