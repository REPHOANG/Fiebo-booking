import api from "./api";

const unwrap = (res) => res?.data?.data ?? res?.data;

export const getSportTypes = async () => {
  const res = await api.get("/api/sport-types");
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
};

