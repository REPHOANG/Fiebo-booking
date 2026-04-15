import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { User, Lock, Mail, Phone, Cake, SquarePen } from "lucide-react";
import {
  getProfile,
  updateProfile as updateProfileAPI,
  changePassword as changePasswordAPI,
} from "../../../services/authService";
import { updateProfile as updateProfileRedux } from "../../../store/authSlice";
import "./OwnerProfile.css";

const errMessage = (e) =>
  e?.response?.data?.message ??
  e?.response?.data?.Message ??
  e?.message ??
  "Có lỗi xảy ra. Vui lòng thử lại.";


const profileSchema = yup.object({
  fullName: yup.string().trim().required("Vui lòng nhập họ tên."),
  phoneNumber: yup.string().trim().optional(),
  dateOfBirth: yup.string().optional(),
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required("Vui lòng nhập mật khẩu hiện tại."),
  newPassword: yup
    .string()
    .required("Vui lòng nhập mật khẩu mới.")
    .min(8, "Mật khẩu mới ít nhất 8 ký tự."),
  confirmPassword: yup
    .string()
    .required("Vui lòng nhập lại mật khẩu.")
    .oneOf([yup.ref("newPassword")], "Mật khẩu mới không khớp."),
});

const OwnerProfile = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: getProfile,
  });

  const {
    register: regProfile,
    handleSubmit: submitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      dateOfBirth: "",
    },
  });

  const {
    register: regPwd,
    handleSubmit: submitPassword,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
    mode: "onTouched",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    resetProfile({
      fullName: profile.fullName || "",
      phoneNumber: profile.phoneNumber || "",
      dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
    });
  }, [profile, resetProfile]);

  const onProfileSave = async (values) => {
    const payload = {
      fullName: values.fullName.trim(),
      email: profile?.email || "",
      phoneNumber: values.phoneNumber?.trim() || "",
      dateOfBirth: values.dateOfBirth || "",
    };
    setSavingProfile(true);
    try {
      await updateProfileAPI(payload);
      dispatch(updateProfileRedux(payload));
      toast.success("Cập nhật hồ sơ thành công.");
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSave = async (values) => {
    setSavingPassword(true);
    try {
      await changePasswordAPI({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toast.success("Đổi mật khẩu thành công.");
      resetPwd();
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const profileName = profile?.fullName?.trim() || "Field Owner";
  const profileEmail = profile?.email?.trim() || "Chưa cập nhật";
  const profilePhone = profile?.phoneNumber?.trim() || "Chưa cập nhật";
  const profileDobRaw = profile?.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "";
  const profileDob = profileDobRaw || "Chưa cập nhật";
  const avatarLetter = (profileName || "O").charAt(0).toUpperCase();

  const profileErr = (name) => profileErrors[name]?.message;
  const pwdErr = (name) => pwdErrors[name]?.message;

  return (
    <div className="owner-profile">
      <section className="op-hero">
        <div className="op-hero-main">
          <div className="op-hero-avatar">{avatarLetter}</div>
          <div>
            <h2 className="op-hero-name">{profileName}</h2>
            <p className="op-hero-role">Chủ sân</p>
          </div>
        </div>
        <Link to="/owner/subscription" className="op-btn op-hero-plan-btn">
          Membership
        </Link>
      </section>

      <div className="op-profile-grid">
        <section className="op-card op-info-card">
          <div className="op-info-head">
            <h2 className="op-card-title" style={{ marginBottom: 0 }}>
              <User size={18} aria-hidden />
              Thông tin cá nhân
            </h2>
            <button
              type="button"
              className="op-btn op-btn--edit"
              onClick={() => setEditingProfile((v) => !v)}
            >
              <SquarePen size={16} />
              {editingProfile ? "Ẩn chỉnh sửa" : "Chỉnh sửa"}
            </button>
          </div>

          {profileLoading && !profile ? (
            <p className="op-muted">Đang tải…</p>
          ) : editingProfile ? (
            <form className="op-form op-edit-form" onSubmit={submitProfile(onProfileSave)} noValidate>
              <label className="op-field">
                <span>Họ tên</span>
                <input {...regProfile("fullName")} />
                {profileErr("fullName") ? (
                  <span className="op-field-error">{profileErr("fullName")}</span>
                ) : null}
              </label>
              <label className="op-field">
                <span>Email</span>
                <input value={profile?.email || ""} disabled className="op-input-disabled" readOnly />
              </label>
              <label className="op-field">
                <span>Số điện thoại</span>
                <input {...regProfile("phoneNumber")} />
                {profileErr("phoneNumber") ? (
                  <span className="op-field-error">{profileErr("phoneNumber")}</span>
                ) : null}
              </label>
              <label className="op-field">
                <span>Ngày sinh</span>
                <input type="date" {...regProfile("dateOfBirth")} />
                {profileErr("dateOfBirth") ? (
                  <span className="op-field-error">{profileErr("dateOfBirth")}</span>
                ) : null}
              </label>
              <button type="submit" className="op-btn op-btn--primary" disabled={savingProfile}>
                {savingProfile ? "Đang lưu…" : "Lưu hồ sơ"}
              </button>
            </form>
          ) : (
            <div className="op-info-grid">
              <div className="op-info-item">
                <span className="op-info-icon">
                  <User size={18} />
                </span>
                <div>
                  <p className="op-info-label">Họ và tên</p>
                  <p className="op-info-value">{profileName}</p>
                </div>
              </div>
              <div className="op-info-item">
                <span className="op-info-icon">
                  <Mail size={18} />
                </span>
                <div>
                  <p className="op-info-label">Email</p>
                  <p className="op-info-value">{profileEmail}</p>
                </div>
              </div>
              <div className="op-info-item">
                <span className="op-info-icon">
                  <Phone size={18} />
                </span>
                <div>
                  <p className="op-info-label">Số điện thoại</p>
                  <p className="op-info-value">{profilePhone}</p>
                </div>
              </div>
              <div className="op-info-item">
                <span className="op-info-icon">
                  <Cake size={18} />
                </span>
                <div>
                  <p className="op-info-label">Ngày sinh</p>
                  <p className="op-info-value">{profileDob}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="op-card op-password-card">
          <h2 className="op-card-title">
            <Lock size={18} aria-hidden />
            Đổi mật khẩu
          </h2>
          <form className="op-form" onSubmit={submitPassword(onPasswordSave)} noValidate>
            <label className="op-field">
              <span>Mật khẩu hiện tại</span>
              <input type="password" autoComplete="current-password" {...regPwd("currentPassword")} />
              {pwdErr("currentPassword") ? (
                <span className="op-field-error">{pwdErr("currentPassword")}</span>
              ) : null}
            </label>
            <label className="op-field">
              <span>Mật khẩu mới</span>
              <input type="password" autoComplete="new-password" {...regPwd("newPassword")} />
              {pwdErr("newPassword") ? (
                <span className="op-field-error">{pwdErr("newPassword")}</span>
              ) : null}
            </label>
            <label className="op-field">
              <span>Nhập lại mật khẩu mới</span>
              <input type="password" autoComplete="new-password" {...regPwd("confirmPassword")} />
              {pwdErr("confirmPassword") ? (
                <span className="op-field-error">{pwdErr("confirmPassword")}</span>
              ) : null}
            </label>
            <button type="submit" className="op-btn op-btn--primary" disabled={savingPassword}>
              {savingPassword ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
            </button>
          </form>
        </section>
      </div>

      
    </div>
  );
};

export default OwnerProfile;

