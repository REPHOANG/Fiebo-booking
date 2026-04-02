import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { toast } from "react-toastify";
import { createOwnerField, getOwnerVenueFields } from "../../services/fieldService";
import { getSportTypes } from "../../services/sportTypeService";
import { getVenueDraft } from "../../services/venueService";
import "./OwnerVenueDetail.css";

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatTime = (timeSpan) => {
  if (!timeSpan) return "—";
  const parts = String(timeSpan).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(timeSpan);
};

const OwnerAddField = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sportTypes, setSportTypes] = useState([]);
  const [venueFields, setVenueFields] = useState([]);
  const [creatingField, setCreatingField] = useState(false);
  const [venueOpenTime, setVenueOpenTime] = useState(null);
  const [venueCloseTime, setVenueCloseTime] = useState(null);
  const [newField, setNewField] = useState({
    name: "",
    sportTypeId: "",
    description: "",
    images: [],
  });

  const sportTypeOptions = useMemo(
    () =>
      [...sportTypes].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), "vi", { sensitivity: "base" }),
      ),
    [sportTypes],
  );

  const selectedSportTypeName = useMemo(() => {
    const found = sportTypeOptions.find((s) => String(s.id) === String(newField.sportTypeId));
    return found?.name ?? "";
  }, [sportTypeOptions, newField.sportTypeId]);

  const existingFieldsBySelectedType = useMemo(() => {
    if (!selectedSportTypeName) return venueFields;
    const selectedKey = normalizeText(selectedSportTypeName);
    return (venueFields || []).filter(
      (f) => normalizeText(f?.sportType ?? f?.SportType ?? "") === selectedKey,
    );
  }, [venueFields, selectedSportTypeName]);

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
    let mounted = true;
    (async () => {
      try {
        const list = await getOwnerVenueFields(id);
        if (mounted) setVenueFields(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setVenueFields([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!sportTypeOptions.length) return;
    const exists = sportTypeOptions.some((s) => String(s.id) === String(newField.sportTypeId));
    if (!exists) {
      setNewField((prev) => ({
        ...prev,
        sportTypeId: String(sportTypeOptions[0].id),
      }));
    }
  }, [sportTypeOptions, newField.sportTypeId]);

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
            <Calendar size={18} /> Thêm sân mới
          </h3>
        </div>
        <p className="ovd-muted">
          Giờ hoạt động của cơ sở:{" "}
          <strong>
            {formatTime(venueOpenTime)} - {formatTime(venueCloseTime)}
          </strong>
          . Chọn <strong>bất kỳ môn nào</strong> trong hệ thống (giống trang quản lý time slot).
        </p>

        {sportTypeOptions.length > 0 ? (
          <div className="ovd-sport-chips" role="group" aria-label="Chọn môn nhanh">
            {sportTypeOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`ovd-sport-chip ${String(newField.sportTypeId) === String(s.id) ? "is-active" : ""}`}
                onClick={() => setNewField((p) => ({ ...p, sportTypeId: String(s.id) }))}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ovd-create-grid">
          <label className="ovd-label">
            Loại sân / môn thể thao
            <select
              className="ovd-input"
              value={newField.sportTypeId}
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
          </label>
        </div>

        <div className="ovd-fields">
          <p className="ovd-muted">
            Sân hiện có ({selectedSportTypeName || "tất cả môn"}):{" "}
            <strong>{existingFieldsBySelectedType.length}</strong>
          </p>
          {existingFieldsBySelectedType.length === 0 ? (
            <p className="ovd-muted">Chưa có sân cho loại môn này.</p>
          ) : (
            existingFieldsBySelectedType.map((f) => {
              const fieldId = f?.fieldId ?? f?.FieldId;
              const fieldName = f?.fieldName ?? f?.FieldName ?? "—";
              const sportName = f?.sportType ?? f?.SportType ?? "—";
              const status = f?.status ?? f?.Status ?? "—";
              const minPrice = f?.minPrice ?? f?.MinPrice;
              const maxPrice = f?.maxPrice ?? f?.MaxPrice;
              const priceLabel =
                minPrice != null && maxPrice != null
                  ? `${Number(minPrice).toLocaleString("vi-VN")} – ${Number(maxPrice).toLocaleString("vi-VN")} đ`
                  : "—";
              return (
                <div key={fieldId ?? fieldName} className="ovd-field-row">
                  <div className="ovd-field-main">
                    <strong className="ovd-field-name">{fieldName}</strong>
                    <span className="ovd-field-meta">{sportName}</span>
                  </div>
                  <div className="ovd-field-right">
                    <span className="ovd-field-price">{priceLabel}</span>
                    <span className="ovd-field-status">{status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="ovd-create-actions">
          <button
            type="button"
            className="ovd-btn ovd-btn--primary"
            disabled={creatingField}
            onClick={async () => {
              if (!newField.name.trim()) {
                toast.error("Vui lòng nhập tên sân.");
                return;
              }
              if (!newField.sportTypeId) {
                toast.error("Vui lòng chọn môn thể thao.");
                return;
              }
              setCreatingField(true);
              try {
                await createOwnerField(id, {
                  name: newField.name.trim(),
                  sportTypeId: Number(newField.sportTypeId),
                  description: newField.description?.trim() || undefined,
                  images: newField.images,
                });
                toast.success("Tạo sân thành công.");
                navigate(`/owner/venues/${id}`);
              } catch (e) {
                toast.error(e?.response?.data?.message ?? e?.message ?? "Không tạo được sân.");
              } finally {
                setCreatingField(false);
              }
            }}
          >
            {creatingField ? "Đang tạo..." : "Tạo sân"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerAddField;
