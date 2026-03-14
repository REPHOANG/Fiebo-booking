// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import {  useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, updateProfile, AUTH_STORAGE_KEY } from "../store/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faEye,
  faEyeSlash,
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
import "./Profile.css";
import { useQuery } from "@tanstack/react-query";

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

  const {
    data: profile
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 0, // luôn stale
    gcTime: 0, // không giữ cache
  });

  useEffect(() => {
  if (profile) {
    setProfileData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phoneNumber: profile.phoneNumber || "",
      dateOfBirth: profile.dateOfBirth
        ? profile.dateOfBirth.slice(0, 10)
        : "",
    });
  }
}, [profile]);
  
  const [profileData, setProfileData] = useState({
    fullName: profile?.fullName || "",
    email: profile?.email || "",
    phoneNumber: profile?.phoneNumber || "",
    dateOfBirth: profile?.dateOfBirth || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileChange = (e) =>
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) =>
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileData.fullName || !profileData.email) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfileAPI(profileData);
      dispatch(updateProfile(profileData));
      toast.success("Cập nhật hồ sơ thành công!");
      setIsEditingProfile(false);
    } catch (error) {
      toast.error(error.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("Vui lòng điền đầy đủ các trường mật khẩu");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (!/[A-Z]/.test(passwordData.newPassword)) {
      toast.error("Mật khẩu phải có ít nhất 1 chữ hoa");
      return;
    }
    if (!/[a-z]/.test(passwordData.newPassword)) {
      toast.error("Mật khẩu phải có ít nhất 1 chữ thường");
      return;
    }
    if (!/[0-9]/.test(passwordData.newPassword)) {
      toast.error("Mật khẩu phải có ít nhất 1 chữ số");
      return;
    }
    if (!/[\W_]/.test(passwordData.newPassword)) {
      toast.error("Mật khẩu phải có ít nhất 1 ký tự đặc biệt");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }
    setIsLoading(true);
    try {
      await changePasswordAPI(passwordData);
      toast.success("Đổi mật khẩu thành công!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('token');
    toast.success("Đăng xuất thành công!");
    navigate("/login");
  };

  const avatarLetter = (profileData.fullName || profileData.email || "U")
    .charAt(0)
    .toUpperCase();

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

  return (
    <div className="profile-page">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="profile-wrapper"
      >
        {/* ── SIDEBAR ── */}
        <aside className="profile-sidebar">
          <div className="sidebar-avatar-card">
            <div className="avatar-ring">
              <div className="avatar-circle">{avatarLetter}</div>
              <button className="avatar-edit-btn" title="Đổi ảnh">
                <FontAwesomeIcon icon={faCamera} />
              </button>
            </div>
            <h3 className="sidebar-name">
              {profileData.fullName || "Người dùng"}
            </h3>
            <p className="sidebar-email">{profileData.email || ""}</p>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faUser} />
              </span>
              <span>Hồ sơ cá nhân</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faShieldAlt} />
              </span>
              <span>Bảo mật</span>
            </button>
          </nav>

          <div className="sidebar-actions">
            <button className="btn-sidebar-back" onClick={() => navigate("/")}>
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
                        {profileData.fullName || "Người dùng"}
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
                            {profileData.fullName || "Chưa cập nhật"}
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
                            {profileData.email || "Chưa cập nhật"}
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
                            {profileData.phoneNumber || "Chưa cập nhật"}
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
                            {formatDOB(profileData.dateOfBirth)}
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
                      onSubmit={handleUpdateProfile}
                      className="profile-form"
                    >
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="fullName">
                            Họ và tên <span className="required">*</span>
                          </label>
                          <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            className="input-field"
                            value={profileData.fullName}
                            onChange={handleProfileChange}
                            disabled={isLoading}
                            placeholder="Nhập họ và tên"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="email">Email</label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            className="input-field input-readonly"
                            value={profileData.email}
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
                            name="phoneNumber"
                            type="tel"
                            className="input-field"
                            value={profileData.phoneNumber}
                            onChange={handleProfileChange}
                            disabled={isLoading}
                            placeholder="Nhập số điện thoại"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="dateOfBirth">Ngày sinh</label>
                          <input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            className="input-field"
                            value={profileData.dateOfBirth}
                            onChange={handleProfileChange}
                            disabled={isLoading}
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
                      onSubmit={handleChangePassword}
                      className="profile-form"
                    >
                      <div className="form-group">
                        <label htmlFor="currentPassword">
                          Mật khẩu hiện tại
                        </label>
                        <div className="password-wrapper">
                          <input
                            id="currentPassword"
                            name="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            className="input-field"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            disabled={isLoading}
                            placeholder="Nhập mật khẩu hiện tại"
                            required
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
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="newPassword">Mật khẩu mới</label>
                          <div className="password-wrapper">
                            <input
                              id="newPassword"
                              name="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              className="input-field"
                              value={passwordData.newPassword}
                              onChange={handlePasswordChange}
                              disabled={isLoading}
                              placeholder="Nhập mật khẩu mới"
                              required
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
                        </div>
                        <div className="form-group">
                          <label htmlFor="confirmPassword">
                            Xác nhận mật khẩu mới
                          </label>
                          <div className="password-wrapper">
                            <input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              className="input-field"
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordChange}
                              disabled={isLoading}
                              placeholder="Xác nhận mật khẩu mới"
                              required
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
                            setPasswordData({
                              currentPassword: "",
                              newPassword: "",
                              confirmPassword: "",
                            });
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
