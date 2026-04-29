import React, { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Building2, Check, ChevronDown, MapPin, MapPinned, Plus, X } from "lucide-react";

// Fix Leaflet default marker icons (Vite/CRA asset resolution)
try {
  // eslint-disable-next-line no-underscore-dangle
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  });
} catch {
  // ignore (SSR/test)
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      if (!e?.latlng) return;
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapViewportController({ center, shouldAnimate }) {
  const map = useMap();
  const lastCenterRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) return;
    const [lat, lng] = center;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const nextKey = `${lat}:${lng}`;
    if (lastCenterRef.current === nextKey) return;
    lastCenterRef.current = nextKey;

    if (shouldAnimate) {
      map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 1.2 });
      return;
    }

    map.setView(center, map.getZoom());
  }, [center, map, shouldAnimate]);

  return null;
}

function splitTimeParts(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  const safeHours = match ? Number(match[1]) : 5;
  const safeMinutes = match ? match[2] : "00";
  return {
    hours: String(safeHours).padStart(2, "0"),
    minutes: safeMinutes === "30" ? "30" : "00",
  };
}

function joinTimeParts(hoursText, minutesText) {
  const hours = Number(hoursText);
  const safeHours = Number.isFinite(hours) && hours >= 0 && hours <= 23 ? hours : 0;
  return `${String(safeHours).padStart(2, "0")}:${minutesText === "30" ? "30" : "00"}`;
}

const TIME_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const value = String(index).padStart(2, "0");
  return { value, label: `${index} giờ` };
});

const TIME_MINUTE_OPTIONS = [
  { value: "00", label: "00 phút" },
  { value: "30", label: "30 phút" },
];

function SegmentedDropdown({ value, options, onChange, ariaLabel, className = "" }) {
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

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`cv-time-dropdown ${className}${isOpen ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="cv-time-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="cv-time-dropdown-value">{selectedOption.label}</span>
        <ChevronDown size={18} className="cv-time-dropdown-chevron" aria-hidden />
      </button>
      {isOpen ? (
        <div className="cv-time-dropdown-panel" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`cv-time-dropdown-option${isSelected ? " active" : ""}`}
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

function TimeSegmentField({ name, label, value, register, setValue, error }) {
  const parts = splitTimeParts(value);

  const updateTime = (nextParts) => {
    setValue(name, joinTimeParts(nextParts.hours, nextParts.minutes), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="cv-form-group cv-time-field cv-full-width">
      <label>
        {label} <span className="cv-required">*</span>
      </label>
      <input type="hidden" {...register(name)} value={value} readOnly />
      <div className="cv-time-segments" aria-label={label}>
        <SegmentedDropdown
          className="cv-time-segment cv-time-segment--hour"
          value={parts.hours}
          options={TIME_HOUR_OPTIONS}
          ariaLabel={`${label} - giờ`}
          onChange={(nextHours) => updateTime({ ...parts, hours: nextHours })}
        />
        <SegmentedDropdown
          className="cv-time-segment cv-time-segment--minute"
          value={parts.minutes}
          options={TIME_MINUTE_OPTIONS}
          ariaLabel={`${label} - phút`}
          onChange={(nextMinutes) => updateTime({ ...parts, minutes: nextMinutes })}
        />
      </div>
      <p className="cv-time-hint">Chọn theo dạng 24 giờ và phút, mỗi 30 phút một mốc</p>
      {error ? <p className="cv-error-text">{error.message}</p> : null}
    </div>
  );
}

/**
 * Bước 1: Thông tin cơ sở + địa chỉ + bản đồ
 */
export default function CreateVenueStepBasic({
  register: reg,
  errors,
  handleSubmit,
  onSubmit,
  setValue,
  openTimeValue,
  closeTimeValue,
  thumbnailFile,
  setThumbnailFile,
  thumbnailPreviewUrl,
  thumbnailInputRef,
  provinceOptions,
  districtOptions,
  loadingProvinces,
  loadingDistricts,
  selectedProvinceId,
  lat,
  lng,
  hasCoords,
  pickedPosition,
  pickCoords,
  useMyLocation,
  isLocating,
  isLocationButtonDisabled = false,
  isSubmitting,
  onCancel,
  /** Ảnh đại diện đã có trên server (tiếp tục từ bản nháp) */
  existingThumbnailUrl = "",
  /** Đã có venue nháp — bước 1 sẽ cập nhật thay vì tạo mới */
  isEditingExistingDraft = false,
}) {
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <div className="cv-card">
          <h3 className="cv-card-title">
            <Building2 size={20} /> Thông tin cơ bản
          </h3>
          <div className="cv-form-grid">
          <div className="cv-form-group cv-full-width">
            <label>
              Tên cơ sở <span className="cv-required">*</span>
            </label>
            <input type="text" placeholder="VD: Sân Bóng Đá Milan" {...reg("name")} />
            {errors.name ? <p className="cv-error-text">{errors.name.message}</p> : null}
          </div>

          <div className="cv-form-group cv-full-width">
            <label>Mô tả</label>
            <textarea placeholder="Giới thiệu ngắn về cơ sở..." rows={3} {...reg("description")} />
          </div>

          <div className="cv-form-group cv-full-width">
            
            <span className="cv-doc-gallery-label">
              Ảnh đại diện cơ sở
             
            </span>
            <ul className="cv-doc-gallery cv-doc-gallery--thumbnail" aria-label="Ảnh đại diện cơ sở">
              {thumbnailPreviewUrl ? (
                <li className="cv-doc-gallery-item">
                  <div className="cv-doc-gallery-tile cv-doc-gallery-tile--thumbnail">
                    <img
                      src={thumbnailPreviewUrl}
                      alt="Xem trước ảnh đại diện cơ sở"
                      title={thumbnailFile?.name || "Ảnh đại diện cơ sở"}
                    />
                    <button
                      type="button"
                      className="cv-doc-gallery-remove"
                      aria-label="Xóa ảnh đại diện"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setThumbnailFile(null);
                        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
                      }}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </li>
              ) : null}
              {!thumbnailPreviewUrl && existingThumbnailUrl ? (
                <li className="cv-doc-gallery-item">
                  <div className="cv-doc-gallery-tile cv-doc-gallery-tile--server cv-doc-gallery-tile--thumbnail">
                    <img src={existingThumbnailUrl} alt="Ảnh đại diện đang dùng" />
                    <span className="cv-doc-gallery-badge">Đã lưu</span>
                  </div>
                </li>
              ) : null}
              {!thumbnailPreviewUrl ? (
                <li className="cv-doc-gallery-item cv-doc-gallery-item--add">
                  <label className="cv-doc-gallery-add cv-doc-gallery-add--thumbnail">
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      className="cv-doc-file-input-sr-only"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                    />
                    <Plus size={26} strokeWidth={2.2} aria-hidden />
                    <span className="cv-doc-gallery-add-text">Thêm ảnh</span>
                  </label>
                </li>
              ) : null}
            </ul>
            {!thumbnailPreviewUrl && existingThumbnailUrl ? (
              <p className="cv-wizard-hint cv-doc-gallery-hint">
                Ảnh đại diện đang dùng (đã lưu trên máy chủ).
              </p>
            ) : null}
          </div>

          <TimeSegmentField
            name="openTime"
            label="Giờ mở cửa"
            value={openTimeValue}
            register={reg}
            setValue={setValue}
            error={errors.openTime}
          />

          <TimeSegmentField
            name="closeTime"
            label="Giờ đóng cửa"
            value={closeTimeValue}
            register={reg}
            setValue={setValue}
            error={errors.closeTime}
          />
          </div>
        </div>

        <div className="cv-card">
          <h3 className="cv-card-title">
            <MapPin size={20} /> Địa chỉ
          </h3>
          <div className="cv-form-grid">
          <div className="cv-form-group">
            <label>
              Tỉnh / Thành phố <span className="cv-required">*</span>
            </label>
            <select
              {...reg("provinceId")}
              onChange={(e) => {
                setValue("provinceId", e.target.value);
                setValue("wardId", "");
              }}
            >
              <option value="">-- Chọn tỉnh/thành --</option>
              {provinceOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {loadingProvinces ? <p className="cv-wizard-hint">Đang tải tỉnh/thành...</p> : null}
            {errors.provinceId ? <p className="cv-error-text">{errors.provinceId.message}</p> : null}
          </div>

          <div className="cv-form-group">
            <label>
              Quận / Huyện <span className="cv-required">*</span>
            </label>
            <select {...reg("wardId")} disabled={!selectedProvinceId || loadingDistricts}>
              <option value="">-- Chọn quận/huyện --</option>
              {districtOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {loadingDistricts ? <p className="cv-wizard-hint">Đang tải quận/huyện...</p> : null}
            {errors.wardId ? <p className="cv-error-text">{errors.wardId.message}</p> : null}
          </div>

          <div className="cv-form-group cv-full-width">
            <label>
              Địa chỉ chi tiết <span className="cv-required">*</span>
            </label>
            <input type="text" placeholder="Số nhà, đường, tòa nhà..." {...reg("addressDetail")} />
            {errors.addressDetail ? (
              <p className="cv-error-text">{errors.addressDetail.message}</p>
            ) : null}
          </div>

          <div className="cv-map-section">
            <h3>
              <MapPinned size={18} /> Vị trí trên bản đồ
            </h3>
            <div className="cv-map-actions">
            </div>
            <div className="cv-map-wrapper">
              <button
                type="button"
                className="cv-map-btn cv-map-btn--overlay"
                onClick={useMyLocation}
                disabled={isLocationButtonDisabled}
                aria-busy={isLocating}
              >
                {isLocating ? "Đang định vị..." : "Dùng vị trí hiện tại"}
              </button>
              <MapContainer
                center={pickedPosition}
                zoom={16}
                scrollWheelZoom={true}
                className="cv-map-leaflet"
              >
                <MapViewportController center={pickedPosition} shouldAnimate={hasCoords} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onPick={pickCoords} />
                {hasCoords ? (
                  <Marker
                    position={pickedPosition}
                    draggable={true}
                    eventHandlers={{
                      dragend: (ev) => {
                        const p = ev?.target?.getLatLng?.();
                        if (p) pickCoords(p.lat, p.lng);
                      },
                    }}
                  />
                ) : null}
              </MapContainer>
            </div>
            <p className="cv-wizard-hint" style={{ margin: "10px 0 0 0" }}>
              Bạn có thể <strong>chấm/click lên bản đồ</strong> hoặc <strong>kéo marker</strong> để tự điền
              vĩ độ/kinh độ.
            </p>
          </div>
          </div>
        </div>
      </fieldset>

      <div className="cv-submit-section">
        <button type="button" className="cv-cancel-btn" onClick={onCancel} disabled={isSubmitting}>
          Hủy bỏ
        </button>
        <button type="submit" className="cv-submit-btn" disabled={isSubmitting}>
          {isSubmitting
            ? isEditingExistingDraft
              ? "Đang cập nhật..."
              : "Đang tạo..."
            : isEditingExistingDraft
              ? "Cập nhật & Tiếp theo"
              : "Lưu & Tiếp theo"}
        </button>
      </div>
    </form>
  );
}
