import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  createOwnerField,
  getOwnerVenueFields,
  updateOwnerField,
  uploadOwnerFieldImages,
} from "../../services/fieldService";
import { getSportTypes } from "../../services/sportTypeService";
import { getVenueDraft } from "../../services/venueService";
import "./OwnerVenueDetail.css";

const formatTime = (timeSpan) => {
  if (!timeSpan) return "—";
  const parts = String(timeSpan).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(timeSpan);
};

const normSportKey = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const OwnerAddField = () => {
  const { id, fieldId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(fieldId);
  const [sportTypes, setSportTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [venueOpenTime, setVenueOpenTime] = useState(null);
  const [venueCloseTime, setVenueCloseTime] = useState(null);
  const [editReady, setEditReady] = useState(!isEdit);
  const [newField, setNewField] = useState({
    name: "",
    sportTypeId: "",
    description: "",
    images: [],
  });
  const fileInputRef = useRef(null);

  const sportTypeOptions = useMemo(
    () =>
      [...sportTypes].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), "vi", { sensitivity: "base" }),
      ),
    [sportTypes],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getSportTypes();
        const normalized = (Array.isArray(list) ? list : [])
          .map((x) => ({
            id: x?.id ?? x?.sportTypeId ?? x?.SportTypeId,
            name: x?.name ?? x?.sportTypeName ?? x?.SportTypeName,
          }))
          .filter((x) => x.id != null && x.name);
        if (mounted) setSportTypes(normalized);
      } catch {
        if (mounted) setSportTypes([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getVenueDraft(id);
        if (!mounted) return;
        setVenueOpenTime(data?.openTime ?? data?.OpenTime ?? null);
        setVenueCloseTime(data?.closeTime ?? data?.CloseTime ?? null);
      } catch {
        if (!mounted) return;
        setVenueOpenTime(null);
        setVenueCloseTime(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!isEdit) {
      setEditReady(true);
      return;
    }
    setEditReady(false);
  }, [fieldId, isEdit]);

  useEffect(() => {
    if (!isEdit || !id || !fieldId) return;
    if (!sportTypeOptions.length) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getOwnerVenueFields(id);
        const raw = (Array.isArray(list) ? list : []).find(
          (x) => String(x?.fieldId ?? x?.FieldId) === String(fieldId),
        );
        if (cancelled) return;
        if (!raw) {
          toast.error("Không tìm thấy sân.");
          navigate(`/owner/venues/${id}`, { replace: true });
          return;
        }
        const sportLabel = String(raw?.sportType ?? raw?.SportType ?? "").trim();
        const st = sportTypeOptions.find((s) => normSportKey(s.name) === normSportKey(sportLabel));
        setNewField({
          name: String(raw?.fieldName ?? raw?.FieldName ?? "").trim(),
          sportTypeId: st ? String(st.id) : "",
          description: String(raw?.description ?? raw?.Description ?? "").trim(),
          images: [],
        });
        setEditReady(true);
      } catch {
        if (!cancelled) {
          toast.error("Không tải được thông tin sân.");
          navigate(`/owner/venues/${id}`, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, fieldId, sportTypeOptions, navigate]);

  useEffect(() => {
    if (isEdit) return;
    if (!sportTypeOptions.length) return;
    const exists = sportTypeOptions.some((s) => String(s.id) === String(newField.sportTypeId));
    if (!exists) {
      setNewField((prev) => ({
        ...prev,
        sportTypeId: String(sportTypeOptions[0].id),
      }));
    }
  }, [isEdit, sportTypeOptions, newField.sportTypeId]);

  const imagePreviewUrls = useMemo(
    () => (newField.images || []).map((f) => URL.createObjectURL(f)),
    [newField.images],
  );

  useEffect(() => {
    const urls = imagePreviewUrls;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imagePreviewUrls]);

  const removeImageAt = (index) => {
    setNewField((p) => {
      const next = p.images.filter((_, i) => i !== index);
      if (next.length === 0 && fileInputRef.current) fileInputRef.current.value = "";
      return { ...p, images: next };
    });
  };

  if (isEdit && !editReady) {
    return (
      <div className="owner-venue-detail">
        <div className="ovd-loading">
          <Loader2 size={28} className="ovd-spinner" />
          <p>Đang tải thông tin sân...</p>
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
          <Link className="ovd-btn ovd-btn--secondary" to={`/owner/venues/${id}/time-slot`}>
            <Calendar size={16} />
            Quản lý time slot
          </Link>
          <Link className="ovd-btn ovd-btn--secondary" to={`/owner/venues/${id}`}>
            Chi tiết cơ sở
          </Link>
        </div>
      </div>

      <div className="ovd-card">
        <div className="ovd-title-row">
          <h3 className="ovd-subtitle">
            <Calendar size={18} /> {isEdit ? "Sửa sân" : "Thêm sân mới"}
          </h3>
        </div>
        <p className="ovd-muted">
          Giờ hoạt động của cơ sở:{" "}
          <strong>
            {formatTime(venueOpenTime)} - {formatTime(venueCloseTime)}
          </strong>
          .{" "}
          {isEdit ? (
            <>
              Khi <strong>sửa sân</strong>, loại sân/môn được giữ nguyên (không đổi trên form này).
            </>
          ) : (
            <>
              Chọn <strong>bất kỳ môn nào</strong> trong hệ thống (giống trang quản lý time slot).
            </>
          )}
        </p>

        <div className="ovd-create-grid">
          <label className="ovd-label">
            Loại sân / môn thể thao
            <select
              className="ovd-input"
              value={newField.sportTypeId}
              disabled={isEdit}
              title={isEdit ? "Loại sân không đổi khi chỉnh sửa sân đã tạo" : undefined}
              onChange={(e) => setNewField((p) => ({ ...p, sportTypeId: e.target.value }))}
            >
              <option value="">-- Chọn môn --</option>
              {sportTypeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ovd-label">
            Tên sân
            <input
              className="ovd-input"
              value={newField.name}
              onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ví dụ: Sân 1"
            />
          </label>
          <label className="ovd-label ovd-full">
            Mô tả
            <textarea
              className="ovd-input"
              rows={3}
              value={newField.description}
              onChange={(e) => setNewField((p) => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả sân (tuỳ chọn)"
            />
          </label>
          <label className="ovd-label ovd-full">
            Ảnh sân
            <input
              ref={fileInputRef}
              className="ovd-input"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                setNewField((p) => ({
                  ...p,
                  images: Array.from(e.target.files || []),
                }))
              }
            />
            {imagePreviewUrls.length > 0 ? (
              <div className="ovd-image-preview-grid" aria-live="polite">
                {imagePreviewUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="ovd-image-preview-item">
                    <img src={url} alt={newField.images[idx]?.name || `Ảnh ${idx + 1}`} />
                    <button
                      type="button"
                      className="ovd-image-preview-remove"
                      onClick={() => removeImageAt(idx)}
                      aria-label={`Bỏ ảnh ${idx + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ovd-image-preview-empty">
                {isEdit
                  ? "Chưa chọn ảnh mới — có thể thêm ảnh bổ sung sau khi lưu."
                  : "Chưa chọn ảnh — có thể thêm nhiều file."}
              </p>
            )}
          </label>
        </div>

        <div className="ovd-create-actions">
          <button
            type="button"
            className="ovd-btn ovd-btn--primary"
            disabled={submitting}
            onClick={async () => {
              if (!newField.name.trim()) {
                toast.error("Vui lòng nhập tên sân.");
                return;
              }
              if (!newField.sportTypeId) {
                toast.error("Vui lòng chọn môn thể thao.");
                return;
              }
              setSubmitting(true);
              try {
                if (isEdit) {
                  await updateOwnerField(
                    fieldId,
                    {
                      name: newField.name.trim(),
                      sportTypeId: Number(newField.sportTypeId),
                      description: newField.description?.trim() ?? "",
                    },
                    id,
                  );
                  const extra = newField.images || [];
                  if (extra.length) await uploadOwnerFieldImages(fieldId, extra);
                  toast.success("Cập nhật sân thành công.");
                } else {
                  await createOwnerField(id, {
                    name: newField.name.trim(),
                    sportTypeId: Number(newField.sportTypeId),
                    description: newField.description?.trim() || undefined,
                    images: newField.images,
                  });
                  toast.success("Tạo sân thành công.");
                }
                navigate(`/owner/venues/${id}`);
              } catch (e) {
                toast.error(
                  e?.response?.data?.message ??
                    e?.message ??
                    (isEdit ? "Không cập nhật được sân." : "Không tạo được sân."),
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? (isEdit ? "Đang lưu..." : "Đang tạo...") : isEdit ? "Lưu thay đổi" : "Tạo sân"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerAddField;
