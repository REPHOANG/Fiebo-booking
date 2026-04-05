import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  createOwnerField,
  getOwnerVenueFields,
  updateOwnerField,
  uploadOwnerFieldImages,
} from "../../services/fieldService";
import { getSportTypes, normalizeSportTypeList } from "../../services/sportTypeService";
import { getVenueDraft } from "../../services/venueService";
import { DocImagePreviewItem } from "./CreateVenueSteps/DocImagePreviewItem";
import "./OwnerVenueDetail.css";
import "./CreateVenue.css";

const MAX_FIELD_IMAGES = 5;

const fieldFormSchema = (isEdit) =>
  yup.object({
    name: yup
      .string()
      .transform((v) => (typeof v === "string" ? v.trim() : v))
      .required("Vui lòng nhập tên sân.")
      .min(1, "Vui lòng nhập tên sân."),
    sportTypeId: isEdit
      ? yup.string()
      : yup.string().required("Vui lòng chọn môn thể thao."),
    description: yup
      .string()
      .transform((v) => (v == null ? "" : String(v))),
    images: yup
      .array()
      .of(yup.mixed())
      .max(MAX_FIELD_IMAGES, `Tối đa ${MAX_FIELD_IMAGES} ảnh`),
  });

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
  const fileInputRef = useRef(null);

  const schema = useMemo(() => fieldFormSchema(isEdit), [isEdit]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      sportTypeId: "",
      description: "",
      images: [],
    },
    mode: "onTouched",
  });

  const images = watch("images") || [];

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
        if (mounted) setSportTypes(normalizeSportTypeList(list));
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
        reset({
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
  }, [isEdit, id, fieldId, sportTypeOptions, navigate, reset]);

  useEffect(() => {
    if (isEdit) return;
    if (!sportTypeOptions.length) return;
    const current = getValues("sportTypeId");
    const exists = sportTypeOptions.some((s) => String(s.id) === String(current));
    if (!exists) {
      setValue("sportTypeId", String(sportTypeOptions[0].id), { shouldValidate: true });
    }
  }, [isEdit, sportTypeOptions, getValues, setValue]);

  const removeImageAt = (index) => {
    const cur = getValues("images") || [];
    const next = cur.filter((_, i) => i !== index);
    setValue("images", next, { shouldValidate: true, shouldDirty: true });
    if (next.length === 0 && fileInputRef.current) fileInputRef.current.value = "";
  };

  const onValidSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateOwnerField(
          fieldId,
          {
            name: values.name.trim(),
            sportTypeId: Number(values.sportTypeId),
            description: values.description?.trim() ?? "",
          },
          id,
        );
        const extra = values.images || [];
        if (extra.length) await uploadOwnerFieldImages(fieldId, extra);
        toast.success("Cập nhật sân thành công.");
      } else {
        await createOwnerField(id, {
          name: values.name.trim(),
          sportTypeId: Number(values.sportTypeId),
          description: values.description?.trim() || undefined,
          images: values.images,
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
        <button type="button" className="ovd-back" onClick={() => navigate(-1)}>
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

        <form onSubmit={handleSubmit(onValidSubmit)} noValidate>
          <div className="ovd-create-grid">
            <label className="ovd-label">
              Loại sân / môn thể thao
              <select
                className="ovd-input"
                disabled={isEdit}
                title={isEdit ? "Loại sân không đổi khi chỉnh sửa sân đã tạo" : undefined}
                {...register("sportTypeId")}
              >
                <option value="">-- Chọn môn --</option>
                {sportTypeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.sportTypeId && (
                <span className="oaf-field-error" role="alert">
                  {errors.sportTypeId.message}
                </span>
              )}
            </label>
            <label className="ovd-label">
              Tên sân
              <input
                className="ovd-input"
                placeholder="Ví dụ: Sân 1"
                autoComplete="off"
                {...register("name")}
              />
              {errors.name && (
                <span className="oaf-field-error" role="alert">
                  {errors.name.message}
                </span>
              )}
            </label>
            <label className="ovd-label ovd-full">
              Mô tả
              <textarea
                className="ovd-input"
                rows={3}
                placeholder="Mô tả sân (tuỳ chọn)"
                {...register("description")}
              />
              {errors.description && (
                <span className="oaf-field-error" role="alert">
                  {errors.description.message}
                </span>
              )}
            </label>
            <div className="ovd-label ovd-full">
              <span className="cv-doc-gallery-label">
                Ảnh sân
                <span className="cv-doc-gallery-sublabel">
                  Tối đa {MAX_FIELD_IMAGES} ảnh · bấm ô &quot;Thêm ảnh&quot; để chọn · bấm X để bỏ khỏi danh sách (chỉ
                  gửi lên khi bấm {isEdit ? "Lưu thay đổi" : "Tạo sân"})
                </span>
              </span>
              <ul className="cv-doc-gallery" aria-label="Ảnh sân" aria-live="polite">
                {images.map((f, idx) => (
                  <DocImagePreviewItem
                    key={`${f.name}-${f.lastModified}-${idx}`}
                    file={f}
                    onRemove={() => removeImageAt(idx)}
                  />
                ))}
                {images.length < MAX_FIELD_IMAGES ? (
                  <li className="cv-doc-gallery-item cv-doc-gallery-item--add">
                    <label className="cv-doc-gallery-add">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="cv-doc-file-input-sr-only"
                        onChange={(e) => {
                          const picked = Array.from(e.target.files || []).filter(Boolean);
                          const cur = getValues("images") || [];
                          const room = Math.max(0, MAX_FIELD_IMAGES - cur.length);
                          const take = picked.slice(0, room);
                          setValue("images", [...cur, ...take], {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          e.target.value = "";
                        }}
                      />
                      <Plus size={26} strokeWidth={2.2} aria-hidden />
                      <span className="cv-doc-gallery-add-text">Thêm ảnh</span>
                    </label>
                  </li>
                ) : null}
              </ul>
              {errors.images && (
                <p className="oaf-field-error" role="alert">
                  {errors.images.message}
                </p>
              )}
              {images.length === 0 ? (
                <p className="ovd-image-preview-empty cv-doc-gallery-hint">
                  {isEdit
                    ? "Chưa chọn ảnh mới — có thể bổ sung sau khi lưu."
                    : "Chưa có ảnh — bấm ô Thêm ảnh để chọn file."}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ovd-create-actions">
            <button type="submit" className="ovd-btn ovd-btn--primary" disabled={submitting}>
              {submitting ? (isEdit ? "Đang lưu..." : "Đang tạo...") : isEdit ? "Lưu thay đổi" : "Tạo sân"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OwnerAddField;
