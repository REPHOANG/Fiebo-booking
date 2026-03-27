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
