export const formatTime = (t) => {
    if (!t) return "";
    const parts = t.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  // ── Helper: map API response → VenueCard props ──
    export const mapVenue = (v) => ({
      id: v.venueId,
      name: v.venueName || "Chưa có tên",
      logo: v.thumbnailUrl || "https://placehold.co/100x100?text=Logo",
      image: v.thumbnailUrl || "https://placehold.co/800x400?text=Venue",
      distance: v.distanceKm != null ? `${v.distanceKm.toFixed(1)}km` : "",
      address:
        [v.ward, v.province].filter(Boolean).join(", ") || v.addressDetail || "",
      hours: `${formatTime(v.openTime)} - ${formatTime(v.closeTime)}`,
      badges: ["Đơn ngày"],
      rating: v.rating,
      bookings: v.bookingCount || 0,
    });

    export const formatDate = (dateStr) => {
  const s = String(dateStr || "").slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s || "—";
  return `${d}/${m}/${y}`;
};


export const formatPrice = (n) => {
  const x = Number(n || 0);
  return `${x.toLocaleString("vi-VN")} đ/vé`;
};
export const formatVND = (n) => {
  return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n);
};
export const formatDateToTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};