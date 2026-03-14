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