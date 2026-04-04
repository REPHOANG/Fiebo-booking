import api from "./api";

const unwrap = (res) => res.data?.data ?? res.data?.Data ?? res.data;

/**
 * GET `/api/owner/venue/{venueId}/time-slot?sportTypeId=`
 */
export const getOwnerVenueTimeSlots = async (venueId, sportTypeId) => {
  const res = await api.get(`/api/owner/venue/${venueId}/time-slot`, {
    params: { sportTypeId },
  });
  const data = unwrap(res) || {};
  const slots = data.timeSlots ?? data.TimeSlots ?? [];
  return {
    openTime: data.openTime ?? data.OpenTime ?? null,
    closeTime: data.closeTime ?? data.CloseTime ?? null,
    timeSlots: Array.isArray(slots) ? slots : [],
  };
};

/**
 * POST `/api/owner/venue/{venueId}/time-slot`
 * @param {{ sportTypeId: number, startTime: string, endTime: string, dayOfWeek: string, price: number }} body
 */
export const createOwnerVenueTimeSlot = async (venueId, body) => {
  const res = await api.post(`/api/owner/venue/${venueId}/time-slot`, body);
  return unwrap(res);
};

/**
 * PUT `/api/owner/time-slots/{timeSlotId}`
 */
export const updateOwnerVenueTimeSlot = async (timeSlotId, body) => {
  const res = await api.put(`/api/owner/time-slots/${timeSlotId}`, body);
  return unwrap(res);
};

/**
 * DELETE `/api/owner/time-slots/{timeSlotId}`
 */
export const deleteOwnerVenueTimeSlot = async (timeSlotId) => {
  await api.delete(`/api/owner/time-slots/${timeSlotId}`);
};
