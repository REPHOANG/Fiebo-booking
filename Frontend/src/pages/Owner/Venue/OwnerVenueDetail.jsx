import React, { useEffect, useMemo, useState } from "react";
import { Input, Select } from "antd";
import Swal from "sweetalert2";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Clock,
  ArrowLeft,
  MapPinned,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Package,
  CircleOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { getOwnerVenueFields, getVenueDetail, toggleOwnerFieldStatus } from "../../../services/fieldService";
import { deactivateOwnerVenue, getVenueDraft } from "../../../services/venueService";
import "./OwnerVenueDetail.css";

const formatTime = (timeSpan) => {
  if (!timeSpan) return "—";
  const parts = String(timeSpan).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(timeSpan);
};

const formatDisplayValue = (key, value) => {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") {
    const lower = String(key || "").toLowerCase();
    if (lower.includes("price") || lower.includes("amount")) return `${value.toLocaleString("vi-VN")} đ`;
    return Number.isFinite(value) ? String(value) : "—";
  }
  if (typeof value === "object") return value;
  return String(value);
};

const normalizeDoc = (doc) => {
  if (!doc || typeof doc !== "object") return null;

  const issueDate = doc.issueDate ?? doc.IssueDate ?? null;
  const expiryDate = doc.expiryDate ?? doc.ExpiryDate ?? null;

  const imagesRaw = doc.images ?? doc.Images ?? [];

  const images = Array.isArray(imagesRaw)
    ? imagesRaw
      .map((img) => img?.imageUrl || img?.url || null)
      .filter(Boolean)
    : [];

  return { issueDate, expiryDate, images };
};

/** Hiển thị ngày giấy tờ (ISO / Date) dạng dd/mm/yyyy */
const formatLegalDocDate = (raw) => {
  if (raw == null || raw === "") return "—";
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw.trim())) {
    const [y, m, d] = raw.trim().slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return String(raw);
  const d = String(t.getDate()).padStart(2, "0");
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const y = t.getFullYear();
  return `${d}/${m}/${y}`;
};

const renderStructuredValue = (value, parentKey = "root") => {
  if (value == null || value === "") return <span className="ovd-raw-value">—</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="ovd-raw-value">—</span>;
    return (
      <div className="ovd-nested-list">
        {value.map((item, idx) => (
          <div key={`${parentKey}-${idx}`} className="ovd-nested-item">
            <span className="ovd-nested-index">#{idx + 1}</span>
            <div className="ovd-nested-content">
              {typeof item === "object" && item !== null
                ? renderStructuredValue(item, `${parentKey}-${idx}`)
                : <span className="ovd-raw-value">{String(item)}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v != null && v !== "");
    if (entries.length === 0) return <span className="ovd-raw-value">—</span>;
    return (
      <div className="ovd-nested-grid">
        {entries.map(([k, v]) => (
          <div key={`${parentKey}-${k}`} className="ovd-nested-block">
            <span className="ovd-nested-key">{k}</span>
            {typeof v === "object"
              ? renderStructuredValue(v, `${parentKey}-${k}`)
              : <span className="ovd-raw-value">{String(formatDisplayValue(k, v))}</span>}
          </div>
        ))}
      </div>
    );
  }

  return <span className="ovd-raw-value">{String(formatDisplayValue(parentKey, value))}</span>;
};

const DocumentImageCarousel = ({ images = [], title = "Document image" }) => {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [safeImages.length]);

  if (safeImages.length === 0) return <span className="ovd-muted">Không có ảnh</span>;

  const prev = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIdx((p) => (p - 1 + safeImages.length) % safeImages.length);
  };
  const next = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIdx((p) => (p + 1) % safeImages.length);
  };

  return (
    <div className="ovd-doc-viewer">
      <div className="ovd-doc-stage">
        <a
          href={safeImages[idx]}
          target="_blank"
          rel="noreferrer"
          className="ovd-doc-stage-link"
          title="Mở ảnh kích thước đầy đủ"
        >
          <img src={safeImages[idx]} alt={`${title} ${idx + 1}`} className="ovd-doc-stage-img" />
        </a>
        {safeImages.length > 1 ? (
          <>
            <button type="button" className="ovd-doc-nav ovd-doc-nav--left" onClick={prev} aria-label="Ảnh trước">
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <button type="button" className="ovd-doc-nav ovd-doc-nav--right" onClick={next} aria-label="Ảnh kế tiếp">
              <ChevronRight size={20} strokeWidth={2.2} />
            </button>
          </>
        ) : null}
        <span className="ovd-doc-counter">
          {idx + 1} / {safeImages.length}
        </span>
      </div>
      {safeImages.length > 1 ? (
        <ul className="ovd-doc-thumbstrip" role="tablist" aria-label="Chọn ảnh xem nhanh">
          {safeImages.map((url, i) => (
            <li key={`${url}-${i}`} role="none">
              <button
                type="button"
                role="tab"
                aria-selected={i === idx}
                className={`ovd-doc-thumbstrip-btn ${i === idx ? "is-active" : ""}`}
                onClick={() => setIdx(i)}
              >
                <img src={url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** Public `/api/Venue/{id}/details` vs owner `/api/owner/venues/{id}/detail` — khác tên field địa phương. */
function normalizeVenueDetailShape(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    name: raw.name ?? raw.Name ?? null,
    openTime: raw.openTime ?? raw.OpenTime,
    closeTime: raw.closeTime ?? raw.CloseTime,
    description: raw.description ?? raw.Description ?? null,
    addressDetail: raw.addressDetail ?? raw.AddressDetail ?? null,
    province: raw.province ?? raw.Province ?? raw.provinceName ?? raw.ProvinceName ?? null,
    ward: raw.ward ?? raw.Ward ?? raw.wardName ?? raw.WardName ?? null,
    latitude: raw.latitude ?? raw.Latitude,
    longitude: raw.longitude ?? raw.Longitude,
    status: raw.status ?? raw.Status ?? null,
  };
}

const formatFieldStatusLabel = (status) => {
  const lower = String(status || "").toLowerCase().trim();
  if (lower === "active") return "Đang hoạt động";
  if (lower === "inactive") return "Đã vô hiệu hóa";
  if (lower === "draft") return "Bản nháp";
  return status || "Không xác định";
};

const OwnerVenueDetail = ({ isStaff = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [venueRaw, setVenueRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [fieldStatusLoading, setFieldStatusLoading] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        let data = null;
        try {
          // Owner endpoint includes `Status`, so we can correctly allow/deny editing.
          data = await getVenueDraft(id);
        } catch {
          // Fallback (should be rare) if owner endpoint fails for any reason.
          data = await getVenueDetail(id);
        }
        if (mounted) {
          setVenue(normalizeVenueDetailShape(data));
          setVenueRaw(data && typeof data === "object" ? data : null);
        }
      } catch (e) {
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được chi tiết cơ sở.");
        if (mounted) {
          setVenue(null);
          setVenueRaw(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setFieldsLoading(true);
      try {
        const list = await getOwnerVenueFields(id);
        if (mounted) setFields(Array.isArray(list) ? list : []);
      } catch (e) {
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách sân.");
        if (mounted) setFields([]);
      } finally {
        if (mounted) setFieldsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const address = useMemo(() => {
    if (!venue) return "";
    return [venue.addressDetail, venue.ward, venue.province].filter(Boolean).join(", ");
  }, [venue]);

  const mapSrc = useMemo(() => {
    const lat = Number(venue?.latitude);
    const lng = Number(venue?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.004}%2C${lng + 0.005}%2C${lat + 0.004}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [venue]);

  const venueDraftHint = useMemo(
    () => ({
      openTime: venue?.openTime ?? venueRaw?.openTime ?? venueRaw?.OpenTime ?? null,
      closeTime: venue?.closeTime ?? venueRaw?.closeTime ?? venueRaw?.CloseTime ?? null,
    }),
    [venue, venueRaw],
  );

  const businessLicenseDoc = useMemo(
    () => normalizeDoc(venueRaw?.businessLicense ?? venueRaw?.BusinessLicense),
    [venueRaw],
  );

  const extraVenueEntries = useMemo(() => {
    if (!venueRaw || typeof venueRaw !== "object") return [];
    const excluded = new Set([
      "name",
      "Name",
      "openTime",
      "OpenTime",
      "closeTime",
      "CloseTime",
      "description",
      "Description",
      "addressDetail",
      "AddressDetail",
      "province",
      "Province",
      "provinceName",
      "ProvinceName",
      "ward",
      "Ward",
      "wardName",
      "WardName",
      "latitude",
      "Latitude",
      "longitude",
      "Longitude",
      "status",
      "Status",
      "id",
      "Id",
      "provinceId",
      "ProvinceId",
      "wardId",
      "WardId",
      "thumbnailUrl",
      "ThumbnailUrl",
      "businessLicense",
      "BusinessLicense",
      "landDocument",
      "LandDocument",
    ]);
    return Object.entries(venueRaw)
      .filter(([key, value]) => !excluded.has(key) && value != null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b));
  }, [venueRaw]);

  const venueThumbnail =
    venueRaw?.thumbnailUrl ??
    venueRaw?.ThumbnailUrl ??
    null;

  const venueProvinceDisplay =
    venue?.province ??
    venueRaw?.provinceName ??
    venueRaw?.ProvinceName ??
    venueRaw?.province ??
    venueRaw?.Province ??
    venueRaw?.provinceId ??
    venueRaw?.ProvinceId ??
    "—";

  const venueWardDisplay =
    venue?.ward ??
    venueRaw?.wardName ??
    venueRaw?.WardName ??
    venueRaw?.ward ??
    venueRaw?.Ward ??
    venueRaw?.wardId ??
    venueRaw?.WardId ??
    "—";

  // Permissions for edit/deactivate depend on venue `Status`.
  // We load from owner endpoint first (which includes `Status`) to ensure this is accurate.
  const statusLower = String(venue?.status || venue?.Status || "").toLowerCase().trim();
  const canEditVenue = ["active", "draft"].includes(statusLower);
  const canDeactivateVenue = statusLower === "active" || statusLower === "draft";
  const canOfflineBook = ["active", "inactive"].includes(statusLower);
  const isInactive = statusLower === "inactive";
  const isPendingOrRejected = statusLower === "pending" || statusLower === "rejected";

  const filteredFields = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return (fields || []).filter((f) => {
      const name = String(f?.fieldName ?? f?.FieldName ?? "").toLowerCase();
      const sport = String(f?.sportType ?? f?.SportType ?? "").toLowerCase();
      const status = String(f?.status ?? f?.Status ?? "").toLowerCase();
      if (kw && !name.includes(kw)) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (sportFilter !== "all" && sport !== sportFilter) return false;
      return true;
    });
  }, [fields, searchKeyword, statusFilter, sportFilter]);

  const sportFilterOptions = useMemo(() => {
    const set = new Set(
      (fields || []).map((f) => String(f?.sportType ?? f?.SportType ?? "").trim()).filter(Boolean)
    );
    return Array.from(set);
  }, [fields]);

  if (loading) {
    return (
      <div className="owner-venue-detail">
        <div className="ovd-loading">
          <Loader2 size={28} className="ovd-spinner" />
          <p>Đang tải thông tin cơ sở...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="owner-venue-detail">
        <div className="ovd-notfound">
          <p>Không tìm thấy cơ sở.</p>
          <button className="ovd-btn" onClick={() => navigate("/owner/venues")}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-venue-detail">
      <div className="ovd-header">
        <button className="ovd-back" onClick={() => navigate(isStaff ? "/staff" : "/owner/venues")}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="ovd-actions">
          {
            !isStaff && (
              <Link
                className="ovd-btn"
                to={`/owner/venues/${id}/time-slot`}
              >
                <Calendar size={16} /> Quản lý khung giờ
              </Link>
            )
          }
          <Link
            className="ovd-btn"
            to={isStaff ? `/staff/venues/${id}/services` : `/owner/venue/${id}/services`}
          >
            <Package size={16} /> {isStaff ? "Xem dịch vụ" : "Quản lý dịch vụ"}
          </Link>
          <Link
            className={`ovd-btn ovd-btn--primary${!canOfflineBook ? " is-disabled" : ""}`}
            to={canOfflineBook
              ? (isStaff ? `/staff/venues/${id}/offline-booking` : `/owner/venues/${id}/offline-booking`)
              : "#"}
            onClick={(e) => {
              if (!canOfflineBook) e.preventDefault();
            }}
            title={!canOfflineBook ? "Chỉ có thể đặt offline khi cơ sở đang active hoặc inactive" : undefined}
          >
            <Calendar size={16} /> Đặt offline
          </Link>
          {!isStaff && !isPendingOrRejected && (
            <button
              type="button"
              className="ovd-btn ovd-btn--danger"
              disabled={deactivating || !canDeactivateVenue}
              onClick={async () => {
                const { isConfirmed } = await Swal.fire({
                  title: "Vô hiệu hóa cơ sở?",
                  text: `Cơ sở "${venue?.name ?? `#${id}`}" sẽ bị vô hiệu hóa. Khách sẽ không đặt sân tại đây nữa.`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#dc2626",
                  cancelButtonColor: "#6b7280",
                  confirmButtonText: "Vô hiệu hóa",
                  cancelButtonText: "Hủy",
                });
                if (!isConfirmed) return;
                setDeactivating(true);
                try {
                  await deactivateOwnerVenue(id);
                  toast.success("Đã vô hiệu hóa cơ sở.");
                  navigate("/owner/venues");
                } catch (e) {
                  toast.error(e?.response?.data?.message ?? e?.message ?? "Không vô hiệu hóa được.");
                } finally {
                  setDeactivating(false);
                }
              }}
              title={
                isInactive
                  ? "Cơ sở đã vô hiệu hóa"
                  : !canDeactivateVenue
                    ? "Cơ sở không ở trạng thái cho phép vô hiệu hóa."
                    : undefined
              }
            >
              {isInactive
                ? "Đã vô hiệu hóa"
                : !canDeactivateVenue
                  ? "Không thể vô hiệu hóa"
                  : deactivating
                    ? "Đang vô hiệu hóa..."
                    : "Vô hiệu hóa"}
            </button>
          )}
        </div>
      </div>

      <div className="ovd-layout">
        <div className="ovd-col-left">
          <div className="ovd-card ovd-main-card">
            <div className="ovd-main-head">
              <div className="ovd-main-info">
                <h1 className="ovd-title">{venue.name ?? `Cơ sở #${id}`}</h1>
                <div className="ovd-meta">
                  {address ? (
                    <div className="ovd-meta-item">
                      <MapPin size={16} /> <span>{address}</span>
                    </div>
                  ) : null}
                  <div className="ovd-meta-item">
                    <Clock size={16} /> <span>{formatTime(venue.openTime)} – {formatTime(venue.closeTime)}</span>
                  </div>
                </div>
                {venue.description ? <p className="ovd-desc">{venue.description}</p> : null}
              </div>
              <div className="ovd-main-cover-wrap">
                {venueThumbnail ? (
                  <a href={venueThumbnail} target="_blank" rel="noreferrer" className="ovd-main-cover-link">
                    <img src={venueThumbnail} alt="Ảnh đại diện cơ sở" className="ovd-main-cover" />
                  </a>
                ) : (
                  <div className="ovd-main-cover ovd-main-cover--placeholder">Chưa có ảnh</div>
                )}
                {canEditVenue && !isStaff ? (
                  <Link className="ovd-toggle-btn ovd-main-edit-action" to={`/owner/venues/${id}/edit`}>
                    Chỉnh sửa thông tin cơ sở
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {businessLicenseDoc ? (
            <div className="ovd-card ovd-card--legal">
              <h3 className="ovd-subtitle ovd-legal-heading">
                <Calendar size={18} /> Giấy tờ pháp lý
              </h3>
              <div className="ovd-docs-grid">
                {businessLicenseDoc ? (
                  <div className="ovd-doc-card">
                    <h4 className="ovd-doc-title">Giấy phép kinh doanh</h4>
                    <div className="ovd-doc-meta ovd-doc-meta--row">
                      <div className="ovd-doc-meta-item">
                        <span className="ovd-doc-meta-label">Ngày cấp</span>
                        <strong className="ovd-doc-meta-value">
                          {formatLegalDocDate(businessLicenseDoc.issueDate)}
                        </strong>
                      </div>
                      <div className="ovd-doc-meta-item">
                        <span className="ovd-doc-meta-label">Ngày hết hạn</span>
                        <strong className="ovd-doc-meta-value">
                          {formatLegalDocDate(businessLicenseDoc.expiryDate)}
                        </strong>
                      </div>
                    </div>
                    <div className="ovd-doc-images">
                      <DocumentImageCarousel images={businessLicenseDoc.images} title="Giấy phép kinh doanh" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {extraVenueEntries.length > 0 ? (
            <div className="ovd-card">
              <h3 className="ovd-subtitle">
                <Calendar size={18} /> Thông tin mở rộng
              </h3>
              <div className="ovd-extra-grid">
                <div className="ovd-raw-item">
                  <span className="ovd-raw-key">Ảnh đại diện cơ sở</span>
                  {venueThumbnail ? (
                    <a href={venueThumbnail} target="_blank" rel="noreferrer" className="ovd-cover-link">
                      <img src={venueThumbnail} alt="Ảnh đại diện cơ sở" className="ovd-cover-thumb" />
                    </a>
                  ) : (
                    <span className="ovd-raw-value">—</span>
                  )}
                </div>
                <div className="ovd-raw-item">
                  <span className="ovd-raw-key">Tỉnh / Thành phố</span>
                  <span className="ovd-raw-value">{String(venueProvinceDisplay)}</span>
                </div>
                <div className="ovd-raw-item">
                  <span className="ovd-raw-key">Quận / Huyện</span>
                  <span className="ovd-raw-value">{String(venueWardDisplay)}</span>
                </div>
                {extraVenueEntries.map(([key, value]) => (
                  <div key={key} className="ovd-raw-item">
                    <span className="ovd-raw-key">{key}</span>
                    {renderStructuredValue(formatDisplayValue(key, value), key)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {mapSrc ? (
            <div className="ovd-card">
              <h3 className="ovd-subtitle">
                <MapPinned size={18} /> Vị trí
              </h3>
              <div className="ovd-map">
                <iframe title="Venue location" src={mapSrc} className="ovd-map-iframe" loading="lazy" />
              </div>
              <a
                className="ovd-map-link"
                href={`https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={14} /> Mở trong Google Maps
              </a>
            </div>
          ) : null}
        </div>

        <div className="ovd-col-right">

          <div className="ovd-card">
            <div className="ovd-title-row">
              <h3 className="ovd-subtitle">
                <Calendar size={18} /> Danh sách sân
              </h3>
              {!isStaff && (
                <div className="ovd-actions">
                  <Link
                    className="ovd-btn"
                    to={`/owner/venues/${id}/add-field`}
                    state={{ venueDraftHint }}
                  >
                    <Plus size={15} /> Thêm sân
                  </Link>
                </div>
              )}
            </div>

            <div className="ovd-filters">
              <Input
                className="ovd-filter-input"
                placeholder="Tìm theo tên sân..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
              />
              <Select
                className="ovd-filter-select"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "active", label: "Đang hoạt động" },
                  { value: "inactive", label: "Ngừng hoạt động" },
                ]}
              />
              <Select
                className="ovd-filter-select"
                value={sportFilter}
                onChange={(val) => setSportFilter(val)}
                options={[
                  { value: "all", label: "Tất cả môn" },
                  ...sportFilterOptions.map((s) => ({
                    value: s.toLowerCase(),
                    label: s,
                  })),
                ]}
              />
            </div>

            {fieldsLoading ? (
              <div className="owner-loading" style={{ padding: 8 }}>
                <span className="owner-spinner sm" />
              </div>
            ) : filteredFields.length === 0 ? (
              <p className="ovd-muted">Không có sân phù hợp bộ lọc.</p>
            ) : (
              <div className="ovd-fields ovd-fields-scroll">
                {filteredFields.map((f) => {
                  const fieldId = f?.fieldId ?? f?.FieldId;
                  const fieldName = f?.fieldName ?? f?.FieldName ?? "—";
                  const sportType = f?.sportType ?? f?.SportType ?? "—";
                  const status = f?.status ?? f?.Status ?? "—";
                  const minPrice = f?.minPrice ?? f?.MinPrice;
                  const maxPrice = f?.maxPrice ?? f?.MaxPrice;
                  const priceLabel =
                    minPrice != null && maxPrice != null
                      ? `${Number(minPrice).toLocaleString("vi-VN")} – ${Number(maxPrice).toLocaleString("vi-VN")} đ`
                      : "—";
                  const statusLower = String(status || "").toLowerCase();
                  const canToggleFieldStatus = canEditVenue && fieldId != null && ["active", "inactive"].includes(statusLower);
                  const isFieldStatusLoading = fieldId != null && Boolean(fieldStatusLoading[fieldId]);
                  const toggleFieldLabel = statusLower === "inactive" ? "Kích hoạt" : "Vô hiệu hóa";

                  return (
                    <div key={fieldId ?? fieldName} className="ovd-field-row ovd-field-card" data-status={statusLower}>
                      <div className="ovd-field-summary">
                        <div className="ovd-field-main">
                          <div className="ovd-field-heading">
                            <strong className="ovd-field-name">{fieldName}</strong>
                            <span className="ovd-field-status-badge">{formatFieldStatusLabel(status)}</span>
                          </div>
                          <div className="ovd-field-meta-row">
                            <span className="ovd-field-chip">{sportType}</span>
                          </div>
                        </div>
                        <div className="ovd-field-right">
                        </div>
                      </div>
                      {isStaff && fieldId != null && (
                        <div className="ovd-field-actions ovd-field-actions--card">
                          <Link
                            className="ovd-toggle-btn"
                            to={`/staff/venues/${id}/field-detail/${fieldId}`}
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      )}
                      {!isStaff && fieldId != null ? (
                        <div className="ovd-field-actions ovd-field-actions--card">
                          <Link
                            className={`ovd-toggle-btn ${!canEditVenue ? "is-disabled" : ""}`}
                            to={`/owner/venues/${id}/edit-field/${fieldId}`}
                            state={{ venueDraftHint }}
                            onClick={(e) => {
                              if (!canEditVenue) e.preventDefault();
                            }}
                          >
                            Chỉnh sửa
                          </Link>
                          <button
                            type="button"
                            className={`ovd-toggle-btn ovd-toggle-btn--warn ${!canToggleFieldStatus ? "is-disabled" : ""}`}
                            disabled={!canToggleFieldStatus || isFieldStatusLoading}
                            onClick={async () => {
                              if (!canToggleFieldStatus || fieldId == null) return;
                              const { isConfirmed } = await Swal.fire({
                                title: `${toggleFieldLabel} sân?`,
                                text: `Bạn muốn ${toggleFieldLabel.toLowerCase()} sân "${fieldName}"?`,
                                icon: statusLower === "inactive" ? "question" : "warning",
                                showCancelButton: true,
                                confirmButtonColor: statusLower === "inactive" ? "#16a34a" : "#dc2626",
                                cancelButtonColor: "#6b7280",
                                confirmButtonText: toggleFieldLabel,
                                cancelButtonText: "Hủy",
                              });
                              if (!isConfirmed) return;
                              setFieldStatusLoading((prev) => ({ ...prev, [fieldId]: true }));
                              try {
                                await toggleOwnerFieldStatus(id, fieldId);
                                setFields((prev) =>
                                  (prev || []).map((item) => {
                                    const currentId = item?.fieldId ?? item?.FieldId;
                                    if (currentId !== fieldId) return item;
                                    const nextStatus = statusLower === "inactive" ? "Active" : "Inactive";
                                    return {
                                      ...item,
                                      status: nextStatus,
                                      Status: nextStatus,
                                    };
                                  })
                                );
                                toast.success(statusLower === "inactive" ? "Đã kích hoạt sân." : "Đã vô hiệu hóa sân.");
                              } catch (error) {
                                toast.error(
                                  error?.response?.data?.message ??
                                  error?.message ??
                                  "Không cập nhật được trạng thái sân."
                                );
                              } finally {
                                setFieldStatusLoading((prev) => ({ ...prev, [fieldId]: false }));
                              }
                            }}
                            title={
                              !canToggleFieldStatus
                                ? "Chỉ sân ở trạng thái hoạt động hoặc đã vô hiệu hóa mới có thể đổi trạng thái."
                                : undefined
                            }
                          >
                            {isFieldStatusLoading ? (
                              <Loader2 size={14} className="ovd-spinner" />
                            ) : statusLower === "inactive" ? (
                              <RotateCcw size={14} />
                            ) : (
                              <CircleOff size={14} />
                            )}
                            {isFieldStatusLoading ? "Đang xử lý..." : toggleFieldLabel}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerVenueDetail;

