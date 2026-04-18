import api from "./api";

export const ADMIN_PENDING_VENUES_QUERY_KEY = ["admin", "pending-venues"];

const normalizePagedResult = (payload) => {
  const data = payload?.data ?? payload ?? {};

  return {
    page: Number(data.page ?? 1),
    pageSize: Number(data.pageSize ?? 10),
    totalItems: Number(data.totalItems ?? 0),
    totalPages: Number(data.totalPages ?? 0),
    items: Array.isArray(data.items) ? data.items : [],
  };
};

const normalizeVenueDocument = (document) => ({
  issueDate: document?.issueDate ?? null,
  expiryDate: document?.expiryDate ?? null,
  images: Array.isArray(document?.images) ? document.images.filter(Boolean) : [],
});

const normalizeVenueDetail = (payload) => {
  const data = payload?.data ?? payload ?? {};

  return {
    venueId: data.venueId ?? data.id ?? null,
    venueName: data.venueName ?? data.name ?? "",
    address: data.address ?? "",
    description: data.description ?? "",
    openTime: data.openTime ?? "",
    closeTime: data.closeTime ?? "",
    ownerName: data.ownerName ?? "",
    ownerEmail: data.ownerEmail ?? "",
    ownerPhone: data.ownerPhone ?? "",
    ownerBankName: data.ownerBankName ?? "",
    ownerBankAccountNumber: data.ownerBankAccountNumber ?? "",
    ownerAccountHolderName: data.ownerAccountHolderName ?? "",
    businessLicense: normalizeVenueDocument(data.businessLicense),
    landUseDocument: normalizeVenueDocument(data.landUseDocument),
  };
};

export const getFinanceAdmins = async () => {
  const response = await api.get("/api/Admin/finance-admins");
  return response.data?.data ?? [];
};

export const createFinanceAdmin = async (payload) => {
  const response = await api.post("/api/Admin/finance-admins", payload);
  return response.data?.data ?? response.data;
};

export const resetFinanceAdminPassword = async (id) => {
  const response = await api.put(`/api/Admin/finance-admins/${id}/reset-password`);
  return response.data?.data ?? response.data;
};

export const getCustomers = async (params) => {
  const response = await api.get("/api/Admin/customers", { params });
  const data = response.data?.data ?? {};
  return {
    page: Number(data.page ?? 1),
    pageSize: Number(data.pageSize ?? 10),
    totalItems: Number(data.totalItems ?? 0),
    totalPages: Number(data.totalPages ?? 0),
    items: Array.isArray(data.items) ? data.items : [],
  };
};

export const getAdminSubscriptionPlans = async () => {
  const response = await api.get("/api/Admin/subscription-plans");
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
};

export const createAdminSubscriptionPlan = async (payload) => {
  const response = await api.post("/api/Admin/subscription-plans", payload);
  return response.data?.data ?? response.data;
};

export const updateAdminSubscriptionPlan = async ({ id, ...payload }) => {
  const response = await api.put(`/api/Admin/subscription-plans/${id}`, payload);
  return response.data?.data ?? response.data;
};

export const deleteAdminSubscriptionPlan = async (id) => {
  const response = await api.delete(`/api/Admin/subscription-plans/${id}`);
  return response.data;
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
  return normalizePagedResult(response.data);
};

export const getVenueDetail = async (id) => {
  const response = await api.get(`/api/Admin/venues/pending/${id}`);
  return normalizeVenueDetail(response.data);
};

export const approveVenue = async (id) => {
  const res = await api.post(`/api/Admin/venues/${id}/approve`);
  return res.data?.data ?? res.data;
};

export const rejectVenue = async ({ id, reason }) => {
  const res = await api.post(`/api/Admin/venues/${id}/reject`, {
    rejectionReason: reason,
  });
  return res.data?.data ?? res.data;
};