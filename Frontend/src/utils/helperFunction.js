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

export const formatDateTime = (isoString) => {
  if (!isoString) return "--";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const EMPTY_OWNER_DASHBOARD = {
  fromDate: "",
  toDate: "",
  totalBookings: 0,
  totalRevenue: 0,
  bookingChangePercent: 0,
  revenueChangePercent: 0,
  completionRate: 0,
  cancellationRate: 0,
  peakTime: {
    startTime: "",
    endTime: "",
    bookingCount: 0,
  },
  revenueTrend: {
    labels: [],
    datasets: [{ data: [] }],
  },
  bookingTrend: {
    labels: [],
    datasets: [{ data: [] }],
  },
  distribution: {
    labels: [],
    datasets: [{ data: [] }, { data: [] }],
  },
};

export const normalizeOwnerDashboard = (data) => ({
  ...EMPTY_OWNER_DASHBOARD,
  ...(data || {}),
  peakTime: {
    ...EMPTY_OWNER_DASHBOARD.peakTime,
    ...(data?.peakTime || {}),
  },
  revenueTrend: {
    ...EMPTY_OWNER_DASHBOARD.revenueTrend,
    ...(data?.revenueTrend || {}),
    datasets: data?.revenueTrend?.datasets || EMPTY_OWNER_DASHBOARD.revenueTrend.datasets,
  },
  bookingTrend: {
    ...EMPTY_OWNER_DASHBOARD.bookingTrend,
    ...(data?.bookingTrend || {}),
    datasets: data?.bookingTrend?.datasets || EMPTY_OWNER_DASHBOARD.bookingTrend.datasets,
  },
  distribution: {
    ...EMPTY_OWNER_DASHBOARD.distribution,
    ...(data?.distribution || {}),
    datasets: data?.distribution?.datasets || EMPTY_OWNER_DASHBOARD.distribution.datasets,
  },
});

export const mapOwnerTrendData = (dashboardData, trendMode = "revenue") => {
  const trendSource = trendMode === "revenue"
    ? dashboardData?.revenueTrend
    : dashboardData?.bookingTrend;
  const labels = Array.isArray(trendSource?.labels) ? trendSource.labels : [];
  const values = Array.isArray(trendSource?.datasets?.[0]?.data)
    ? trendSource.datasets[0].data
    : [];

  return labels.map((label, idx) => ({
    date: formatDate(label),
    value: Number(values[idx] ?? 0),
  }));
};

export const mapOwnerDistributionData = (dashboardData, distributionMode = "bookings") => {
  const dataIndex = distributionMode === "revenue" ? 0 : 1;
  const labels = Array.isArray(dashboardData?.distribution?.labels)
    ? dashboardData.distribution.labels
    : [];
  const values = Array.isArray(dashboardData?.distribution?.datasets?.[dataIndex]?.data)
    ? dashboardData.distribution.datasets[dataIndex].data
    : [];

  return labels.map((label, idx) => ({
    name: label,
    value: Number(values[idx] ?? 0),
  }));
};

export const aggregateOwnerDistributionData = (
  distributionData = [],
  maxItems = 8,
  othersLabel = "Khac",
) => {
  const safeData = Array.isArray(distributionData)
    ? distributionData
        .map((item) => ({
          name: item?.name || "Khong xac dinh",
          value: Number(item?.value || 0),
        }))
        .filter((item) => item.value > 0)
    : [];

  if (safeData.length <= maxItems) return safeData;

  const sorted = [...safeData].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, Math.max(maxItems - 1, 1));
  const tail = sorted.slice(Math.max(maxItems - 1, 1));
  const othersValue = tail.reduce((sum, item) => sum + item.value, 0);

  return [...head, { name: othersLabel, value: othersValue }];
};

export const formatCompactVND = (value) => {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} triệu`;
  return formatVND(n);
};
