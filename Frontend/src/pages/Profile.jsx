// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, updateProfile, AUTH_STORAGE_KEY } from "../store/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faEye,
  faEyeSlash,
  faBars,
  faCog,
  faSignOutAlt,
  faArrowLeft,
  faCheck,
  faTimes,
  faUser,
  faEnvelope,
  faPhone,
  faBirthdayCake,
  faShieldAlt,
  faCamera,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProfile,
  updateProfile as updateProfileAPI,
  changePassword as changePasswordAPI,
} from "../services/authService";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";
import "./Profile.css";
import { useQuery } from "@tanstack/react-query";

const VN_PHONE_REGEX = /^0\d{9,10}$/;

const customerProfileSchema = yup.object({
  fullName: yup.string().trim().required("Vui lòng nhập họ và tên"),
  phoneNumber: yup
    .string()
    .transform((value) => String(value ?? "").replace(/\s/g, "").trim())
    .test("valid-phone-number", "Số điện thoại không hợp lệ", (value) => {
      if (!value) return true;
      return VN_PHONE_REGEX.test(value);
    })
    .optional(),
  dateOfBirth: yup.string().optional(),
});

const customerPasswordSchema = yup.object({
  currentPassword: yup.string().required("Vui lòng nhập mật khẩu hiện tại"),
  newPassword: yup
    .string()
    .required("Vui lòng nhập mật khẩu mới")
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .matches(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
    .matches(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
    .matches(/[0-9]/, "Mật khẩu phải có ít nhất 1 chữ số")
    .matches(/[\W_]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"),
  confirmPassword: yup
    .string()
    .required("Vui lòng xác nhận mật khẩu")
    .oneOf([yup.ref("newPassword")], "Mật khẩu mới không khớp"),
});

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 0,
    gcTime: 0,
  });

  const {
    register: regProfile,
    handleSubmit: submitProfileForm,
    reset: resetProfileForm,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(customerProfileSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      dateOfBirth: "",
    },
  });

  const {
    register: regPwd,
    handleSubmit: submitPasswordForm,
    reset: resetPwdForm,
    formState: { errors: pwdErrors },
  } = useForm({
    resolver: yupResolver(customerPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    resetProfileForm({
      fullName: profile.fullName || "",
      phoneNumber: profile.phoneNumber || "",
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
    });
  }, [profile, resetProfileForm]);

  const syncProfileForm = (nextProfile) => {
    if (!nextProfile) return;
    resetProfileForm({
      fullName: nextProfile.fullName || "",
      phoneNumber: nextProfile.phoneNumber || "",
      dateOfBirth: nextProfile.dateOfBirth ? nextProfile.dateOfBirth.slice(0, 10) : "",
    });
  };

  const onUpdateProfile = async (values) => {
    const payload = {
      fullName: values.fullName.trim(),
      email: profile?.email || "",
      phoneNumber: String(values.phoneNumber ?? "").replace(/\s/g, "").trim(),
      dateOfBirth: values.dateOfBirth || "",
    };
    setIsLoading(true);
    try {
      await updateProfileAPI(payload);
      const refreshed = await refetchProfile();
      const latestProfile = refreshed?.data || { ...profile, ...payload };
      dispatch(updateProfile(latestProfile));
      syncProfileForm(latestProfile);
      toast.success("Cập nhật hồ sơ thành công!");
      setIsEditingProfile(false);
    } catch (error) {
      toast.error(error.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const onChangePassword = async (values) => {
    setIsLoading(true);
    try {
      await changePasswordAPI(values);
      toast.success("Đổi mật khẩu thành công!");
      resetPwdForm();
      setIsEditingPassword(false);
    } catch (error) {
      toast.error(
        error.message?.toLowerCase().includes("incorrect")
          ? "Mật khẩu hiện tại không đúng"
          : error.message || "Đổi mật khẩu thất bại",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('token');
    toast.success("Đăng xuất thành công!");
    setMobileMenuOpen(false);
    navigate("/");
  };

  const p = profile ?? {};
  const avatarLetter = (p.fullName || p.email || "U").charAt(0).toUpperCase();

  const formatDOB = (dob) => {
    if (!dob) return "Chưa cập nhật";
    try {
      return new Date(dob).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dob;
    }
  };

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    lockBodyScroll();
    window.addEventListener("keydown", handleEsc);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleEsc);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="profile-page">
      <button
        type="button"
        className={`profile-mobile-menu-btn ${mobileMenuOpen ? "hidden" : ""}`}
        onClick={() => setMobileMenuOpen(true)}
      >
        <span className="profile-mobile-menu-btn-icon">
          <FontAwesomeIcon icon={faBars} />
        </span>
        <span className="profile-mobile-menu-btn-text">Menu</span>
      </button>
      {mobileMenuOpen ? (
        <div
          className="profile-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="profile-wrapper"
      >
        {/* ── SIDEBAR ── */}
        <aside className={`profile-sidebar ${mobileMenuOpen ? "open" : ""}`}>
          <button
            type="button"
            className="profile-mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
          <div className="sidebar-avatar-card">
            <div className="avatar-ring">
              <div className="avatar-circle">{avatarLetter}</div>
              <button className="avatar-edit-btn" title="Đổi ảnh">
                <FontAwesomeIcon icon={faCamera} />
              </button>
            </div>
            <h3 className="sidebar-name">
              {p.fullName || "Người dùng"}
            </h3>
            <p className="sidebar-email">{p.email || ""}</p>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("profile");
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faUser} />
              </span>
              <span>Hồ sơ cá nhân</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("settings");
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faShieldAlt} />
              </span>
              <span>Bảo mật</span>
            </button>
          </nav>

          <div className="sidebar-actions">
            <button
              className="btn-sidebar-back"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/");
              }}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Quay lại
            </button>
            <button className="btn-sidebar-logout" onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Đăng xuất
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="profile-main">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Banner */}
                <div className="main-banner">
                  <div className="banner-overlay" />
                  <div className="banner-content">
                    <div className="banner-avatar">{avatarLetter}</div>
                    <div>
                      <h2 className="banner-name">
                        {p.fullName || "Người dùng"}
                      </h2>
                      <p className="banner-sub">Thành viên Fiebo</p>
                    </div>
                  </div>
                </div>

                {!isEditingProfile ? (
                  <div className="main-card">
                    <div className="card-header">
                      <h3>
                        <FontAwesomeIcon icon={faUser} /> Thông tin cá nhân
                      </h3>
                      <button
                        className="btn-edit-profile"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <FontAwesomeIcon icon={faEdit} /> Chỉnh sửa
                      </button>
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-icon-wrap">
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                        <div className="info-text">
                          <span className="info-label">Họ và tên</span>
                          <span className="info-value">
                            {p.fullName || "Chưa cập nhật"}
                          </span>
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-icon-wrap">
                          <FontAwesomeIcon icon={faEnvelope} />
                        </div>
                        <div className="info-text">
                          <span className="info-label">Email</span>
                          <span className="info-value">
                            {p.email || "Chưa cập nhật"}
                          </span>
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-icon-wrap">
                          <FontAwesomeIcon icon={faPhone} />
                        </div>
                        <div className="info-text">
                          <span className="info-label">Số điện thoại</span>
                          <span className="info-value">
                            {p.phoneNumber || "Chưa cập nhật"}
                          </span>
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-icon-wrap">
                          <FontAwesomeIcon icon={faBirthdayCake} />
                        </div>
                        <div className="info-text">
                          <span className="info-label">Ngày sinh</span>
                          <span className="info-value">
                            {formatDOB(p.dateOfBirth)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="main-card">
                    <div className="card-header">
                      <h3>
                        <FontAwesomeIcon icon={faEdit} /> Chỉnh sửa hồ sơ
                      </h3>
                    </div>
                    <form
                      onSubmit={submitProfileForm(onUpdateProfile)}
                      className="profile-form"
                      noValidate
                    >
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="fullName">
                            Họ và tên <span className="required">*</span>
                          </label>
                          <input
                            id="fullName"
                            type="text"
                            className="input-field"
                            disabled={isLoading}
                            placeholder="Nhập họ và tên"
                            {...regProfile("fullName")}
                          />
                          {profileErrors.fullName && (
                            <p className="hint-text" style={{ color: "#dc2626" }}>
                              {profileErrors.fullName.message}
                            </p>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="email">Email</label>
                          <input
                            id="email"
                            type="email"
                            className="input-field input-readonly"
                            value={p.email || ""}
                            readOnly
                            title="Email không thể thay đổi"
                          />
                          <p className="hint-text">Email không thể thay đổi</p>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="phoneNumber">Số điện thoại</label>
                          <input
                            id="phoneNumber"
                            type="tel"
                            className="input-field"
                            disabled={isLoading}
                            placeholder="Nhập số điện thoại"
                            {...regProfile("phoneNumber")}
                          />
                          {profileErrors.phoneNumber && (
                            <p className="hint-text" style={{ color: "#dc2626" }}>
                              {profileErrors.phoneNumber.message}
                            </p>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="dateOfBirth">Ngày sinh</label>
                          <input
                            id="dateOfBirth"
                            type="date"
                            className="input-field"
                            disabled={isLoading}
                            {...regProfile("dateOfBirth")}
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button
                          type="submit"
                          className="btn-save"
                          disabled={isLoading}
                        >
                          <FontAwesomeIcon icon={faCheck} />{" "}
                          {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          disabled={isLoading}
                          onClick={() => setIsEditingProfile(false)}
                        >
                          <FontAwesomeIcon icon={faTimes} /> Hủy
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="main-card">
                  <div className="card-header">
                    <h3>
                      <FontAwesomeIcon icon={faShieldAlt} /> Bảo mật tài khoản
                    </h3>
                  </div>

                  {!isEditingPassword ? (
                    <div className="security-placeholder">
                      <div className="security-lock-icon">
                        <FontAwesomeIcon icon={faLock} />
                      </div>
                      <h4>Đổi mật khẩu</h4>
                      <p>Cập nhật mật khẩu để bảo vệ tài khoản của bạn</p>
                      <button
                        className="btn-edit-profile"
                        onClick={() => setIsEditingPassword(true)}
                      >
                        <FontAwesomeIcon icon={faCog} /> Đổi mật khẩu
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={submitPasswordForm(onChangePassword)}
                      className="profile-form"
                      noValidate
                    >
                      <div className="form-group">
                        <label htmlFor="currentPassword">
                          Mật khẩu hiện tại
                        </label>
                        <div className="password-wrapper">
                          <input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            className="input-field"
                            disabled={isLoading}
                            placeholder="Nhập mật khẩu hiện tại"
                            autoComplete="current-password"
                            {...regPwd("currentPassword")}
                          />
                          <button
                            type="button"
                            className="toggle-password"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            disabled={isLoading}
                          >
                            <FontAwesomeIcon
                              icon={showCurrentPassword ? faEyeSlash : faEye}
                            />
                          </button>
                        </div>
                        {pwdErrors.currentPassword && (
                          <p className="hint-text" style={{ color: "#dc2626", marginTop: 6 }}>
                            {pwdErrors.currentPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="newPassword">Mật khẩu mới</label>
                          <div className="password-wrapper">
                            <input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              className="input-field"
                              disabled={isLoading}
                              placeholder="Nhập mật khẩu mới"
                              autoComplete="new-password"
                              {...regPwd("newPassword")}
                            />
                            <button
                              type="button"
                              className="toggle-password"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              disabled={isLoading}
                            >
                              <FontAwesomeIcon
                                icon={showNewPassword ? faEyeSlash : faEye}
                              />
                            </button>
                          </div>
                          {pwdErrors.newPassword && (
                            <p className="hint-text" style={{ color: "#dc2626", marginTop: 6 }}>
                              {pwdErrors.newPassword.message}
                            </p>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="confirmPassword">
                            Xác nhận mật khẩu mới
                          </label>
                          <div className="password-wrapper">
                            <input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              className="input-field"
                              disabled={isLoading}
                              placeholder="Xác nhận mật khẩu mới"
                              autoComplete="new-password"
                              {...regPwd("confirmPassword")}
                            />
                            <button
                              type="button"
                              className="toggle-password"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              disabled={isLoading}
                            >
                              <FontAwesomeIcon
                                icon={showConfirmPassword ? faEyeSlash : faEye}
                              />
                            </button>
                          </div>
                          {pwdErrors.confirmPassword && (
                            <p className="hint-text" style={{ color: "#dc2626", marginTop: 6 }}>
                              {pwdErrors.confirmPassword.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="hint-text">
                        Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký
                        tự đặc biệt
                      </p>
                      <div className="form-actions">
                        <button
                          type="submit"
                          className="btn-save"
                          disabled={isLoading}
                        >
                          <FontAwesomeIcon icon={faCheck} />{" "}
                          {isLoading ? "Đang lưu..." : "Xác nhận đổi mật khẩu"}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          disabled={isLoading}
                          onClick={() => {
                            setIsEditingPassword(false);
                            resetPwdForm();
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} /> Hủy
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
};

export default Profile;
