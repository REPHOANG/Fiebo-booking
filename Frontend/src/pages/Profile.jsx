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
  faUniversity,
  faCreditCard,
  faPlus,
  faTrash,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProfile,
  updateProfile as updateProfileAPI,
  changePassword as changePasswordAPI,
} from "../services/authService";
import {
  BANK_ACCOUNTS_QUERY_KEY,
  createBankAccount,
  deleteBankAccount,
  getBankAccounts,
  updateBankAccount,
} from "../services/walletService";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";
import "./Profile.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const customerProfileSchema = yup.object({
  fullName: yup.string().trim().required("Vui lòng nhập họ và tên"),
  phoneNumber: yup
    .string()
    .transform((value) => String(value ?? "").replace(/\s/g, "").trim())
    .matches(/^\d{10,15}$/, "Số điện thoại không hợp lệ")
    .optional(),
  dateOfBirth: yup.string().optional(),
});

const customerPasswordSchema = yup.object({
  currentPassword: yup.string().required("Vui lòng nhập mật khẩu hiện tại"),
  newPassword: yup
    .string()
    .required("Vui lòng nhập mật khẩu mới")
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .matches(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
    .matches(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
    .matches(/[0-9]/, "Mật khẩu phải có ít nhất 1 chữ số")
    .matches(/[\W_]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"),
  confirmPassword: yup
    .string()
    .required("Vui lòng xác nhận mật khẩu")
    .oneOf([yup.ref("newPassword")], "Mật khẩu mới không khớp"),
});

const bankAccountSchema = yup.object({
  bankName: yup.string().trim().required("Vui lòng nhập tên ngân hàng."),
  accountNumber: yup
    .string()
    .trim()
    .required("Vui lòng nhập số tài khoản.")
    .matches(/^[0-9]{6,50}$/, "Số tài khoản chỉ gồm chữ số, dài từ 6 đến 50 ký tự."),
  accountHolderName: yup.string().trim().required("Vui lòng nhập tên chủ tài khoản."),
});

const maskAccountNumber = (value) => {
  const digits = String(value || "").replace(/\s/g, "");
  if (!digits) return "Chưa cập nhật";
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const getBankBadge = (bankName) => {
  const cleaned = String(bankName || "").trim();
  if (!cleaned) return "BA";
  return cleaned.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
};

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [savingBank, setSavingBank] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState(null);
  const hasToken = Boolean(localStorage.getItem(AUTH_STORAGE_KEY));

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled: hasToken,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery({
    queryKey: BANK_ACCOUNTS_QUERY_KEY,
    queryFn: getBankAccounts,
    enabled: hasToken,
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

  const {
    register: regBank,
    handleSubmit: submitBankForm,
    reset: resetBankForm,
    formState: { errors: bankErrors },
  } = useForm({
    resolver: yupResolver(bankAccountSchema),
    mode: "onTouched",
    defaultValues: { bankName: "", accountNumber: "", accountHolderName: "" },
  });

  useEffect(() => {
    if (!profile) return;
    resetProfileForm({
      fullName: profile.fullName || "",
      phoneNumber: profile.phoneNumber || "",
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
    });
  }, [profile, resetProfileForm]);

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
      dispatch(updateProfile(payload));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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

  const openCreateBankForm = () => {
    setEditingBankId(null);
    resetBankForm({ bankName: "", accountNumber: "", accountHolderName: p.fullName || "" });
    setShowBankForm(true);
  };

  const openEditBankForm = (account) => {
    setEditingBankId(account.id);
    resetBankForm({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
    });
    setShowBankForm(true);
  };

  const closeBankForm = () => {
    setEditingBankId(null);
    setShowBankForm(false);
    resetBankForm({ bankName: "", accountNumber: "", accountHolderName: "" });
  };

  const onBankSave = async (values) => {
    const payload = {
      bankName: values.bankName.trim(),
      accountNumber: values.accountNumber.trim(),
      accountHolderName: values.accountHolderName.trim(),
    };
    setSavingBank(true);
    try {
      if (editingBankId) {
        await updateBankAccount(editingBankId, payload);
        toast.success("Cập nhật tài khoản ngân hàng thành công.");
      } else {
        await createBankAccount(payload);
        toast.success("Thêm tài khoản ngân hàng thành công.");
      }
      await queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY });
      closeBankForm();
    } catch (error) {
      toast.error(error?.response?.data?.message ?? error?.message ?? "Có lỗi xảy ra.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBank = async (account) => {
    const result = await Swal.fire({
      title: "Xóa tài khoản ngân hàng?",
      text: `${account.bankName} - ${account.accountNumber}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#e53e3e",
    });
    if (!result.isConfirmed) return;
    setDeletingBankId(account.id);
    try {
      await deleteBankAccount(account.id);
      toast.success("Đã xóa tài khoản ngân hàng.");
      await queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY });
      if (editingBankId === account.id) closeBankForm();
    } catch (error) {
      toast.error(error?.response?.data?.message ?? error?.message ?? "Có lỗi xảy ra.");
    } finally {
      setDeletingBankId(null);
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
            <button
              className={`sidebar-nav-item ${activeTab === "bank" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("bank");
                setMobileMenuOpen(false);
              }}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={faUniversity} />
              </span>
              <span>Tài khoản ngân hàng</span>
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

            {activeTab === "bank" && (
              <motion.div
                key="bank"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="main-card">
                  <div className="card-header">
                    <h3>
                      <FontAwesomeIcon icon={faUniversity} /> Tài khoản ngân hàng
                    </h3>
                    {bankAccounts.length === 0 && (
                      <button
                        className="btn-edit-profile"
                        onClick={showBankForm ? closeBankForm : openCreateBankForm}
                      >
                        <FontAwesomeIcon icon={showBankForm ? faTimes : faPlus} />
                        {showBankForm ? " Đóng" : " Thêm tài khoản"}
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                    Tài khoản dùng để nhận hoàn tiền hoặc rút tiền từ ví.
                  </p>

                  {bankAccountsLoading ? (
                    <p className="hint-text">Đang tải…</p>
                  ) : bankAccounts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {bankAccounts.map((account) => (
                        <div
                          key={account.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "14px 16px",
                            border: "1px solid #e5e7eb",
                            borderRadius: 10,
                            background: editingBankId === account.id ? "#f0fdf4" : "#fafafa",
                          }}
                        >
                          <div
                            style={{
                              width: 40, height: 40, borderRadius: "50%",
                              background: "var(--primary, #16a34a)",
                              color: "#fff", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              fontWeight: 700, fontSize: 15, flexShrink: 0,
                            }}
                          >
                            {getBankBadge(account.bankName)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, margin: 0 }}>{account.bankName}</p>
                            <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
                              STK {maskAccountNumber(account.accountNumber)}
                            </p>
                            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                              {account.accountHolderName}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            <button
                              className="btn-cancel"
                              style={{ padding: "6px 12px", fontSize: 13 }}
                              onClick={() => openEditBankForm(account)}
                            >
                              <FontAwesomeIcon icon={faPen} /> Sửa
                            </button>
                            <button
                              className="btn-cancel"
                              style={{ padding: "6px 12px", fontSize: 13, color: "#dc2626", borderColor: "#fca5a5" }}
                              disabled={deletingBankId === account.id}
                              onClick={() => handleDeleteBank(account)}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              {deletingBankId === account.id ? " Đang xóa…" : " Xóa"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
                      <FontAwesomeIcon icon={faCreditCard} size="2x" style={{ marginBottom: 10 }} />
                      <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Chưa có tài khoản ngân hàng</p>
                      <p style={{ fontSize: 13, margin: 0 }}>Thêm tài khoản để nhận hoàn tiền hoặc rút tiền từ ví.</p>
                    </div>
                  )}

                  {(showBankForm && bankAccounts.length === 0) || editingBankId ? (
                    <form
                      onSubmit={submitBankForm(onBankSave)}
                      className="profile-form"
                      noValidate
                      style={{ marginTop: 20 }}
                    >
                      <div className="form-row">
                        <div className="form-group">
                          <label>Tên ngân hàng <span className="required">*</span></label>
                          <input className="input-field" placeholder="VD: Vietcombank" {...regBank("bankName")} />
                          {bankErrors.bankName && <p className="hint-text" style={{ color: "#dc2626" }}>{bankErrors.bankName.message}</p>}
                        </div>
                        <div className="form-group">
                          <label>Số tài khoản <span className="required">*</span></label>
                          <input className="input-field" placeholder="Nhập số tài khoản" {...regBank("accountNumber")} />
                          {bankErrors.accountNumber && <p className="hint-text" style={{ color: "#dc2626" }}>{bankErrors.accountNumber.message}</p>}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Chủ tài khoản <span className="required">*</span></label>
                        <input className="input-field" placeholder="Nhập tên chủ tài khoản" {...regBank("accountHolderName")} />
                        {bankErrors.accountHolderName && <p className="hint-text" style={{ color: "#dc2626" }}>{bankErrors.accountHolderName.message}</p>}
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-save" disabled={savingBank}>
                          <FontAwesomeIcon icon={faCheck} /> {savingBank ? "Đang lưu…" : editingBankId ? "Cập nhật tài khoản" : "Lưu tài khoản"}
                        </button>
                        <button type="button" className="btn-cancel" onClick={closeBankForm}>
                          <FontAwesomeIcon icon={faTimes} /> Hủy
                        </button>
                      </div>
                    </form>
                  ) : null}
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
