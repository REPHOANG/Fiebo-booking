
import api from './api';
export const giveRatingApi = async ({ bookingId, rating, comment, images }) => {
  const formData = new FormData();

  formData.append("bookingId", bookingId);
  formData.append("rating", rating.toFixed(1));
  formData.append("comment", comment);

  if (images && images.length > 0) {
    images.forEach((img) => {
      formData.append("images", img);
    });
  }

  const response = await api.post("/api/review", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
};