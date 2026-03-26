import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, MapPin, Clock, ArrowLeft, MapPinned, Calendar } from "lucide-react";
import { toast } from "react-toastify";
import { createOwnerField, getOwnerVenueFields, getVenueDetail } from "../../services/fieldService";
import { deactivateOwnerVenue } from "../../services/venueService";
import { getSportTypes } from "../../services/sportTypeService";
import "./OwnerVenueDetail.css";

const formatTime = (timeSpan) => {
  if (!timeSpan) return "—";
  const parts = String(timeSpan).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(timeSpan);
};

const OwnerVenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [sportTypes, setSportTypes] = useState([]);
  const [creatingField, setCreatingField] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [newField, setNewField] = useState({
    name: "",
    sportTypeId: "",
    description: "",
    images: [],
  });

  const loadFields = async (venueId) => {
    const list = await getOwnerVenueFields(venueId);
    setFields(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getVenueDetail(id);
        if (mounted) setVenue(data ?? null);
      } catch (e) {
        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được chi tiết cơ sở.");
        if (mounted) setVenue(null);
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

  // NOTE: VenueDetailResponse currently doesn't include status, so we can't reliably hide this action.
  // We'll show "Vô hiệu hóa" on this page and only disable it when we are sure it's already inactive.
  const statusLower = String(venue?.status || venue?.Status || "").toLowerCase().trim();
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
          <Link className="ovd-btn ovd-btn--secondary" to="/owner/venues">
            Danh sách cơ sở
          </Link>
          <Link className="ovd-btn ovd-btn--primary" to={`/owner/venues/${id}/offline-booking`}>
            <Calendar size={16} /> Đặt offline
          </Link>
          <button
            type="button"
            className="ovd-btn ovd-btn--danger"
            disabled={deactivating || isInactive}
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
            title={isInactive ? "Cơ sở đã vô hiệu hóa" : undefined}
          >
            {isInactive ? "Đã vô hiệu hóa" : deactivating ? "Đang vô hiệu hóa..." : "Vô hiệu hóa"}
          </button>
        </div>
      </div>

      <div className="ovd-layout">
        <div className="ovd-col-left">
          <div className="ovd-card">
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
                <Calendar size={18} /> Tạo sân mới
              </h3>
              <button
                type="button"
                className="ovd-toggle-btn"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? "Thu gọn" : "+ Tạo sân"}
              </button>
            </div>
            {showCreateForm ? (
              <>
                <div className="ovd-create-grid">
                  <label className="ovd-label">
                    Tên sân
                    <input
                      className="ovd-input"
                      value={newField.name}
                      onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ví dụ: Sân 1"
                    />
                  </label>
                  <label className="ovd-label">
                    Môn thể thao
                    <select
                      className="ovd-input"
                      value={newField.sportTypeId}
                      onChange={(e) => setNewField((p) => ({ ...p, sportTypeId: e.target.value }))}
                    >
                      <option value="">-- Chọn môn thể thao --</option>
                      {sportTypes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
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
                        setNewField({ name: "", sportTypeId: "", description: "", images: [] });
                        setFieldsLoading(true);
                        await loadFields(id);
                      } catch (e) {
                        toast.error(e?.response?.data?.message ?? e?.message ?? "Không tạo được sân.");
                      } finally {
                        setCreatingField(false);
                        setFieldsLoading(false);
                      }
                    }}
                  >
                    {creatingField ? "Đang tạo..." : "Tạo sân"}
                  </button>
                </div>
              </>
            ) : (
              <p className="ovd-muted">Bấm “+ Tạo sân” để thêm sân mới cho cơ sở.</p>
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
              <p className="ovd-muted">Đang tải danh sách sân...</p>
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

