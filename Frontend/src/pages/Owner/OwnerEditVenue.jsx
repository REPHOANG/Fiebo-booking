import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
import { toast } from "react-toastify";
import { getDistrictsByProvince, getProvinces } from "../../services/addressService";
import { getVenueDraft, updateOwnerVenueInfo } from "../../services/venueService";
import "./OwnerVenueDetail.css";

const toInputTime = (value) => {
  if (!value) return "";
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const toInputDate = (value) => {
  if (!value) return "";
  const s = String(value);
  // Supports both "YYYY-MM-DD" and ISO strings like "YYYY-MM-DDTHH:mm:ss".
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const normalizeDoc = (doc) => {
  if (!doc || typeof doc !== "object") return null;
  const issueDate = toInputDate(doc.issueDate ?? doc.IssueDate ?? null);
  const expiryDate = toInputDate(doc.expiryDate ?? doc.ExpiryDate ?? null);
  const imagesRaw = doc.images ?? doc.Images ?? [];
  const images = Array.isArray(imagesRaw) ? imagesRaw.filter(Boolean) : [];
  return { issueDate, expiryDate, images };
};

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
      <div className="ovd-doc-carousel">
        <button
          type="button"
          className="ovd-doc-image-link ovd-doc-image-link--lg"
          onClick={() => setZoomIdx(idx)}
          aria-label="Zoom ảnh"
          style={{ border: "none", padding: 0, background: "transparent", cursor: "zoom-in" }}
        >
          <img
            src={safeImages[idx]}
            alt={`${title} ${idx + 1}`}
            className="ovd-doc-image ovd-doc-image--lg"
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
          <span className="ovd-doc-counter">
            {idx + 1}/{safeImages.length}
          </span>
        </>
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

const DocLocalImageThumb = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!previewUrl) return null;

  return (
    <>
      <div
        className="ovd-doc-preview-item"
        role="button"
        tabIndex={0}
        onClick={() => setZoomOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setZoomOpen(true);
        }}
      >
      <img src={previewUrl} alt={file?.name || "Document preview"} className="ovd-doc-preview-img" />
      <button
        type="button"
        className="ovd-doc-remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Xóa ảnh"
      >
        <X size={14} />
      </button>
      </div>

      {zoomOpen ? (
        <div
          className="ovd-lightbox-overlay"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="ovd-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ovd-lightbox-close"
              onClick={() => setZoomOpen(false)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <img
              src={previewUrl}
              alt={file?.name || "Document preview"}
              className="ovd-lightbox-img"
            />
          </div>
        </div>
      ) : null}
    </>
  );
};

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
    addressDetail: "",
    provinceId: "",
    wardId: "",
    latitude: 0,
    longitude: 0,
  });
  const [statusLower, setStatusLower] = useState("");
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);

  // Legal documents edit state (timestamps + images).
  const [docsForm, setDocsForm] = useState({
    business: { issueDate: "", expiryDate: "", existingImages: [], files: [] },
    land: { issueDate: "", expiryDate: "", existingImages: [], files: [] },
  });
  const docsInitialRef = useRef({
    business: { issueDate: "", expiryDate: "" },
    land: { issueDate: "", expiryDate: "" },
  });

  const canEdit = useMemo(() => ["active", "draft"].includes(statusLower), [statusLower]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [draft, provinces] = await Promise.all([getVenueDraft(id), getProvinces()]);
        if (!mounted) return;
        const pList = (Array.isArray(provinces) ? provinces : [])
          .map((x) => ({
            id: x?.id ?? x?.provinceId ?? x?.ProvinceId,
            name: x?.name ?? x?.provinceName ?? x?.ProvinceName,
          }))
          .filter((x) => x.id != null && x.name);
        setProvinceOptions(pList);

        const provinceId = String(draft?.provinceId ?? draft?.ProvinceId ?? "");
        const wardId = String(draft?.wardId ?? draft?.WardId ?? "");
        setStatusLower(String(draft?.status ?? draft?.Status ?? "").toLowerCase().trim());
        const lat = Number(draft?.latitude ?? draft?.Latitude ?? 0);
        const lng = Number(draft?.longitude ?? draft?.Longitude ?? 0);
        setForm({
          name: draft?.name ?? draft?.Name ?? "",
          description: draft?.description ?? draft?.Description ?? "",
          openTime: toInputTime(draft?.openTime ?? draft?.OpenTime ?? ""),
          closeTime: toInputTime(draft?.closeTime ?? draft?.CloseTime ?? ""),
          addressDetail: draft?.addressDetail ?? draft?.AddressDetail ?? "",
          provinceId,
          wardId,
          latitude: Number.isFinite(lat) ? lat : 0,
          longitude: Number.isFinite(lng) ? lng : 0,
        });

        // Documents (optional — can be missing for some drafts).
        const businessDoc = normalizeDoc(
          draft?.businessLicense ?? draft?.BusinessLicense,
        );
        const landDoc = normalizeDoc(draft?.landDocument ?? draft?.LandDocument);

        const nextDocsForm = {
          business: {
            issueDate: businessDoc?.issueDate ?? "",
            expiryDate: businessDoc?.expiryDate ?? "",
            existingImages: businessDoc?.images ?? [],
            files: [],
          },
          land: {
            issueDate: landDoc?.issueDate ?? "",
            expiryDate: landDoc?.expiryDate ?? "",
            existingImages: landDoc?.images ?? [],
            files: [],
          },
        };

        setDocsForm(nextDocsForm);
        docsInitialRef.current = {
          business: {
            issueDate: nextDocsForm.business.issueDate,
            expiryDate: nextDocsForm.business.expiryDate,
          },
          land: {
            issueDate: nextDocsForm.land.issueDate,
            expiryDate: nextDocsForm.land.expiryDate,
          },
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

  useEffect(() => {
    let mounted = true;
    if (!form.provinceId) {
      setDistrictOptions([]);
      return () => {
        mounted = false;
      };
    }
    (async () => {
      try {
        const list = await getDistrictsByProvince(form.provinceId);
        if (!mounted) return;
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: x?.id ?? x?.districtId ?? x?.wardId ?? x?.DistrictId ?? x?.WardId,
            name: x?.name ?? x?.districtName ?? x?.wardName ?? x?.DistrictName ?? x?.WardName,
          }))
          .filter((x) => x.id != null && x.name);
        setDistrictOptions(normalized);
      } catch {
        if (mounted) setDistrictOptions([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [form.provinceId]);

  const onSave = async () => {
    if (!canEdit) {
      toast.error("Chỉ trạng thái active hoặc draft mới được chỉnh sửa.");
      return;
    }
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên cơ sở.");
    if (!form.openTime || !form.closeTime) return toast.error("Vui lòng nhập giờ mở và giờ đóng.");
    if (form.closeTime <= form.openTime) return toast.error("Giờ đóng phải sau giờ mở.");
    if (!form.addressDetail.trim()) return toast.error("Vui lòng nhập địa chỉ chi tiết.");
    if (!form.provinceId || !form.wardId) return toast.error("Vui lòng chọn tỉnh/thành và quận/huyện.");

    const businessInitial = docsInitialRef.current.business;
    const landInitial = docsInitialRef.current.land;

    const businessFiles = Array.isArray(docsForm.business.files) ? docsForm.business.files : [];
    const landFiles = Array.isArray(docsForm.land.files) ? docsForm.land.files : [];

    const businessDatesChanged =
      docsForm.business.issueDate !== businessInitial.issueDate ||
      docsForm.business.expiryDate !== businessInitial.expiryDate;
    const landDatesChanged =
      docsForm.land.issueDate !== landInitial.issueDate ||
      docsForm.land.expiryDate !== landInitial.expiryDate;

    const businessChanged = businessFiles.length > 0 || businessDatesChanged;
    const landChanged = landFiles.length > 0 || landDatesChanged;

    const validateDocDates = (label, issueDate, expiryDate) => {
      if (!issueDate || !expiryDate) {
        toast.error(`Vui lòng nhập đủ ngày cấp và ngày hết hạn cho "${label}".`);
        return false;
      }
      const issue = new Date(issueDate);
      const expiry = new Date(expiryDate);
      if (Number.isNaN(issue.getTime()) || Number.isNaN(expiry.getTime())) {
        toast.error(`Ngày không hợp lệ cho "${label}".`);
        return false;
      }
      if (expiry.getTime() <= issue.getTime()) {
        toast.error(`Ngày hết hạn phải sau ngày cấp cho "${label}".`);
        return false;
      }
      return true;
    };

    if (businessChanged) {
      if (businessFiles.length > 5) {
        toast.error('Mỗi loại giấy tờ tối đa 5 ảnh (BusinessDocument).');
        return;
      }
      if (!validateDocDates("Giấy phép kinh doanh", docsForm.business.issueDate, docsForm.business.expiryDate)) return;
    }

    if (landChanged) {
      if (landFiles.length > 5) {
        toast.error("Mỗi loại giấy tờ tối đa 5 ảnh (LandUseDocument).");
        return;
      }
      if (!validateDocDates("Giấy tờ sử dụng đất", docsForm.land.issueDate, docsForm.land.expiryDate)) return;
    }

    setSaving(true);
    try {
      await updateOwnerVenueInfo(id, {
        name: form.name.trim(),
        description: form.description?.trim() || "",
        openTime: `${form.openTime}:00`,
        closeTime: `${form.closeTime}:00`,
        addressDetail: form.addressDetail.trim(),
        provinceId: Number(form.provinceId),
        wardId: Number(form.wardId),
        latitude: form.latitude,
        longitude: form.longitude,
        ...(businessChanged
          ? {
              businessDocument: {
                issueDate: docsForm.business.issueDate,
                expiryDate: docsForm.business.expiryDate,
                files: businessFiles,
              },
            }
          : {}),
        ...(landChanged
          ? {
              landUseDocument: {
                issueDate: docsForm.land.issueDate,
                expiryDate: docsForm.land.expiryDate,
                files: landFiles,
              },
            }
          : {}),
      });
      toast.success("Đã cập nhật thông tin cơ sở.");
      navigate(`/owner/venues/${id}`);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không cập nhật được cơ sở.");
    } finally {
      setSaving(false);
    }
  };

  const businessInitial = docsInitialRef.current.business;
  const landInitial = docsInitialRef.current.land;

  const businessHasFiles = Array.isArray(docsForm.business.files) && docsForm.business.files.length > 0;
  const landHasFiles = Array.isArray(docsForm.land.files) && docsForm.land.files.length > 0;

  const businessDatesChanged =
    docsForm.business.issueDate !== businessInitial.issueDate ||
    docsForm.business.expiryDate !== businessInitial.expiryDate;
  const landDatesChanged =
    docsForm.land.issueDate !== landInitial.issueDate ||
    docsForm.land.expiryDate !== landInitial.expiryDate;

  const businessHasChanges = businessHasFiles || businessDatesChanged;
  const landHasChanges = landHasFiles || landDatesChanged;

  const resetDoc = (type) => {
    const initial = docsInitialRef.current[type] || { issueDate: "", expiryDate: "" };
    setDocsForm((p) => ({
      ...p,
      [type]: {
        ...p[type],
        issueDate: initial.issueDate,
        expiryDate: initial.expiryDate,
        files: [],
      },
    }));
  };

  return (
    <div className="owner-venue-detail">
      <div className="ovd-header">
        <button className="ovd-back" onClick={() => navigate("/owner/venues")}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="ovd-actions">
          <Link className="ovd-btn ovd-btn--secondary" to={`/owner/venues/${id}`}>
            Chi tiết cơ sở
          </Link>
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
              <label className="ovd-label">
                <Clock size={14} /> Giờ mở
                <input
                  type="time"
                  className="ovd-input"
                  value={form.openTime}
                  disabled={!canEdit}
                  onChange={(e) => setForm((p) => ({ ...p, openTime: e.target.value }))}
                />
              </label>
              <label className="ovd-label">
                <Clock size={14} /> Giờ đóng
                <input
                  type="time"
                  className="ovd-input"
                  value={form.closeTime}
                  disabled={!canEdit}
                  onChange={(e) => setForm((p) => ({ ...p, closeTime: e.target.value }))}
                />
              </label>
              <label className="ovd-label">
                <MapPin size={14} /> Tỉnh / Thành phố
                <select
                  className="ovd-input"
                  value={form.provinceId}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, provinceId: e.target.value, wardId: "" }))
                  }
                >
                  <option value="">-- Chọn tỉnh/thành --</option>
                  {provinceOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ovd-label">
                <MapPin size={14} /> Quận / Huyện
                <select
                  className="ovd-input"
                  value={form.wardId}
                  disabled={!canEdit || !form.provinceId}
                  onChange={(e) => setForm((p) => ({ ...p, wardId: e.target.value }))}
                >
                  <option value="">-- Chọn quận/huyện --</option>
                  {districtOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ovd-label ovd-full">
                Địa chỉ chi tiết
                <input
                  className="ovd-input"
                  value={form.addressDetail}
                  disabled={!canEdit}
                  onChange={(e) => setForm((p) => ({ ...p, addressDetail: e.target.value }))}
                />
              </label>
              <label className="ovd-label ovd-full">
                Mô tả
                <textarea
                  className="ovd-input"
                  rows={4}
                  value={form.description}
                  disabled={!canEdit}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 className="ovd-subtitle">
                <Calendar size={18} /> Chỉnh sửa giấy tờ pháp lý
              </h3>

              <div className="ovd-docs-grid">
                <div className="ovd-doc-card">
                  <h4 className="ovd-doc-title">Giấy tờ sử dụng đất</h4>
                  <div className="ovd-create-grid">
                    <label className="ovd-label">
                      Ngày cấp
                      <input
                        type="date"
                        className="ovd-input"
                        value={docsForm.land.issueDate}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setDocsForm((p) => ({
                            ...p,
                            land: { ...p.land, issueDate: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="ovd-label">
                      Ngày hết hạn
                      <input
                        type="date"
                        className="ovd-input"
                        value={docsForm.land.expiryDate}
                        disabled={!canEdit}
                        min={docsForm.land.issueDate || undefined}
                        onChange={(e) =>
                          setDocsForm((p) => ({
                            ...p,
                            land: { ...p.land, expiryDate: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="ovd-label ovd-full">
                      Ảnh giấy tờ (file, tối đa 5)
                      <input
                        type="file"
                        className="ovd-input"
                        accept="image/*"
                        multiple
                        disabled={!canEdit}
                        onChange={(e) => {
                          const picked = Array.from(e.target.files || []).filter(Boolean);
                          const maxImages = 5;
                          const prevFiles = Array.isArray(docsForm.land.files) ? docsForm.land.files : [];

                          if (picked.length > maxImages) {
                            const id = "land-max-images";
                            if (!toast.isActive(id)) {
                              toast.error(`Tối đa ${maxImages} hình ảnh cho giấy tờ sử dụng đất. Vui lòng chọn lại.`, { toastId: id });
                            }
                            e.target.value = "";
                            return;
                          }

                          if (prevFiles.length + picked.length > maxImages) {
                            const id = "land-max-total-images";
                            if (!toast.isActive(id)) {
                              toast.error(`Tối đa ${maxImages} hình ảnh cho giấy tờ sử dụng đất. Bạn chỉ có thể thêm ${maxImages - prevFiles.length} ảnh nữa.`, { toastId: id });
                            }
                            e.target.value = "";
                            return;
                          }

                          setDocsForm((p) => ({
                            ...p,
                            land: {
                              ...p.land,
                              files: [...prevFiles, ...picked],
                            },
                          }));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {docsForm.land.files.length > 0 ? (
                    <div style={{ marginTop: 10 }}>
                      <div className="ovd-doc-preview-grid">
                        {docsForm.land.files.map((f, idx) => (
                          <DocLocalImageThumb
                            key={`${f?.name}-${f?.lastModified ?? idx}`}
                            file={f}
                            onRemove={() =>
                              setDocsForm((p) => ({
                                ...p,
                                land: {
                                  ...p.land,
                                  files: (p.land.files || []).filter((_, i) => i !== idx),
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="ovd-doc-images">
                      {docsForm.land.existingImages.length > 0 ? (
                        <DocumentImageCarousel
                          images={docsForm.land.existingImages}
                          title="Land document"
                        />
                      ) : (
                        <span className="ovd-muted">Chưa có ảnh.</span>
                      )}
                    </div>
                  )}

                  <div className="ovd-doc-actions">
                    <button
                      type="button"
                      className="ovd-btn"
                      disabled={!canEdit || saving || !landHasChanges}
                      onClick={() => resetDoc("land")}
                    >
                      Hủy
                    </button>
                  </div>
                </div>

                <div className="ovd-doc-card">
                  <h4 className="ovd-doc-title">Giấy phép kinh doanh</h4>
                  <div className="ovd-create-grid">
                    <label className="ovd-label">
                      Ngày cấp
                      <input
                        type="date"
                        className="ovd-input"
                        value={docsForm.business.issueDate}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setDocsForm((p) => ({
                            ...p,
                            business: { ...p.business, issueDate: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="ovd-label">
                      Ngày hết hạn
                      <input
                        type="date"
                        className="ovd-input"
                        value={docsForm.business.expiryDate}
                        disabled={!canEdit}
                        min={docsForm.business.issueDate || undefined}
                        onChange={(e) =>
                          setDocsForm((p) => ({
                            ...p,
                            business: { ...p.business, expiryDate: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="ovd-label ovd-full">
                      Ảnh giấy tờ (file, tối đa 5)
                      <input
                        type="file"
                        className="ovd-input"
                        accept="image/*"
                        multiple
                        disabled={!canEdit}
                        onChange={(e) => {
                          const picked = Array.from(e.target.files || []).filter(Boolean);
                          const maxImages = 5;
                          const prevFiles = Array.isArray(docsForm.business.files) ? docsForm.business.files : [];

                          if (picked.length > maxImages) {
                            const id = "business-max-images";
                            if (!toast.isActive(id)) {
                              toast.error(`Tối đa ${maxImages} hình ảnh cho giấy phép kinh doanh. Vui lòng chọn lại.`, { toastId: id });
                            }
                            e.target.value = "";
                            return;
                          }

                          if (prevFiles.length + picked.length > maxImages) {
                            const id = "business-max-total-images";
                            if (!toast.isActive(id)) {
                              toast.error(`Tối đa ${maxImages} hình ảnh cho giấy phép kinh doanh. Bạn chỉ có thể thêm ${maxImages - prevFiles.length} ảnh nữa.`, { toastId: id });
                            }
                            e.target.value = "";
                            return;
                          }

                          setDocsForm((p) => ({
                            ...p,
                            business: {
                              ...p.business,
                              files: [...prevFiles, ...picked],
                            },
                          }));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {docsForm.business.files.length > 0 ? (
                    <div style={{ marginTop: 10 }}>
                      <div className="ovd-doc-preview-grid">
                        {docsForm.business.files.map((f, idx) => (
                          <DocLocalImageThumb
                            key={`${f?.name}-${f?.lastModified ?? idx}`}
                            file={f}
                            onRemove={() =>
                              setDocsForm((p) => ({
                                ...p,
                                business: {
                                  ...p.business,
                                  files: (p.business.files || []).filter((_, i) => i !== idx),
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="ovd-doc-images">
                      {docsForm.business.existingImages.length > 0 ? (
                        <DocumentImageCarousel
                          images={docsForm.business.existingImages}
                          title="Business license"
                        />
                      ) : (
                        <span className="ovd-muted">Chưa có ảnh.</span>
                      )}
                    </div>
                  )}

                  <div className="ovd-doc-actions">
                    <button
                      type="button"
                      className="ovd-btn"
                      disabled={!canEdit || saving || !businessHasChanges}
                      onClick={() => resetDoc("business")}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="ovd-create-actions">
              <button
                type="button"
                className="ovd-btn ovd-btn--secondary"
                disabled={saving}
                onClick={() => navigate(`/owner/venues/${id}`)}
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

