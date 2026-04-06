import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "react-toastify";
import { getOwnerVenueFields, getVenueDetail } from "../../services/fieldService";
import { addVenueService, deactivateOwnerVenue, getVenueDraft, getVenueServices } from "../../services/venueService";
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
  const images = Array.isArray(imagesRaw) ? imagesRaw.filter(Boolean) : [];
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

const OwnerVenueDetail = () => {
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
  const [venueServices, setVenueServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceImage, setNewServiceImage] = useState(null);
  const [submittingService, setSubmittingService] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      setServicesLoading(true);
      try {
        const data = await getVenueServices(Number(id), 1, 50, "");
        if (mounted) setVenueServices(data?.items ?? []);
      } catch {
        if (mounted) setVenueServices([]);
      } finally {
        if (mounted) setServicesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const reloadVenueServices = async () => {
    try {
      const data = await getVenueServices(Number(id), 1, 50, "");
      setVenueServices(data?.items ?? []);
    } catch {
      setVenueServices([]);
    }
  };

  const handleAddVenueServiceSubmit = async (e) => {
    e.preventDefault();
    const name = newServiceName.trim();
    const price = Number(String(newServicePrice).replace(/\s/g, "").replace(/,/g, ""));
    if (!name) {
      toast.error("Nhập tên dịch vụ.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Giá không hợp lệ.");
      return;
    }
    setSubmittingService(true);
    try {
      await addVenueService(id, {
        serviceName: name,
        description: newServiceDesc.trim() || undefined,
        price,
        imageFile: newServiceImage || undefined,
      });
      toast.success("Đã thêm dịch vụ.");
      setNewServiceName("");
      setNewServiceDesc("");
      setNewServicePrice("");
      setNewServiceImage(null);
      await reloadVenueServices();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Không thêm được dịch vụ.");
    } finally {
      setSubmittingService(false);
    }
  };

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
  const landDocumentDoc = useMemo(
    () => normalizeDoc(venueRaw?.landDocument ?? venueRaw?.LandDocument),
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
  const canCreateField = ["active", "draft", "pending"].includes(statusLower);
  const canDeactivateVenue = statusLower === "active" || statusLower === "draft";
  const isInactive = statusLower === "inactive";

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
        <button className="ovd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="ovd-actions">
          <Link
            className={`ovd-btn ${!canCreateField ? "is-disabled" : ""}`}
            to={canCreateField ? `/owner/venues/${id}/time-slot` : "#"}
            onClick={(e) => {
              if (!canCreateField) e.preventDefault();
            }}
          >
            <Calendar size={16} /> Time slot
          </Link>
          <Link className="ovd-btn ovd-btn--secondary" to="/owner/venues">
            Danh sách cơ sở
          </Link>
          <Link className="ovd-btn ovd-btn--primary" to={`/owner/venues/${id}/offline-booking`}>
            <Calendar size={16} /> Đặt offline
          </Link>
          <button
            type="button"
            className="ovd-btn ovd-btn--danger"
            disabled={deactivating || !canDeactivateVenue}
            onClick={async () => {
              const ok = window.confirm(
                `Vô hiệu hóa cơ sở "${venue?.name ?? `#${id}`}"? Khách sẽ không đặt sân tại đây nữa.`
              );
              if (!ok) return;
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
        </div>
      </div>

      <div className="ovd-layout">
        <div className="ovd-col-left">
          <div className="ovd-card ovd-main-card">
            <div className="ovd-main-head">
              <div className="ovd-main-info">
                {canEditVenue ? (
                  <div style={{ marginBottom: 8 }}>
                    <Link className="ovd-toggle-btn" to={`/owner/venues/${id}/edit`}>
                      Chỉnh sửa thông tin cơ sở
                    </Link>
                  </div>
                ) : null}
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
              </div>
            </div>
          </div>

          {businessLicenseDoc || landDocumentDoc ? (
            <div className="ovd-card ovd-card--legal">
              <h3 className="ovd-subtitle ovd-legal-heading">
                <Calendar size={18} /> Giấy tờ pháp lý
              </h3>
              <div className="ovd-docs-grid">
                {landDocumentDoc ? (
                  <div className="ovd-doc-card">
                    <h4 className="ovd-doc-title">Giấy tờ sử dụng đất</h4>
                    <div className="ovd-doc-meta ovd-doc-meta--row">
                      <div className="ovd-doc-meta-item">
                        <span className="ovd-doc-meta-label">Ngày cấp</span>
                        <strong className="ovd-doc-meta-value">{formatLegalDocDate(landDocumentDoc.issueDate)}</strong>
                      </div>
                      <div className="ovd-doc-meta-item">
                        <span className="ovd-doc-meta-label">Ngày hết hạn</span>
                        <strong className="ovd-doc-meta-value">{formatLegalDocDate(landDocumentDoc.expiryDate)}</strong>
                      </div>
                    </div>
                    <div className="ovd-doc-images">
                      <DocumentImageCarousel images={landDocumentDoc.images} title="Giấy tờ sử dụng đất" />
                    </div>
                  </div>
                ) : null}

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
                <Calendar size={18} /> Thêm sân
              </h3>
              <div className="ovd-actions">
                <Link
                  className={`ovd-btn ${!canCreateField ? "is-disabled" : ""}`}
                  to={canCreateField ? `/owner/venues/${id}/add-field` : "#"}
                  state={canCreateField ? { venueDraftHint } : undefined}
                  onClick={(e) => {
                    if (!canCreateField) e.preventDefault();
                  }}
                >
                  <Plus size={15} /> Thêm sân
                </Link>
              </div>
            </div>
            {canCreateField ? (
              <p className="ovd-muted">
                Bấm “Thêm sân” để tạo sân mới; hoặc dùng “Time slot” trên thanh trên để quản lý khung giờ theo
                loại sân.
              </p>
            ) : (
              <p className="ovd-muted">
                Cơ sở đang ở trạng thái <strong>{statusLower || "không xác định"}</strong> nên không thể
                tạo sân.
              </p>
            )}
          </div>

          <div className="ovd-card ovd-card--services">
            <div className="ovd-title-row">
              <h3 className="ovd-subtitle">
                <Package size={18} /> Dịch vụ kèm theo
              </h3>
              <Link className="ovd-toggle-btn" to={`/owner/venue/${id}/services`} onClick={reloadVenueServices}>
                Quản lý đầy đủ
              </Link>
            </div>
            <p className="ovd-muted">
              Cho thuê bóng, bán nước, giữ xe… — hiển thị công khai cho khách tại danh sách dịch vụ sân.
            </p>

            {canEditVenue ? (
              <form className="ovd-service-form" onSubmit={handleAddVenueServiceSubmit}>
                <div className="ovd-service-form-grid">
                  <label className="ovd-service-label">
                    Tên dịch vụ
                    <input
                      className="ovd-input"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="VD: Cho thuê bóng"
                      maxLength={100}
                      disabled={submittingService}
                    />
                  </label>
                  <label className="ovd-service-label">
                    Giá (đ)
                    <input
                      className="ovd-input"
                      type="number"
                      min="0"
                      step="1"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      placeholder="0"
                      disabled={submittingService}
                    />
                  </label>
                </div>
                <label className="ovd-service-label">
                  Mô tả (tuỳ chọn)
                  <textarea
                    className="ovd-input ovd-service-textarea"
                    rows={2}
                    value={newServiceDesc}
                    onChange={(e) => setNewServiceDesc(e.target.value)}
                    placeholder="Mô tả ngắn"
                    maxLength={500}
                    disabled={submittingService}
                  />
                </label>
                <label className="ovd-service-label ovd-service-file-label">
                  Ảnh minh hoạ (tuỳ chọn)
                  <input
                    type="file"
                    accept="image/*"
                    className="ovd-service-file"
                    disabled={submittingService}
                    onChange={(e) => setNewServiceImage(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="ovd-service-form-actions">
                  <button type="submit" className="ovd-btn ovd-btn--primary" disabled={submittingService}>
                    {submittingService ? "Đang thêm…" : "Thêm dịch vụ"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="ovd-muted">Chỉ có thể thêm dịch vụ khi cơ sở ở trạng thái chỉnh sửa được (active / draft).</p>
            )}

            {servicesLoading ? (
              <div className="owner-loading" style={{ padding: 8 }}>
                <span className="owner-spinner sm" />
              </div>
            ) : venueServices.length === 0 ? (
              <p className="ovd-muted">Chưa có dịch vụ nào.</p>
            ) : (
              <ul className="ovd-service-list">
                {venueServices.map((s, sIdx) => {
                  const sid = s?.id ?? s?.Id;
                  const sname = s?.serviceName ?? s?.ServiceName ?? "—";
                  const sdesc = s?.description ?? s?.Description ?? "";
                  const sprice = s?.price ?? s?.Price;
                  const simg = s?.imageUrl ?? s?.ImageUrl ?? null;
                  return (
                    <li key={sid != null ? `svc-${sid}` : `svc-${sIdx}-${sname}`} className="ovd-service-row">
                      {simg ? (
                        <img src={simg} alt="" className="ovd-service-thumb" />
                      ) : (
                        <div className="ovd-service-thumb ovd-service-thumb--empty" aria-hidden>
                          <Package size={20} />
                        </div>
                      )}
                      <div className="ovd-service-body">
                        <strong className="ovd-service-name">{sname}</strong>
                        {sdesc ? <span className="ovd-service-desc">{sdesc}</span> : null}
                      </div>
                      <span className="ovd-service-price">
                        {sprice != null && Number.isFinite(Number(sprice))
                          ? `${Number(sprice).toLocaleString("vi-VN")} đ`
                          : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="ovd-card">
            <div className="ovd-title-row">
              <h3 className="ovd-subtitle">
                <Calendar size={18} /> Danh sách sân
              </h3>
            </div>
            <div className="ovd-filters">
              <input
                className="ovd-input"
                placeholder="Tìm theo tên sân..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <select
                className="ovd-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                className="ovd-input"
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
              >
                <option value="all">Tất cả môn</option>
                {sportFilterOptions.map((s) => (
                  <option key={s} value={s.toLowerCase()}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {fieldsLoading ? (
              <div className="owner-loading" style={{ padding: 8 }}>
                <span className="owner-spinner sm" />
              </div>
            ) : filteredFields.length === 0 ? (
              <p className="ovd-muted">Không có sân phù hợp bộ lọc.</p>
            ) : (
              <div className="ovd-fields">
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

                  return (
                    <div key={fieldId ?? fieldName} className="ovd-field-row" data-status={statusLower}>
                      <div className="ovd-field-main">
                        <strong className="ovd-field-name">{fieldName}</strong>
                        <span className="ovd-field-meta">{sportType}</span>
                      </div>
                      <div className="ovd-field-right">
                        <span className="ovd-field-price">{priceLabel}</span>
                        <span className="ovd-field-status">{status}</span>
                      </div>
                      {canEditVenue && fieldId != null ? (
                        <div className="ovd-field-actions">
                          <Link
                            className="ovd-toggle-btn"
                            to={`/owner/venues/${id}/edit-field/${fieldId}`}
                            state={{ venueDraftHint }}
                          >
                            Chỉnh sửa
                          </Link>
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

