import api from "./api";

/**
 * GET `/api/owner/subscriptions/plans` — danh sách gói (Bearer, FieldOwner).
 * @returns {Promise<Array<{ id: number, name: string, durationDays: number, price: number }>>}
 */
export const getOwnerSubscriptionPlans = async () => {
  const res = await api.get("/api/owner/subscriptions/plans");
  const raw = res.data?.data ?? res.data?.Data ?? res.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((p) => ({
    id: p?.id ?? p?.Id,
    name: p?.name ?? p?.Name ?? "",
    durationDays: Number(p?.durationDays ?? p?.DurationDays ?? 0),
    price: Number(p?.price ?? p?.Price ?? 0),
  }));
};

/**
 * POST `/api/owner/subscriptions/subscribe/{planId}` — mua gói trừ ví.
 */
export const subscribeOwnerToPlan = async (planId) => {
  const res = await api.post(`/api/owner/subscriptions/subscribe/${planId}`);
  const data = res.data?.data ?? res.data?.Data ?? res.data;
  return {
    message: res.data?.message ?? res.data?.Message ?? "Đăng ký gói thành công.",
    data,
  };
};

const mapCurrentPlan = (p) => ({
  planId: Number(p?.planId ?? p?.PlanId ?? 0),
  planName: p?.planName ?? p?.PlanName ?? "",
  endDate: p?.endDate ?? p?.EndDate ?? null,
  remainingDays: Number(p?.remainingDays ?? p?.RemainingDays ?? 0),
  status: p?.status ?? p?.Status ?? null,
  createdAt: p?.createdAt ?? p?.CreatedAt ?? null,
});

const mapPurchaseHistory = (p) => ({
  planId: Number(p?.planId ?? p?.PlanId ?? 0),
  planName: p?.planName ?? p?.PlanName ?? "",
  price: Number(p?.price ?? p?.Price ?? 0),
  createdAt: p?.createdAt ?? p?.CreatedAt ?? null,
});

/**
 * GET `/api/owner/subscriptions/overview` — thông tin gói hiện tại + lịch sử mua.
 */
export const getOwnerSubscriptionOverview = async () => {
  const res = await api.get("/api/owner/subscriptions/overview");
  const raw = res.data?.data ?? res.data?.Data ?? {};

  const rawCurrentPlan = raw?.currentPlan ?? raw?.CurrentPlan ?? null;
  const rawPurchaseHistory =
    raw?.purchaseHistory ?? raw?.PurchaseHistory ?? raw?.history ?? raw?.History ?? [];

  return {
    currentPlan: rawCurrentPlan ? mapCurrentPlan(rawCurrentPlan) : null,
    purchaseHistory: Array.isArray(rawPurchaseHistory)
      ? rawPurchaseHistory.map(mapPurchaseHistory)
      : [],
  };
};
