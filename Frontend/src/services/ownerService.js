import api from "./api";

export const getOwnerStaffList = async () => {
	const response = await api.get("/api/owner/staff");
	return response.data.data;
};

export const toggleStaffStatus = async (staffId) => {
    const response = await api.patch(`/api/owner/staff/${staffId}`);
    return response.data.data;
};

export const createOwnerStaff = async (payload) => {
	const response = await api.post("/api/owner/staff", payload);
	return response.data.data;
};

export const getOwnerPayouts = async (params = {}) => {
  const response = await api.get("/api/owner/payouts", { params });
  return response.data?.data ?? response.data;
};

export const getOwnerPayoutDetail = async (id) => {
  const response = await api.get(`/api/owner/payouts/${id}`);
  return response.data?.data ?? response.data;
};

export const getOwnerDashboard = async ({ fromDate, toDate, venueId } = {}) => {
  const params = {
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(typeof venueId === "number" ? { venueId } : {}),
  };

  const response = await api.get("/api/owner/dashboard", { params });
  return response.data?.data ?? response.data;
};
