import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { Select } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  Check,
  Plus,
  Search,
  X,
  MapPinned,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getVenueDraft,
  updateOwnerVenueInfo,
  updateOwnerDocument,
  addVenueDocuments,
  submitVenue,
} from "../../../services/venueService";
import {
  getDistrictsByProvince,
  getProvinces,
} from "../../../services/addressService";
import "./CreateVenue.css";
import { Alert, AlertTitle } from "@mui/material";

// Fix Leaflet default marker icons
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL(
      "leaflet/dist/images/marker-icon-2x.png",
      import.meta.url,
    ).toString(),
    iconUrl: new URL(
      "leaflet/dist/images/marker-icon.png",
      import.meta.url,
    ).toString(),
    shadowUrl: new URL(
      "leaflet/dist/images/marker-shadow.png",
      import.meta.url,
    ).toString(),
  });
} catch {
  // ignore
}

// Helpers for map
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
  useEffect(() => {
    if (!center || !Array.isArray(center) || center.length !== 2) return;
    if (shouldAnimate) {
      map.flyTo(center, 16, { duration: 1.2 });
    } else {
      map.setView(center, map.getZoom());
    }
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
  const safeHours =
    Number.isFinite(hours) && hours >= 0 && hours <= 23 ? hours : 0;
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

function SegmentedDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  disabled = false,
}) {
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

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className={`cv-time-dropdown ${className}${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="cv-time-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((open) => !open);
        }}
      >
        <span className="cv-time-dropdown-value">{selectedOption.label}</span>
        <ChevronDown
          size={18}
          className="cv-time-dropdown-chevron"
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div
          className="cv-time-dropdown-panel"
          role="listbox"
          aria-label={ariaLabel}
        >
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
                {isSelected ? (
                  <Check size={16} strokeWidth={2.5} aria-hidden />
                ) : null}
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
    onChange(joinTimeParts(nextParts.hours, nextParts.minutes));
  };

  return (
    <div className="cv-form-group cv-time-field cv-full-width">
      <label>
        {label} <span className="cv-required">*</span>
      </label>
      <div className="cv-time-segments" aria-label={label}>
        <SegmentedDropdown
          className="cv-time-segment cv-time-segment--hour"
          value={parts.hours}
          options={TIME_HOUR_OPTIONS}
          ariaLabel={`${label} - giờ`}
          disabled={disabled}
          onChange={(nextHours) => updateTime({ ...parts, hours: nextHours })}
        />
        <SegmentedDropdown
          className="cv-time-segment cv-time-segment--minute"
          value={parts.minutes}
          options={TIME_MINUTE_OPTIONS}
          ariaLabel={`${label} - phút`}
          disabled={disabled}
          onChange={(nextMinutes) =>
            updateTime({ ...parts, minutes: nextMinutes })
          }
        />
      </div>
    </div>
  );
}

// Validation Schema
const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Vui lòng nhập tên cơ sở")
    .min(3, "Tên ít nhất 3 ký tự"),
  description: yup.string().optional(),
  openTime: yup.string().required("Vui lòng chọn giờ mở cửa"),
  closeTime: yup.string().required("Vui lòng chọn giờ đóng cửa"),
  provinceId: yup.string().required("Vui lòng chọn tỉnh/thành"),
  wardId: yup.string().required("Vui lòng chọn quận/huyện"),
  addressDetail: yup.string().trim().required("Vui lòng nhập địa chỉ chi tiết"),
  latitude: yup.number().required("Vui lòng chọn vị trí trên bản đồ"),
  longitude: yup.number().required("Vui lòng chọn vị trí trên bản đồ"),
  bizIssueDate: yup.string().required("Vui lòng nhập ngày cấp"),
  bizExpiryDate: yup.string().required("Vui lòng nhập ngày hết hạn"),
});

const LOCATION_TOAST_ID = "recreate-venue-location";
const LOCATION_BUTTON_COOLDOWN_MS = 1500;

function getLocationErrorMessage(err) {
  switch (err?.code) {
    case 1:
      return null;
    case 2:
      return "Không xác định được vị trí hiện tại.";
    case 3:
      return "Lấy vị trí quá lâu, vui lòng thử lại.";
    default:
      return err?.message || "Không lấy được vị trí hiện tại.";
  }
}

const OwnerRecreateVenue = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);

  // States for images
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [deletedThumbnail, setDeletedThumbnail] = useState(false);
  
  const [bizFiles, setBizFiles] = useState([]);
  const [bizFilePreviews, setBizFilePreviews] = useState([]);
  const [existingBizImages, setExistingBizImages] = useState([]);
  const [deletedBizImageIds, setDeletedBizImageIds] = useState([]);
  const [bizDocId, setBizDocId] = useState(null);

  // Map search and location states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationCooldown, setIsLocationCooldown] = useState(false);
  const searchContainerRef = useRef(null);
  const locationRequestRef = useRef(0);
  const locationClickLockRef = useRef(false);
  const locationCooldownTimeoutRef = useRef(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      openTime: "05:00",
      closeTime: "22:00",
      latitude: 21.0285,
      longitude: 105.8542,
    },
  });

  const selectedProvinceId = watch("provinceId");
  const lat = watch("latitude");
  const lng = watch("longitude");
  const pickedPosition = useMemo(
    () => [lat || 21.0285, lng || 105.8542],
    [lat, lng],
  );

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [provs, draft] = await Promise.all([
          getProvinces(),
          getVenueDraft(id),
        ]);

        setProvinces(provs || []);

        if (draft) {
          reset({
            name: draft.name || draft.Name || "",
            description: draft.description || draft.Description || "",
            openTime: (draft.openTime || draft.OpenTime || "05:00").slice(0, 5),
            closeTime: (draft.closeTime || draft.CloseTime || "22:00").slice(
              0,
              5,
            ),
            provinceId: String(draft.provinceId || draft.ProvinceId || ""),
            wardId: String(draft.wardId || draft.WardId || ""),
            addressDetail: draft.addressDetail || draft.AddressDetail || "",
            latitude: draft.latitude || draft.Latitude || 21.0285,
            longitude: draft.longitude || draft.Longitude || 105.8542,
          });

          setExistingThumbnail(draft.thumbnailUrl || draft.ThumbnailUrl || "");
          setRejectionReason(draft.rejectionReason || "");
          const biz =
            draft.businessLicense ||
            draft.BusinessLicense ||
            draft.businessDocument ||
            draft.BusinessDocument;
          if (biz) {
            setBizDocId(biz.documentId || biz.DocumentId || null);
            setValue(
              "bizIssueDate",
              (biz.issueDate || biz.IssueDate || "").slice(0, 10),
            );
            setValue(
              "bizExpiryDate",
              (biz.expiryDate || biz.ExpiryDate || "").slice(0, 10),
            );

            const imgs = biz.images || biz.Images || [];
            setExistingBizImages(
              imgs.map((img) => ({
                id: img.imageId || img.ImageId || img.id || img.Id,
                url: img.imageUrl || img.ImageUrl || img.url || img.Url,
              })),
            );
          }
        }
      } catch (e) {
        toast.error("Lỗi khi tải dữ liệu cơ sở.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, reset, setValue]);

  // Load Districts
  useEffect(() => {
    if (!selectedProvinceId) return;
    const loadDistricts = async () => {
      try {
        const list = await getDistrictsByProvince(selectedProvinceId);
        setDistricts(list || []);
      } catch (e) {
        setDistricts([]);
      }
    };
    loadDistricts();
  }, [selectedProvinceId]);

  // Thumbnail preview
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview("");
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  // Biz files previews
  useEffect(() => {
    if (bizFiles.length === 0) {
      setBizFilePreviews([]);
      return;
    }
    const urls = bizFiles.map(file => URL.createObjectURL(file));
    setBizFilePreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [bizFiles]);

  const onPickCoords = (nextLat, nextLng) => {
    setValue("latitude", nextLat, { shouldValidate: true, shouldDirty: true });
    setValue("longitude", nextLng, { shouldValidate: true, shouldDirty: true });
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (locationCooldownTimeoutRef.current)
        clearTimeout(locationCooldownTimeoutRef.current);
    };
  }, []);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&countrycodes=vn&addressdetails=1`,
      );
      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (item) => {
    const latNum = parseFloat(item.lat);
    const lngNum = parseFloat(item.lon);
    onPickCoords(latNum, lngNum);
    setSearchQuery(item.display_name);
    setSearchResults([]);
  };

  const useMyLocation = useCallback(() => {
    if (locationClickLockRef.current || isLocating || isLocationCooldown)
      return;

    const startLocationCooldown = () => {
      if (locationCooldownTimeoutRef.current) {
        clearTimeout(locationCooldownTimeoutRef.current);
      }
      setIsLocationCooldown(true);
      locationCooldownTimeoutRef.current = setTimeout(() => {
        locationClickLockRef.current = false;
        setIsLocationCooldown(false);
        locationCooldownTimeoutRef.current = null;
      }, LOCATION_BUTTON_COOLDOWN_MS);
    };

    locationClickLockRef.current = true;

    if (!navigator?.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị (geolocation).", {
        toastId: LOCATION_TOAST_ID,
      });
      startLocationCooldown();
      return;
    }

    locationRequestRef.current += 1;
    const requestId = locationRequestRef.current;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (requestId !== locationRequestRef.current) return;
        const a = pos?.coords?.latitude;
        const o = pos?.coords?.longitude;
        onPickCoords(a, o);
        if (toast.isActive(LOCATION_TOAST_ID)) {
          toast.update(LOCATION_TOAST_ID, {
            render: "Đã lấy vị trí hiện tại.",
            type: "success",
            autoClose: 1000,
            closeButton: true,
          });
        } 
        setIsLocating(false);
        startLocationCooldown();
      },
      (err) => {
        if (requestId !== locationRequestRef.current) return;
        const message = getLocationErrorMessage(err);
        if (!message) {
          toast.dismiss(LOCATION_TOAST_ID);
        } else if (toast.isActive(LOCATION_TOAST_ID)) {
          toast.update(LOCATION_TOAST_ID, {
            render: message,
            type: "error",
            autoClose: 2000,
            closeButton: true,
          });
        } else {
          toast.error(message, { toastId: LOCATION_TOAST_ID });
        }
        setIsLocating(false);
        startLocationCooldown();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [isLocating, isLocationCooldown]);

  const handleRecreate = async (data) => {
    setSubmitting(true);
    Swal.fire({
      title: "Đang xử lý...",
      text: "Vui lòng chờ trong giây lát",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // 1. Update Basic Info + Address
      await updateOwnerVenueInfo(id, {
        name: data.name,
        description: data.description,
        openTime: `${data.openTime}:00`,
        closeTime: `${data.closeTime}:00`,
        provinceId: data.provinceId,
        wardId: data.wardId,
        addressDetail: data.addressDetail,
        latitude: data.latitude,
        longitude: data.longitude,
        thumbnailFile: thumbnailFile || undefined,
        deletedThumbnail: deletedThumbnail && !thumbnailFile,
      });

      // 2. Update Documents
      if (bizDocId) {
        const form = new FormData();
        form.append("IssueDate", data.bizIssueDate);
        form.append("ExpiryDate", data.bizExpiryDate);
        bizFiles.forEach((file) => form.append("NewImages", file));
        deletedBizImageIds.forEach((id) => form.append("DeletedImageIds", id));

        await updateOwnerDocument(bizDocId, form);
      } else {
        const form = new FormData();
        form.append("BusinessDocument.IssueDate", data.bizIssueDate);
        form.append("BusinessDocument.ExpiryDate", data.bizExpiryDate);
        bizFiles.forEach((file) =>
          form.append("BusinessDocument.Images", file),
        );

        await addVenueDocuments(id, form);
      }

      // 3. Submit for review
      await submitVenue(id);

      Swal.close();
      await Swal.fire({
        icon: "success",
        title: "Thành công",
        text: "Cơ sở đã được gửi duyệt lại.",
        timer: 2000,
        showConfirmButton: false,
      });
      navigate("/owner/venues");
    } catch (e) {
      Swal.close();
      toast.error(
        e?.response?.data?.message || e?.message || "Lỗi khi cập nhật cơ sở.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="owner-venues-page">
        <div className="ov-empty">
          <Loader2 className="ov-spinner" size={40} />
          <p>Đang tải dữ liệu cơ sở...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-venue-page">
      <div className="cv-container">
        <div className="cv-header">
          <button
            type="button"
            className="cv-back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Chỉnh sửa và yêu cầu duyệt lại cơ sở</h1>
          </div>
        </div>

        {rejectionReason && (
          <Alert  sx={{
            mb:1,
            borderRadius:3,
            bgcolor: "#fcd8d4",
            fontFamily: "Be Vietnam Pro",
          }} severity="error" >
            <AlertTitle sx={{
              fontFamily: "Be Vietnam Pro",
            }}>
              Lý do từ chối
            </AlertTitle>
            {rejectionReason}
          </Alert>
        )}
        <form onSubmit={handleSubmit(handleRecreate)}>
          {/* Basic Info */}
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
                  {...register("name")}
                  placeholder="Nhập tên cơ sở..."
                />
                {errors.name && (
                  <p className="cv-error-text">{errors.name.message}</p>
                )}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Mô tả</label>
                <textarea
                  rows={3}
                  {...register("description")}
                  placeholder="Mô tả về cơ sở..."
                />
              </div>

              <Controller
                name="openTime"
                control={control}
                render={({ field }) => (
                  <TimeSegmentField
                    label="Giờ mở cửa"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.openTime && (
                <p
                  className="cv-error-text"
                  style={{
                    marginTop: "-10px",
                    marginBottom: "10px",
                    gridColumn: "1 / -1",
                  }}
                >
                  {errors.openTime.message}
                </p>
              )}

              <Controller
                name="closeTime"
                control={control}
                render={({ field }) => (
                  <TimeSegmentField
                    label="Giờ đóng cửa"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.closeTime && (
                <p
                  className="cv-error-text"
                  style={{
                    marginTop: "-10px",
                    marginBottom: "10px",
                    gridColumn: "1 / -1",
                  }}
                >
                  {errors.closeTime.message}
                </p>
              )}

              <div className="cv-form-group cv-full-width">
                <label>Ảnh đại diện cơ sở</label>
                <div className="cv-doc-gallery cv-doc-gallery--thumbnail">
                  {(thumbnailPreview || (existingThumbnail && !deletedThumbnail)) ? (
                    <div className="cv-doc-gallery-item">
                      <div className="cv-doc-gallery-tile cv-doc-gallery-tile--thumbnail">
                        <img src={thumbnailPreview || existingThumbnail} alt="Thumbnail" />
                        <button 
                          type="button" 
                          className="cv-doc-gallery-remove" 
                          title="Xóa ảnh"
                          onClick={() => {
                            if (thumbnailPreview) {
                              setThumbnailFile(null);
                            } else {
                              setDeletedThumbnail(true);
                            }
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="cv-doc-gallery-item cv-doc-gallery-item--add">
                      <label className="cv-doc-gallery-add cv-doc-gallery-add--thumbnail">
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setThumbnailFile(file);
                              setDeletedThumbnail(false);
                            }
                          }}
                        />
                        <Plus size={24} />
                        <span className="cv-doc-gallery-add-text">
                          {existingThumbnail ? "Thay đổi ảnh" : "Thêm ảnh"}
                        </span>
                        <span className="cv-doc-gallery-add-text">
                          {existingThumbnail ? "Thay đổi ảnh" : "Thêm ảnh"}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="cv-card">
            <h3 className="cv-card-title">
              <MapPin size={20} /> Vị trí & Địa chỉ
            </h3>
            <div className="cv-form-grid">
              <div className="cv-form-group">
                <label>
                  Tỉnh / Thành phố <span className="cv-required">*</span>
                </label>
                <Controller
                  name="provinceId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      className="cv-antd-select"
                      placeholder="-- Chọn tỉnh/thành --"
                      optionFilterProp="label"
                      listHeight={250}
                      onChange={(val) => {
                        field.onChange(val);
                        setValue("wardId", "");
                      }}
                      options={provinces.map((p) => ({
                        value: String(p.id),
                        label: p.name,
                      }))}
                    />
                  )}
                />
                {errors.provinceId && (
                  <p className="cv-error-text">{errors.provinceId.message}</p>
                )}
              </div>

              <div className="cv-form-group">
                <label>
                  Quận / Huyện <span className="cv-required">*</span>
                </label>
                <Controller
                  name="wardId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      className="cv-antd-select"
                      placeholder="-- Chọn quận/huyện --"
                      optionFilterProp="label"
                      listHeight={250}
                      disabled={!selectedProvinceId}
                      options={districts.map((d) => ({
                        value: String(d.id),
                        label: d.name,
                      }))}
                    />
                  )}
                />
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
                  {...register("addressDetail")}
                  placeholder="Số nhà, tên đường..."
                />
                {errors.addressDetail && (
                  <p className="cv-error-text">
                    {errors.addressDetail.message}
                  </p>
                )}
              </div>

              <div className="cv-map-section cv-full-width">
                <label>
                  <MapPinned size={16} /> Chọn vị trí trên bản đồ
                </label>
                <div
                  className="cv-map-wrapper"
                  style={{ height: "320px", marginTop: "10px" }}
                >
                  <div
                    className="cv-map-search-container"
                    ref={searchContainerRef}
                  >
                    <div className="cv-map-search-input-wrapper">
                      <Search className="cv-map-search-icon" size={18} />
                      <input
                        type="text"
                        className="cv-map-search-input"
                        placeholder="Tìm kiếm địa chỉ..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                      {isSearching && <div className="cv-map-search-spinner" />}
                    </div>
                    {searchResults.length > 0 && (
                      <ul className="cv-map-search-results">
                        {searchResults.map((item, idx) => (
                          <li
                            key={`${item.place_id}-${idx}`}
                            onClick={() => selectLocation(item)}
                            className="cv-map-search-item"
                          >
                            <MapPin size={16} />
                            <span>{item.display_name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    className="cv-map-btn cv-map-btn--overlay cv-map-btn--my-location"
                    onClick={useMyLocation}
                    disabled={isLocating || isLocationCooldown}
                    aria-busy={isLocating}
                    title="Vị trí của tôi"
                  >
                    {isLocating ? (
                      <span className="cv-locating-text">Đang định vị...</span>
                    ) : (
                      <>
                        <MapPin size={18} />
                        <span>Dùng vị trí hiện tại</span>
                      </>
                    )}
                  </button>

                  <MapContainer
                    center={pickedPosition}
                    zoom={16}
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: "8px",
                    }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapViewportController
                      center={pickedPosition}
                      shouldAnimate={true}
                    />
                    <MapClickHandler onPick={onPickCoords} />
                    <Marker
                      position={pickedPosition}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const { lat, lng } = e.target.getLatLng();
                          onPickCoords(lat, lng);
                        },
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Business License */}
          <div className="cv-card">
            <h3 className="cv-card-title">
              <FileText size={20} /> Giấy phép kinh doanh
            </h3>
            <div className="cv-form-grid">
              <div className="cv-form-group">
                <label>
                  Ngày cấp <span className="cv-required">*</span>
                </label>
                <input type="date" {...register("bizIssueDate")} />
                {errors.bizIssueDate && (
                  <p className="cv-error-text">{errors.bizIssueDate.message}</p>
                )}
              </div>

              <div className="cv-form-group">
                <label>
                  Ngày hết hạn <span className="cv-required">*</span>
                </label>
                <input type="date" {...register("bizExpiryDate")} />
                {errors.bizExpiryDate && (
                  <p className="cv-error-text">
                    {errors.bizExpiryDate.message}
                  </p>
                )}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>
                  Ảnh giấy phép kinh doanh{" "}
                  <span className="cv-required">*</span>
                </label>
                <ul className="cv-doc-gallery">
                  {existingBizImages.filter(img => !deletedBizImageIds.includes(img.id)).map((img) => (
                    <li key={img.id} className="cv-doc-gallery-item">
                      <div className="cv-doc-gallery-tile cv-doc-gallery-tile--server">
                        <img src={img.url} alt="Biz Doc" />
                        <span className="cv-doc-gallery-badge">Đã lưu</span>
                        <button 
                          type="button" 
                          className="cv-doc-gallery-remove" 
                          title="Xóa"
                          onClick={() => {
                            setDeletedBizImageIds(prev => [...prev, img.id]);
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {bizFilePreviews.map((url, idx) => (
                    <li key={idx} className="cv-doc-gallery-item">
                      <div className="cv-doc-gallery-tile">
                        <img src={url} alt="Preview" />
                        <button type="button" className="cv-doc-gallery-remove" onClick={() => {
                          setBizFiles(prev => prev.filter((_, i) => i !== idx));
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {existingBizImages.filter(img => !deletedBizImageIds.includes(img.id)).length + bizFiles.length < 5 && (
                    <li className="cv-doc-gallery-item cv-doc-gallery-item--add">
                      <label className="cv-doc-gallery-add">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setBizFiles((prev) =>
                              [...prev, ...files].slice(
                                0,
                                5 - existingBizImages.length,
                              ),
                            );
                          }}
                        />
                        <Plus size={24} />
                        <span className="cv-doc-gallery-add-text">
                          Thêm ảnh
                        </span>
                      </label>
                    </li>
                  )}
                </ul>
                <p style={{ marginTop: "3px" }} className="cv-wizard-hint">
                  Tối đa 5 ảnh. Ảnh tải lên phải rõ nét, không bị mờ.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="cv-submit-section" style={{ marginTop: "30px" }}>
            <button
              type="button"
              className="cv-cancel-btn"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cv-submit-btn"
              disabled={submitting}
            >
              {submitting ? "Đang xử lý..." : "Gửi duyệt lại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerRecreateVenue;
