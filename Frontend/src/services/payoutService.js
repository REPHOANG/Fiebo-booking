import api from './api';
const normalizePayout = (item) => ({
  id: item?.id ?? item?.Id ?? '',
  ownerName: item?.ownerName ?? item?.OwnerName ?? item?.owner ?? '',
  venueName: item?.venueName ?? item?.VenueName ?? item?.venue ?? '',
  amount: Number(item?.amount ?? item?.Amount ?? 0),
  status: item?.status ?? item?.Status ?? '',
  year: item?.year ?? item?.Year ?? null,
  month: item?.month ?? item?.Month ?? null,
  processedBy: item?.processedBy ?? item?.ProcessedBy ?? null,
  processedAt: item?.processedAt ?? item?.ProcessedAt ?? null,
});


/**
 * GET /api/admin/payouts
 * Filterable by status, year, month
 */
export const getOwnerPayouts = async ({ status, year, month } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (year)   params.year   = year;
  if (month)  params.month  = month;
  const res = await api.get('/api/admin/payouts', { params });
  const data = res.data?.data ?? res.data ?? [];
  const items = Array.isArray(data) ? data : data?.items ?? [];
  return items.map(normalizePayout);
};