import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import { getDistrictsByProvince, getProvinces } from "../../../services/addressService";
import { getVenueDraft, updateOwnerVenueInfo } from "../../../services/venueService";
import "./OwnerVenueDetail.css";

const toInputTime = (value) => {
  if (!value) return "";
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const toInputDate = (value) => {
  if (!value) return "";
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const normalizeDoc = (doc) => {
  if (!doc || typeof doc !== "object") return null;

  const issueDate = toInputDate(doc.issueDate ?? doc.IssueDate ?? null);
  const expiryDate = toInputDate(doc.expiryDate ?? doc.ExpiryDate ?? null);

  const imagesRaw = doc.images ?? doc.Images ?? [];

  const images = Array.isArray(imagesRaw)
    ? imagesRaw
        .map((img) => img?.imageUrl || img?.url || null)
        .filter(Boolean)
    : [];

  return { issueDate, expiryDate, images };
};

function splitTimeParts(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  const safeHours = match ? Number(match[1]) : 5;
  const safeMinutes = match ? match[2] : "00";
  const period = safeHours >= 12 ? "PM" : "AM";
  const hours12 = safeHours % 12 || 12;
  return {
    hours: String(hours12).padStart(2, "0"),
    minutes: safeMinutes === "30" ? "30" : "00",
    period,
  };
}

function joinTimeParts(hours12Text, minutesText, period) {
  const hours12 = Number(hours12Text);
  const safeHours12 = Number.isFinite(hours12) && hours12 >= 1 && hours12 <= 12 ? hours12 : 12;
  let hours24 = safeHours12 % 12;
  if (period === "PM") hours24 += 12;
  return `${String(hours24).padStart(2, "0")}:${minutesText === "30" ? "30" : "00"}`;
}

const TIME_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return { value, label: `${index + 1} giờ` };
});

const TIME_MINUTE_OPTIONS = [
  { value: "00", label: "00 phút" },
  { value: "30", label: "30 phút" },
];

const TIME_PERIOD_OPTIONS = [
  { value: "AM", label: "Sáng" },
  { value: "PM", label: "Chiều" },
];

function SegmentedDropdown({ value, options, onChange, ariaLabel, className = "", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`ovd-time-dropdown ${className}${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="ovd-time-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((open) => !open);
        }}
      >
        <span className="ovd-time-dropdown-value">{selectedOption.label}</span>
        <ChevronDown size={18} className="ovd-time-dropdown-chevron" aria-hidden />
      </button>
      {isOpen ? (
        <div className="ovd-time-dropdown-panel" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`ovd-time-dropdown-option${isSelected ? " active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={16} strokeWidth={2.5} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TimeSegmentField({ label, value, onChange, disabled }) {
  const parts = splitTimeParts(value);

  const updateTime = (nextParts) => {
    onChange(joinTimeParts(nextParts.hours, nextParts.minutes, nextParts.period));
  };

  return (
    <div className="ovd-label ovd-time-field">
      <span className="ovd-time-label"><Clock size={14} /> {label}</span>
      <div className="ovd-time-segments" aria-label={label}>
        <SegmentedDropdown
          className="ovd-time-segment ovd-time-segment--hour"
          value={parts.hours}
          options={TIME_HOUR_OPTIONS}
          ariaLabel={`${label} - giờ`}
          disabled={disabled}
          onChange={(nextHours) => updateTime({ ...parts, hours: nextHours })}
        />
        <SegmentedDropdown
          className="ovd-time-segment ovd-time-segment--minute"
          value={parts.minutes}
          options={TIME_MINUTE_OPTIONS}
          ariaLabel={`${label} - phút`}
          disabled={disabled}
          onChange={(nextMinutes) => updateTime({ ...parts, minutes: nextMinutes })}
        />
        <SegmentedDropdown
          className="ovd-time-segment ovd-time-segment--period"
          value={parts.period}
          options={TIME_PERIOD_OPTIONS}
          ariaLabel={`${label} - buổi`}
          disabled={disabled}
          onChange={(nextPeriod) => updateTime({ ...parts, period: nextPeriod })}
        />
      </div>
      <p className="ovd-time-hint">Chọn theo dạng giờ và phút, mỗi 30 phút một mốc</p>
    </div>
  );
}

const DocumentImageCarousel = ({ images = [], title = "Document image" }) => {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(null);

  useEffect(() => {
    setIdx(0);
  }, [safeImages.length]);

  if (safeImages.length === 0) return <span className="ovd-muted">Không có ảnh</span>;

  const prev = () => setIdx((p) => (p - 1 + safeImages.length) % safeImages.length);
  const next = () => setIdx((p) => (p + 1) % safeImages.length);

  return (
    <>
      <div className="ovd-doc-viewer">
        <div className="ovd-doc-stage">
          <button
            type="button"
            className="ovd-doc-stage-link"
            onClick={() => setZoomIdx(idx)}
            aria-label="Zoom ảnh"
            style={{ border: "none", width: "100%", background: "transparent", cursor: "zoom-in" }}
          >
            <img
              src={safeImages[idx]}
              alt={`${title} ${idx + 1}`}
              className="ovd-doc-stage-img"
            />
          </button>
          {safeImages.length > 1 ? (
            <>
              <button
                type="button"
                className="ovd-doc-nav ovd-doc-nav--left"
                onClick={prev}
                aria-label="Ảnh trước"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="ovd-doc-nav ovd-doc-nav--right"
                onClick={next}
                aria-label="Ảnh kế tiếp"
              >
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}
          <span className="ovd-doc-counter">
            {idx + 1} / {safeImages.length}
          </span>
        </div>
        {safeImages.length > 1 ? (
          <ul className="ovd-doc-thumbstrip" role="tablist" aria-label="Chọn ảnh xem nhanh">
            {safeImages.map((url, imageIdx) => (
              <li key={`${url}-${imageIdx}`} role="none">
                <button
                  type="button"
                  role="tab"
                  aria-selected={imageIdx === idx}
                  className={`ovd-doc-thumbstrip-btn ${imageIdx === idx ? "is-active" : ""}`}
                  onClick={() => setIdx(imageIdx)}
                >
                  <img src={url} alt="" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {zoomIdx != null ? (
        <div
          className="ovd-lightbox-overlay"
          onClick={() => setZoomIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="ovd-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ovd-lightbox-close"
              onClick={() => setZoomIdx(null)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <img
              src={safeImages[zoomIdx]}
              alt={`${title} ${zoomIdx + 1}`}
              className="ovd-lightbox-img"
            />
          </div>
        </div>
      ) : null}
    </>
  );
};

const LocalDocumentImageCarousel = ({
  files = [],
  title = "Document image",
  onRemove,
  inputId,
  disabled,
  maxImages = 5,
  onAddChange,
}) => {
  const safeFiles = useMemo(() => (Array.isArray(files) ? files.filter(Boolean) : []), [files]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [idx, setIdx] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(null);

  useEffect(() => {
    if (safeFiles.length === 0) {
      setPreviewUrls([]);
      return () => {};
    }

    const nextUrls = safeFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [safeFiles]);

  useEffect(() => {
    setIdx((currentIdx) => {
      if (previewUrls.length === 0) return 0;
      return Math.min(currentIdx, previewUrls.length - 1);
    });
    setZoomIdx((currentZoomIdx) => {
      if (currentZoomIdx == null) return null;
      if (previewUrls.length === 0) return null;
      return Math.min(currentZoomIdx, previewUrls.length - 1);
    });
  }, [previewUrls.length]);

  const prev = () => setIdx((p) => (p - 1 + previewUrls.length) % previewUrls.length);
  const next = () => setIdx((p) => (p + 1) % previewUrls.length);

  return (
    <>
      <div className="ovd-doc-viewer">
        {previewUrls.length > 0 ? (
          <div className="ovd-doc-stage">
            <button
              type="button"
              className="ovd-doc-stage-link"
              onClick={() => setZoomIdx(idx)}
              aria-label="Zoom ảnh"
              style={{ border: "none", width: "100%", background: "transparent", cursor: "zoom-in" }}
            >
              <img
                src={previewUrls[idx]}
                alt={`${title} ${idx + 1}`}
                className="ovd-doc-stage-img"
              />
            </button>
            <button
              type="button"
              className="ovd-doc-remove-floating"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(idx);
              }}
              aria-label="Xóa ảnh đang chọn"
            >
              <X size={14} />
            </button>
            {previewUrls.length > 1 ? (
              <>
                <button
                  type="button"
                  className="ovd-doc-nav ovd-doc-nav--left"
                  onClick={prev}
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="ovd-doc-nav ovd-doc-nav--right"
                  onClick={next}
                  aria-label="Ảnh kế tiếp"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}
            <span className="ovd-doc-counter">
              {idx + 1} / {previewUrls.length}
            </span>
          </div>
        ) : null}
        <ul className="ovd-doc-thumbstrip" role="tablist" aria-label="Chọn ảnh xem nhanh">
          {previewUrls.map((url, imageIdx) => (
            <li
              key={`${safeFiles[imageIdx]?.name || "image"}-${safeFiles[imageIdx]?.lastModified ?? imageIdx}-${imageIdx}`}
              role="none"
              className="ovd-doc-thumb-item"
            >
              <button
                type="button"
                role="tab"
                aria-selected={imageIdx === idx}
                className={`ovd-doc-thumbstrip-btn ${imageIdx === idx ? "is-active" : ""}`}
                onClick={() => setIdx(imageIdx)}
              >
                <img src={url} alt="" />
              </button>
              <button
                type="button"
                className="ovd-doc-thumb-remove"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(imageIdx);
                }}
                aria-label={`Xóa ảnh ${imageIdx + 1}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
          <li role="none" className="ovd-doc-thumb-item ovd-doc-thumb-item--upload">
            <DocumentUploadPicker
              inputId={inputId}
              disabled={disabled}
              currentCount={safeFiles.length}
              maxImages={maxImages}
              onChange={onAddChange}
              compact
            />
          </li>
        </ul>
      </div>

      {zoomIdx != null && previewUrls.length > 0 ? (
        <div
          className="ovd-lightbox-overlay"
          onClick={() => setZoomIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="ovd-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ovd-lightbox-close"
              onClick={() => setZoomIdx(null)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <img
              src={previewUrls[zoomIdx]}
              alt={`${title} ${zoomIdx + 1}`}
              className="ovd-lightbox-img"
            />
          </div>
        </div>
      ) : null}
    </>
  );
};

const DocumentUploadPicker = ({ inputId, disabled, currentCount, maxImages = 5, onChange, compact = false }) => (
  <div className="ovd-upload-picker-wrap">
    <input
      id={inputId}
      type="file"
      className="ovd-upload-input"
      accept="image/*"
      multiple
      disabled={disabled}
      onChange={onChange}
    />
    <label
      htmlFor={inputId}
      className={`ovd-upload-picker ${compact ? "is-compact" : ""} ${disabled ? "is-disabled" : ""}`}
      aria-disabled={disabled}
    >
      <Plus size={compact ? 18 : 28} strokeWidth={2.2} />
      <span className="ovd-upload-picker-title">Thêm ảnh</span>
      <span className="ovd-upload-picker-meta">{currentCount}/{maxImages} ảnh</span>
    </label>
  </div>
);

const OwnerEditVenue = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    openTime: "",
    closeTime: "",
    thumbnailUrl: "",
    thumbnailFile: null,
  });
  const [statusLower, setStatusLower] = useState("");

  const initialFormRef = useRef({
    name: "",
    description: "",
    openTime: "",
    closeTime: "",
    thumbnailUrl: "",
  });

  const canEdit = useMemo(() => ["active", "draft"].includes(statusLower), [statusLower]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const draft = await getVenueDraft(id);
        if (!mounted) return;

        setStatusLower(String(draft?.status ?? draft?.Status ?? "").toLowerCase().trim());
        const thumbnailUrl = draft?.thumbnailImage ?? draft?.ThumbnailImage ?? "";

        const nextForm = {
          name: draft?.name ?? draft?.Name ?? "",
          description: draft?.description ?? draft?.Description ?? "",
          openTime: toInputTime(draft?.openTime ?? draft?.OpenTime ?? ""),
          closeTime: toInputTime(draft?.closeTime ?? draft?.CloseTime ?? ""),
          thumbnailUrl,
          thumbnailFile: null,
        };

        setForm(nextForm);
        initialFormRef.current = {
          name: nextForm.name,
          description: nextForm.description,
          openTime: nextForm.openTime,
          closeTime: nextForm.closeTime,
          thumbnailUrl: nextForm.thumbnailUrl,
        };
      } catch (e) {
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được dữ liệu cơ sở.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);



  const onSave = async () => {
    if (!canEdit) {
      toast.error("Chỉ trạng thái active hoặc draft mới được chỉnh sửa.");
      return;
    }
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên cơ sở.");
    if (!form.openTime || !form.closeTime) return toast.error("Vui lòng nhập giờ mở và giờ đóng.");
    if (form.closeTime <= form.openTime) return toast.error("Giờ đóng phải sau giờ mở.");

    setSaving(true);
    try {
      await updateOwnerVenueInfo(id, {
        name: form.name.trim(),
        description: form.description?.trim() || "",
        openTime: `${form.openTime}:00`,
        closeTime: `${form.closeTime}:00`,
        thumbnailFile: form.thumbnailFile,
      });
      toast.success("Đã cập nhật thông tin cơ sở.");
      navigate(`/owner/venues/${id}`);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không cập nhật được cơ sở.");
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    if (loading) return false;
    const initial = initialFormRef.current;
    return (
      form.name !== initial.name ||
      form.description !== initial.description ||
      form.openTime !== initial.openTime ||
      form.closeTime !== initial.closeTime ||
      form.thumbnailFile !== null
    );
  }, [form, loading]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const confirmLeavePage = () => {
    if (!hasUnsavedChanges) return true;
    return window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?");
  };

  const navigateToVenueDetail = () => {
    if (!confirmLeavePage()) return;
    navigate(`/owner/venues/${id}`);
  };



  return (
    <div className="owner-venue-detail">
      <div className="ovd-header">
        <button className="ovd-back" onClick={navigateToVenueDetail}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="ovd-actions">
          <button type="button" className="ovd-btn ovd-btn--secondary" onClick={navigateToVenueDetail}>
            Chi tiết cơ sở
          </button>
        </div>
      </div>

      <div className="ovd-card">
        <h3 className="ovd-subtitle">
          <Building2 size={18} /> Chỉnh sửa thông tin cơ sở
        </h3>
        {loading ? (
          <p className="ovd-muted">Đang tải dữ liệu...</p>
        ) : (
          <>
            {!canEdit ? (
              <p className="ovd-muted">
                Cơ sở đang ở trạng thái <strong>{statusLower || "không xác định"}</strong> nên không thể chỉnh sửa.
              </p>
            ) : null}
            <div className="ovd-create-grid">
              <label className="ovd-label ovd-full">
                Tên cơ sở
                <input
                  className="ovd-input"
                  value={form.name}
                  disabled={!canEdit}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <TimeSegmentField
                label="Giờ mở"
                value={form.openTime}
                disabled={!canEdit}
                onChange={(nextValue) => setForm((p) => ({ ...p, openTime: nextValue }))}
              />
              <TimeSegmentField
                label="Giờ đóng"
                value={form.closeTime}
                disabled={!canEdit}
                onChange={(nextValue) => setForm((p) => ({ ...p, closeTime: nextValue }))}
              />
              <div className="ovd-label ovd-full">
                <span className="ovd-time-label">Ảnh đại diện (Thumbnail)</span>
                <div className="ovd-thumbnail-edit">
                  {(form.thumbnailFile || form.thumbnailUrl) && (
                    <div className="ovd-thumbnail-preview">
                      <img
                        src={form.thumbnailFile ? URL.createObjectURL(form.thumbnailFile) : form.thumbnailUrl}
                        alt="Thumbnail preview"
                      />
                      {form.thumbnailFile && (
                        <button
                          type="button"
                          className="ovd-remove-thumb"
                          onClick={() => setForm(p => ({ ...p, thumbnailFile: null }))}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  <label className="ovd-upload-trigger">
                    <Plus size={20} />
                    <span>{form.thumbnailFile || form.thumbnailUrl ? "Thay đổi ảnh" : "Chọn ảnh đại diện"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={!canEdit}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setForm(p => ({ ...p, thumbnailFile: file }));
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <label className="ovd-label ovd-full">
                Mô tả
                <textarea
                  className="ovd-input"
                  rows={6}
                  placeholder="Nhập mô tả về cơ sở của bạn..."
                  value={form.description}
                  disabled={!canEdit}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>



            <div className="ovd-create-actions">
              <button
                type="button"
                className="ovd-btn ovd-btn--secondary"
                disabled={saving}
                onClick={navigateToVenueDetail}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ovd-btn ovd-btn--primary"
                disabled={!canEdit || saving}
                onClick={onSave}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OwnerEditVenue;

