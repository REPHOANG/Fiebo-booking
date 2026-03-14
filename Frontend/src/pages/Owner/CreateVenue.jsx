import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  Plus,
  Trash2,
  LayoutList,
} from "lucide-react";
import { createVenue } from "../../services/venueService";
import "./CreateVenue.css";

// ── Yup Validation ──
const fieldSchema = yup.object({
  name: yup.string().trim().required("Tên sân không được để trống"),
  sportTypeId: yup
    .number()
    .typeError("Vui lòng chọn loại thể thao")
    .required("Vui lòng chọn loại thể thao"),
  description: yup.string().optional(),
});

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
  fields: yup
    .array()
    .of(fieldSchema)
    .min(1, "Cần ít nhất 1 sân"),
});

// ── Dữ liệu mẫu (thay bằng API khi có) ──
const SPORT_TYPES = [
  { id: 1, name: "Bóng Đá" },
  { id: 2, name: "Bóng Rổ" },
  { id: 3, name: "Tennis" },
  { id: 4, name: "Pickleball" },
];

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

// ── Component ──
const CreateVenue = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: reg,
    handleSubmit,
    control,
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
      fields: [{ name: "", sportTypeId: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  const selectedProvinceId = watch("provinceId");
  const wards = WARDS_BY_PROVINCE[selectedProvinceId] || [];

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        description: data.description || "",
        openTime: data.openTime + ":00",
        closeTime: data.closeTime + ":00",
        provinceId: Number(data.provinceId),
        wardId: Number(data.wardId),
        addressDetail: data.addressDetail,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        fields: data.fields.map((f) => ({
          name: f.name,
          sportTypeId: Number(f.sportTypeId),
          description: f.description || "",
        })),
      };

      await createVenue(payload);
      toast.success("Tạo cơ sở thành công!");
      navigate("/owner/venues");
    } catch (err) {
      console.error("Create venue error:", err);
      toast.error(err.message || "Tạo cơ sở thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p>Điền đầy đủ thông tin để đăng ký cơ sở thể thao</p>
          </div>
        </div>

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

              <div className="cv-form-group">
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
              </div>

              <div className="cv-form-group">
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
              </div>
            </div>
          </div>

          {/* ── Card 3: Danh sách sân ── */}
          <div className="cv-card">
            <h3 className="cv-card-title">
              <LayoutList size={20} /> Danh sách sân
            </h3>

            <div className="cv-fields-list">
              {fields.map((field, index) => (
                <div key={field.id} className="cv-field-item">
                  <div className="cv-field-header">
                    <h4>Sân #{index + 1}</h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="cv-field-remove-btn"
                        onClick={() => remove(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="cv-field-grid">
                    <div className="cv-form-group">
                      <label>
                        Tên sân <span className="cv-required">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Sân 1, Sân A..."
                        {...reg(`fields.${index}.name`)}
                      />
                      {errors.fields?.[index]?.name && (
                        <p className="cv-error-text">
                          {errors.fields[index].name.message}
                        </p>
                      )}
                    </div>

                    <div className="cv-form-group">
                      <label>
                        Loại thể thao <span className="cv-required">*</span>
                      </label>
                      <select {...reg(`fields.${index}.sportTypeId`)}>
                        <option value="">-- Chọn --</option>
                        {SPORT_TYPES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {errors.fields?.[index]?.sportTypeId && (
                        <p className="cv-error-text">
                          {errors.fields[index].sportTypeId.message}
                        </p>
                      )}
                    </div>

                    <div className="cv-form-group" style={{ gridColumn: "1 / -1" }}>
                      <label>Mô tả sân</label>
                      <input
                        type="text"
                        placeholder="VD: Sân cỏ nhân tạo 5 người..."
                        {...reg(`fields.${index}.description`)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="cv-add-field-btn"
                onClick={() =>
                  append({ name: "", sportTypeId: "", description: "" })
                }
              >
                <Plus size={18} /> Thêm sân
              </button>
            </div>

            {errors.fields?.root && (
              <p className="cv-error-text" style={{ marginTop: 8 }}>
                {errors.fields.root.message}
              </p>
            )}
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
              {isSubmitting ? "Đang tạo..." : "Tạo cơ sở"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVenue;
