import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { ArrowLeft, Building2, MapPin, FileText, Check, Plus, X, MapPinned, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getVenueDraft,
  updateOwnerVenueInfo,
  updateOwnerDocument,
  addVenueDocuments,
  submitVenue,
} from "../../../services/venueService";
import { getDistrictsByProvince, getProvinces } from "../../../services/addressService";
import "./CreateVenue.css";

// Fix Leaflet default marker icons
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
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

// Validation Schema
const schema = yup.object({
  name: yup.string().trim().required("Vui lòng nhập tên cơ sở").min(3, "Tên ít nhất 3 ký tự"),
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
  
  const [bizFiles, setBizFiles] = useState([]);
  const [existingBizImages, setExistingBizImages] = useState([]);
  const [deletedBizImageIds, setDeletedBizImageIds] = useState([]);
  const [bizDocId, setBizDocId] = useState(null);

  const {
    register,
    handleSubmit,
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
  const pickedPosition = useMemo(() => [lat || 21.0285, lng || 105.8542], [lat, lng]);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [provs, draft] = await Promise.all([getProvinces(), getVenueDraft(id)]);
        
        setProvinces(provs || []);
        
        if (draft) {
          reset({
            name: draft.name || draft.Name || "",
            description: draft.description || draft.Description || "",
            openTime: (draft.openTime || draft.OpenTime || "05:00").slice(0, 5),
            closeTime: (draft.closeTime || draft.CloseTime || "22:00").slice(0, 5),
            provinceId: String(draft.provinceId || draft.ProvinceId || ""),
            wardId: String(draft.wardId || draft.WardId || ""),
            addressDetail: draft.addressDetail || draft.AddressDetail || "",
            latitude: draft.latitude || draft.Latitude || 21.0285,
            longitude: draft.longitude || draft.Longitude || 105.8542,
          });

          setExistingThumbnail(draft.thumbnailUrl || draft.ThumbnailUrl || "");
          
          const biz = draft.businessLicense || draft.BusinessLicense || draft.businessDocument || draft.BusinessDocument;
          if (biz) {
            setBizDocId(biz.documentId || biz.DocumentId || null);
            setValue("bizIssueDate", (biz.issueDate || biz.IssueDate || "").slice(0, 10));
            setValue("bizExpiryDate", (biz.expiryDate || biz.ExpiryDate || "").slice(0, 10));
            
            const imgs = biz.images || biz.Images || [];
            setExistingBizImages(imgs.map(img => ({
              id: img.imageId || img.ImageId || img.id || img.Id,
              url: img.imageUrl || img.ImageUrl || img.url || img.Url
            })));
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

  const onPickCoords = (nextLat, nextLng) => {
    setValue("latitude", nextLat, { shouldValidate: true, shouldDirty: true });
    setValue("longitude", nextLng, { shouldValidate: true, shouldDirty: true });
  };

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
      });

      // 2. Update Documents
      if (bizDocId) {
        const form = new FormData();
        form.append("IssueDate", data.bizIssueDate);
        form.append("ExpiryDate", data.bizExpiryDate);
        bizFiles.forEach(file => form.append("NewImages", file));
        deletedBizImageIds.forEach(id => form.append("DeletedImageIds", id));
        
        await updateOwnerDocument(bizDocId, form);
      } else {
        const form = new FormData();
        form.append("BusinessDocument.IssueDate", data.bizIssueDate);
        form.append("BusinessDocument.ExpiryDate", data.bizExpiryDate);
        bizFiles.forEach(file => form.append("BusinessDocument.Images", file));
        
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
      toast.error(e?.response?.data?.message || e?.message || "Lỗi khi cập nhật cơ sở.");
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
          <button type="button" className="cv-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Tạo lại cơ sở</h1>
            <p>Cập nhật đầy đủ thông tin để gửi duyệt lại cơ sở này</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleRecreate)}>
          {/* Basic Info */}
          <div className="cv-card">
            <h3 className="cv-card-title">
              <Building2 size={20} /> Thông tin cơ bản
            </h3>
            <div className="cv-form-grid">
              <div className="cv-form-group cv-full-width">
                <label>Tên cơ sở <span className="cv-required">*</span></label>
                <input type="text" {...register("name")} placeholder="Nhập tên cơ sở..." />
                {errors.name && <p className="cv-error-text">{errors.name.message}</p>}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Mô tả</label>
                <textarea rows={3} {...register("description")} placeholder="Mô tả về cơ sở..." />
              </div>

              <div className="cv-form-group">
                <label>Giờ mở cửa <span className="cv-required">*</span></label>
                <input type="time" {...register("openTime")} />
                {errors.openTime && <p className="cv-error-text">{errors.openTime.message}</p>}
              </div>

              <div className="cv-form-group">
                <label>Giờ đóng cửa <span className="cv-required">*</span></label>
                <input type="time" {...register("closeTime")} />
                {errors.closeTime && <p className="cv-error-text">{errors.closeTime.message}</p>}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Ảnh đại diện cơ sở</label>
                <div className="cv-doc-gallery cv-doc-gallery--thumbnail">
                  {(thumbnailPreview || existingThumbnail) && (
                    <div className="cv-doc-gallery-item">
                      <div className="cv-doc-gallery-tile cv-doc-gallery-tile--thumbnail">
                        <img src={thumbnailPreview || existingThumbnail} alt="Thumbnail" />
                        {thumbnailPreview && (
                          <button type="button" className="cv-doc-gallery-remove" onClick={() => setThumbnailFile(null)}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {!thumbnailPreview && (
                    <div className="cv-doc-gallery-item cv-doc-gallery-item--add">
                      <label className="cv-doc-gallery-add cv-doc-gallery-add--thumbnail">
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => setThumbnailFile(e.target.files[0])}
                        />
                        <Plus size={24} />
                        <span className="cv-doc-gallery-add-text">{existingThumbnail ? "Thay đổi ảnh" : "Thêm ảnh"}</span>
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
                <label>Tỉnh / Thành phố <span className="cv-required">*</span></label>
                <select {...register("provinceId")}>
                  <option value="">-- Chọn tỉnh/thành --</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.provinceId && <p className="cv-error-text">{errors.provinceId.message}</p>}
              </div>

              <div className="cv-form-group">
                <label>Quận / Huyện <span className="cv-required">*</span></label>
                <select {...register("wardId")} disabled={!selectedProvinceId}>
                  <option value="">-- Chọn quận/huyện --</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.wardId && <p className="cv-error-text">{errors.wardId.message}</p>}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Địa chỉ chi tiết <span className="cv-required">*</span></label>
                <input type="text" {...register("addressDetail")} placeholder="Số nhà, tên đường..." />
                {errors.addressDetail && <p className="cv-error-text">{errors.addressDetail.message}</p>}
              </div>

              <div className="cv-map-section cv-full-width">
                <label><MapPinned size={16} /> Chấm vị trí trên bản đồ <span className="cv-required">*</span></label>
                <div className="cv-map-wrapper" style={{ height: "300px", marginTop: "10px" }}>
                  <MapContainer center={pickedPosition} zoom={16} style={{ height: "100%", width: "100%", borderRadius: "8px" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapViewportController center={pickedPosition} shouldAnimate={true} />
                    <MapClickHandler onPick={onPickCoords} />
                    <Marker position={pickedPosition} draggable={true} eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        onPickCoords(lat, lng);
                      }
                    }} />
                  </MapContainer>
                </div>
                <p className="cv-wizard-hint">Click hoặc kéo marker để xác định vị trí chính xác</p>
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
                <label>Ngày cấp <span className="cv-required">*</span></label>
                <input type="date" {...register("bizIssueDate")} />
                {errors.bizIssueDate && <p className="cv-error-text">{errors.bizIssueDate.message}</p>}
              </div>

              <div className="cv-form-group">
                <label>Ngày hết hạn <span className="cv-required">*</span></label>
                <input type="date" {...register("bizExpiryDate")} />
                {errors.bizExpiryDate && <p className="cv-error-text">{errors.bizExpiryDate.message}</p>}
              </div>

              <div className="cv-form-group cv-full-width">
                <label>Ảnh giấy phép kinh doanh <span className="cv-required">*</span></label>
                <ul className="cv-doc-gallery">
                  {existingBizImages.map((img) => (
                    <li key={img.id} className="cv-doc-gallery-item">
                      <div className="cv-doc-gallery-tile cv-doc-gallery-tile--server">
                        <img src={img.url} alt="Biz Doc" />
                        <span className="cv-doc-gallery-badge">Đã lưu</span>
                        <button type="button" className="cv-doc-gallery-remove" onClick={() => {
                          setDeletedBizImageIds(prev => [...prev, img.id]);
                          setExistingBizImages(prev => prev.filter(x => x.id !== img.id));
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {bizFiles.map((file, idx) => (
                    <li key={idx} className="cv-doc-gallery-item">
                      <div className="cv-doc-gallery-tile">
                        <img src={URL.createObjectURL(file)} alt="Preview" />
                        <button type="button" className="cv-doc-gallery-remove" onClick={() => {
                          setBizFiles(prev => prev.filter((_, i) => i !== idx));
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {existingBizImages.length + bizFiles.length < 5 && (
                    <li className="cv-doc-gallery-item cv-doc-gallery-item--add">
                      <label className="cv-doc-gallery-add">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setBizFiles(prev => [...prev, ...files].slice(0, 5 - existingBizImages.length));
                          }}
                        />
                        <Plus size={24} />
                        <span className="cv-doc-gallery-add-text">Thêm ảnh</span>
                      </label>
                    </li>
                  )}
                </ul>
                <p className="cv-wizard-hint">Tối đa 5 ảnh. Ảnh phải rõ nét, không bị mờ.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="cv-submit-section" style={{ marginTop: "30px" }}>
            <button type="button" className="cv-cancel-btn" onClick={() => navigate(-1)} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="cv-submit-btn" disabled={submitting}>
              {submitting ? "Đang xử lý..." : "Gửi duyệt lại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerRecreateVenue;
