import api from "./api";

export const getProvinces = async () => {
  const response = await api.get("/api/Address/provinces");
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};

export const getDistrictsByProvince = async (provinceId) => {
  const response = await api.get(`/api/Address/districts/${provinceId}`);
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};
