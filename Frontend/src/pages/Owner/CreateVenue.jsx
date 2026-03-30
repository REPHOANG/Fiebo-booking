import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  ArrowLeft,
  MapPin,
  Building2,
  MapPinned,
  LayoutList,
  Trash2,
} from "lucide-react";
import { addVenueDocuments, createVenue, submitVenue } from "../../services/venueService";
import "./CreateVenue.css";

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

// ── Yup Validation (Step 1: Create Venue draft) ──
const schema = yup.object({
  name: yup
    .string()
    .trim()
    .min(3, "Tên cơ sở ít nhất 3 ký tự")
    .required("Vui lòng nhập tên cơ sở"),
  description: yup.string().optional(),
  openTime: yup.string().required("Vui lòng nhập giờ mở cửa"),
  closeTime: yup
    .string()
    .required("Vui lòng nhập giờ đóng cửa")
    .test("after-open", "Giờ đóng phải sau giờ mở", function (value) {
      const { openTime } = this.parent;
      if (!openTime || !value) return true;
      return value > openTime;
    }),
  provinceId: yup
    .number()
    .typeError("Vui lòng chọn tỉnh/thành")
    .required("Vui lòng chọn tỉnh/thành"),
  wardId: yup
    .number()
    .typeError("Vui lòng chọn phường/xã")
    .required("Vui lòng chọn phường/xã"),
  addressDetail: yup.string().trim().required("Vui lòng nhập địa chỉ chi tiết"),
  latitude: yup
    .number()
    .typeError("Vĩ độ phải là số")
    .min(-90, "Vĩ độ từ -90 đến 90")
    .max(90, "Vĩ độ từ -90 đến 90")
    .required("Vui lòng nhập vĩ độ"),
  longitude: yup
    .number()
    .typeError("Kinh độ phải là số")
    .min(-180, "Kinh độ từ -180 đến 180")
    .max(180, "Kinh độ từ -180 đến 180")
    .required("Vui lòng nhập kinh độ"),
});

const PROVINCES = [
  { id: 1, name: "Hà Nội" },
  { id: 2, name: "TP. Hồ Chí Minh" },
  { id: 3, name: "Đà Nẵng" },
];

const WARDS_BY_PROVINCE = {
  1: [
    { id: 1, name: "Cầu Giấy" },
    { id: 2, name: "Thanh Xuân" },
    { id: 3, name: "Đống Đa" },
    { id: 4, name: "Ba Đình" },
    { id: 5, name: "Hoàn Kiếm" },
  ],
  2: [
    { id: 6, name: "Quận 1" },
    { id: 7, name: "Quận 3" },
    { id: 8, name: "Quận 7" },
    { id: 9, name: "Thủ Đức" },
  ],
  3: [
    { id: 10, name: "Hải Châu" },
    { id: 11, name: "Thanh Khê" },
    { id: 12, name: "Sơn Trà" },
  ],
};

/** Khớp DTO backend: LandUseDocument + BusinessDocument (ảnh là file, không phải URL) */
const DOC_SLOTS = [
  { apiPrefix: "LandUseDocument", label: "Giấy tờ sử dụng đất" },
  { apiPrefix: "BusinessDocument", label: "Giấy phép kinh doanh" },
];

const STEPS = ["Tạo cơ sở", "Giấy tờ", "Xác nhận"];

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      if (!e?.latlng) return;
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Component ──
function normalizeTimeForApi(t) {
  if (!t || typeof t !== "string") return "";
  const s = t.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

const CreateVenue = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [createdVenue, setCreatedVenue] = useState(null); // { venueId, status }
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const venueId = createdVenue?.venueId ?? createdVenue?.VenueId ?? null;

  const [docs, setDocs] = useState(() =>
    DOC_SLOTS.map((s) => ({
      apiPrefix: s.apiPrefix,
      label: s.label,
      issueDate: "",
      expiryDate: "",
      files: [],
    }))
  );

  const {
    register: reg,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      openTime: "05:00",
      closeTime: "22:00",
      provinceId: "",
      wardId: "",
      addressDetail: "",
      latitude: 21.0285,
      longitude: 105.8542,
    },
  });

  const selectedProvinceId = watch("provinceId");
  const wards = WARDS_BY_PROVINCE[selectedProvinceId] || [];

  const lat = Number(watch("latitude"));
  const lng = Number(watch("longitude"));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const pickedPosition = useMemo(() => (hasCoords ? [lat, lng] : [21.0285, 105.8542]), [hasCoords, lat, lng]);

  const pickCoords = useCallback(
    (nextLat, nextLng) => {
      const a = Number(nextLat);
      const o = Number(nextLng);
      if (!Number.isFinite(a) || !Number.isFinite(o)) return;
      setValue("latitude", a, { shouldValidate: true, shouldDirty: true });
      setValue("longitude", o, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const useMyLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị (geolocation).");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const a = pos?.coords?.latitude;
        const o = pos?.coords?.longitude;
        pickCoords(a, o);
        toast.success("Đã lấy vị trí hiện tại.");
      },
      (err) => {
        toast.error(err?.message || "Không lấy được vị trí hiện tại.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [pickCoords]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append("Name", String(data.name || "").trim());
      form.append("OpenTime", normalizeTimeForApi(data.openTime));
      form.append("CloseTime", normalizeTimeForApi(data.closeTime));
      if (data.description != null && String(data.description).trim() !== "") {
        form.append("Description", String(data.description).trim());
      }
      form.append("AddressDetail", String(data.addressDetail || "").trim());
      form.append("ProvinceId", String(Number(data.provinceId)));
      form.append("WardId", String(Number(data.wardId)));
      form.append("Latitude", String(Number(data.latitude)));
      form.append("Longitude", String(Number(data.longitude)));
      if (thumbnailFile) form.append("Thumbnail", thumbnailFile);

      const result = await createVenue(form);
      const id = result?.venueId ?? result?.VenueId;
      const status = result?.status ?? result?.Status ?? "DRAFT";
      if (id) {
        toast.success(`Tạo cơ sở thành công  #${id}`);
        setCreatedVenue({ venueId: id, status });
        setActiveStep(1);
      } else {
        toast.error("Phản hồi API thiếu venueId.");
      }
    } catch (err) {
      console.error("Create venue error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        "Tạo cơ sở thất bại. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDocsAndNext = async () => {
    if (!venueId) return;
    setIsSubmitting(true);
    try {
      const missingDate = docs.find((d) => !d.issueDate || !d.expiryDate);
      if (missingDate) {
        toast.error(`Vui lòng nhập đủ ngày cấp và ngày hết hạn cho "${missingDate.label}".`);
        return;
      }
      const missingFiles = docs.find((d) => !d.files || d.files.length === 0);
      if (missingFiles) {
        toast.error(`Vui lòng tải lên ít nhất 1 ảnh cho "${missingFiles.label}".`);
        return;
      }
      const tooMany = docs.find((d) => d.files.length > 5);
      if (tooMany) {
        toast.error(`Mỗi loại giấy tờ tối đa 5 ảnh ("${tooMany.label}").`);
        return;
      }

      const form = new FormData();
      docs.forEach((d) => {
        form.append(`${d.apiPrefix}.IssueDate`, d.issueDate);
        form.append(`${d.apiPrefix}.ExpiryDate`, d.expiryDate);
        d.files.forEach((file) => {
          if (file) form.append(`${d.apiPrefix}.Images`, file);
        });
      });

      await addVenueDocuments(venueId, form);
      toast.success("Đã tải lên giấy tờ.");
      setActiveStep(2);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.response?.data?.Message || e?.message || "Không lưu được giấy tờ."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const doSubmitVenue = async () => {
    if (!venueId) return;
    setIsSubmitting(true);
    try {
      await submitVenue(venueId);
      toast.success("Đã gửi duyệt cơ sở.");
      navigate("/owner/venues");
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.response?.data?.Message || e?.message || "Không gửi duyệt được."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const review = useMemo(() => {
    const v = watch();
    return {
      venueId,
      name: v.name,
      openTime: v.openTime,
      closeTime: v.closeTime,
      addressDetail: v.addressDetail,
      provinceId: v.provinceId,
      wardId: v.wardId,
      latitude: v.latitude,
      longitude: v.longitude,
      thumbnailName: thumbnailFile?.name || null,
      docsCount: docs.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, docs.length, activeStep, thumbnailFile]);

  return (
    <div className="create-venue-page">
      <div className="cv-container">
        {/* ── Header ── */}
        <div className="cv-header">
          <button className="cv-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Tạo cơ sở mới</h1>
            <p>Thực hiện theo 3 bước để gửi duyệt cơ sở</p>
          </div>
        </div>

        <div className="cv-stepper" aria-label="Các bước tạo cơ sở">
          {STEPS.map((t, idx) => (
            <div key={t} className={`cv-step${idx === activeStep ? " active" : ""}${idx < activeStep ? " done" : ""}`}>
              <div className="cv-step-dot">{idx < activeStep ? "✓" : idx + 1}</div>
              <div className="cv-step-title">{t}</div>
            </div>
          ))}
        </div>

        {activeStep === 0 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── Card 1: Thông tin cơ bản ── */}
          <div className="cv-card">
            <h3 className="cv-card-title">
              <Building2 size={20} /> Thông tin cơ bản
            </h3>
            <div className="cv-form-grid">
              <div className="cv-form-group cv-full-width">
                <label>
                  Tên cơ sở <span className="cv-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Sân Bóng Đá Milan"
                  {...reg("name")}
                />
                {errors.name && (
                  <p className="cv-error-text">{errors.name.message}</p>
                )}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Mô tả</label>
                <textarea
                  placeholder="Giới thiệu ngắn về cơ sở..."
                  rows={3}
                  {...reg("description")}
                />
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Ảnh đại diện cơ sở (tùy chọn)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                />
                {thumbnailFile ? (
                  <p className="cv-wizard-hint" style={{ marginTop: 8 }}>
                    Đã chọn: <strong>{thumbnailFile.name}</strong>
                  </p>
                ) : null}
              </div>

              <div className="cv-form-group">
                <label>
                  Giờ mở cửa <span className="cv-required">*</span>
                </label>
                <input type="time" {...reg("openTime")} />
                {errors.openTime && (
                  <p className="cv-error-text">{errors.openTime.message}</p>
                )}
              </div>

              <div className="cv-form-group">
                <label>
                  Giờ đóng cửa <span className="cv-required">*</span>
                </label>
                <input type="time" {...reg("closeTime")} />
                {errors.closeTime && (
                  <p className="cv-error-text">{errors.closeTime.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Card 2: Địa chỉ ── */}
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
                  {PROVINCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.provinceId && (
                  <p className="cv-error-text">{errors.provinceId.message}</p>
                )}
              </div>

              <div className="cv-form-group">
                <label>
                  Quận / Huyện <span className="cv-required">*</span>
                </label>
                <select {...reg("wardId")} disabled={!selectedProvinceId}>
                  <option value="">-- Chọn quận/huyện --</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {errors.wardId && (
                  <p className="cv-error-text">{errors.wardId.message}</p>
                )}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>
                  Địa chỉ chi tiết <span className="cv-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, tòa nhà..."
                  {...reg("addressDetail")}
                />
                {errors.addressDetail && (
                  <p className="cv-error-text">
                    {errors.addressDetail.message}
                  </p>
                )}
              </div>

              {/* <div className="cv-form-group">
                <label>
                  Vĩ độ (Latitude) <span className="cv-required">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="21.0285"
                  {...reg("latitude")}
                />
                {errors.latitude && (
                  <p className="cv-error-text">{errors.latitude.message}</p>
                )}
              </div> */}

              {/* <div className="cv-form-group">
                <label>
                  Kinh độ (Longitude) <span className="cv-required">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="105.8542"
                  {...reg("longitude")}
                />
                {errors.longitude && (
                  <p className="cv-error-text">{errors.longitude.message}</p>
                )}

               
              </div> */}
              <div className="cv-map-section">
                <h3>
                  <MapPinned size={18} /> Vị trí trên bản đồ
                </h3>
                <div className="cv-map-actions">
                  <button type="button" className="cv-map-btn" onClick={useMyLocation}>
                    Dùng vị trí hiện tại
                  </button>
                  {hasCoords ? (
                    <a
                      className="cv-map-link"
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin size={14} /> Mở trong Google Maps
                    </a>
                  ) : null}
                </div>
                <div className="cv-map-wrapper">
                  <MapContainer
                    center={pickedPosition}
                    zoom={16}
                    scrollWheelZoom={true}
                    className="cv-map-leaflet"
                  >
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
                  Bạn có thể <strong>chấm/click lên bản đồ</strong> hoặc <strong>kéo marker</strong> để tự điền vĩ độ/kinh độ.
                </p>
              </div>

            </div>
          </div>

          {/* ── Submit ── */}
          <div className="cv-submit-section">
            <button
              type="button"
              className="cv-cancel-btn"
              onClick={() => navigate(-1)}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cv-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang tạo..." : "Lưu & Tiếp theo"}
            </button>
          </div>
        </form>
        )}

        {activeStep === 1 && (
          <div className="cv-card">
            <h3 className="cv-card-title">
              <LayoutList size={20} /> Giấy tờ (Documents + Images)
            </h3>
            {!venueId ? (
              <p className="cv-error-text">Chưa có venueId. Vui lòng quay lại bước 1.</p>
            ) : (
              <>
                <div className="cv-wizard-hint">
                  Venue #{venueId} · Trạng thái: <strong>{createdVenue?.status ?? "DRAFT"}</strong>
                </div>
                <div className="cv-docs">
                  {docs.map((d, di) => (
                    <div key={d.apiPrefix} className="cv-doc-card">
                      <div className="cv-doc-head">
                        <strong>{d.label}</strong>
                      </div>
                      <div className="cv-form-grid">
                        <div className="cv-form-group">
                          <label>
                            Ngày cấp <span className="cv-required">*</span>
                          </label>
                          <input
                            type="date"
                            value={d.issueDate}
                            onChange={(e) =>
                              setDocs((p) => p.map((x, i) => (i === di ? { ...x, issueDate: e.target.value } : x)))
                            }
                          />
                        </div>
                        <div className="cv-form-group">
                          <label>
                            Ngày hết hạn <span className="cv-required">*</span>
                          </label>
                          <input
                            type="date"
                            value={d.expiryDate}
                            onChange={(e) =>
                              setDocs((p) => p.map((x, i) => (i === di ? { ...x, expiryDate: e.target.value } : x)))
                            }
                          />
                        </div>
                        <div className="cv-form-group cv-full-width">
                          <label>
                            Ảnh giấy tờ (file, tối đa 5) <span className="cv-required">*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const picked = Array.from(e.target.files || []).filter(Boolean);
                              setDocs((p) =>
                                p.map((x, i) => (i === di ? { ...x, files: [...x.files, ...picked].slice(0, 5) } : x))
                              );
                              e.target.value = "";
                            }}
                          />
                          {d.files?.length ? (
                            <ul className="cv-doc-file-list">
                              {d.files.map((f, fi) => (
                                <li key={`${f.name}-${fi}`} className="cv-doc-image-row">
                                  <span>{f.name}</span>
                                  <button
                                    type="button"
                                    className="cv-doc-remove-img"
                                    aria-label="Xóa ảnh"
                                    onClick={() =>
                                      setDocs((p) =>
                                        p.map((x, i) =>
                                          i === di ? { ...x, files: x.files.filter((_, j) => j !== fi) } : x
                                        )
                                      )
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="cv-wizard-hint">Chưa có file nào.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cv-submit-section">
                  <button type="button" className="cv-cancel-btn" onClick={() => setActiveStep(0)} disabled={isSubmitting}>Quay lại</button>
                  <button type="button" className="cv-submit-btn" onClick={saveDocsAndNext} disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : "Lưu & Tiếp tục"}</button>
                </div>
              </>
            )}
          </div>
        )}

        {activeStep === 2 && (
          <div className="cv-card">
            <h3 className="cv-card-title">
              <Building2 size={20} /> Review &amp; Submit
            </h3>
            <div className="cv-review">
              <div className="cv-review-row"><strong>VenueId:</strong> {review.venueId}</div>
              <div className="cv-review-row"><strong>Tên:</strong> {review.name}</div>
              <div className="cv-review-row"><strong>Giờ:</strong> {review.openTime} – {review.closeTime}</div>
              <div className="cv-review-row"><strong>Địa chỉ:</strong> {review.addressDetail}</div>
              <div className="cv-review-row">
                <strong>Ảnh đại diện:</strong> {review.thumbnailName || "Không tải"}
              </div>
              <div className="cv-review-row"><strong>Giấy tờ:</strong> {review.docsCount} loại</div>
            </div>
            <div className="cv-submit-section">
              <button type="button" className="cv-cancel-btn" onClick={() => setActiveStep(1)} disabled={isSubmitting}>Quay lại</button>
              <button type="button" className="cv-submit-btn" onClick={doSubmitVenue} disabled={isSubmitting}>{isSubmitting ? "Đang gửi..." : "Gửi duyệt"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateVenue;
