import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Clock, MapPin } from "lucide-react";
import { toast } from "react-toastify";
import { getDistrictsByProvince, getProvinces } from "../../services/addressService";
import { getVenueDraft, updateOwnerVenueInfo } from "../../services/venueService";
import "./OwnerVenueDetail.css";

const toInputTime = (value) => {
  if (!value) return "";
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
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
      });
      toast.success("Đã cập nhật thông tin cơ sở.");
      navigate(`/owner/venues/${id}`);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không cập nhật được cơ sở.");
    } finally {
      setSaving(false);
    }
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

            <div className="ovd-create-actions">
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

