import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  Cake,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Landmark,
  Lock,
  Mail,
  Phone,
  Plus,
  SquarePen,
  Trash2,
  User,
} from "lucide-react";
import {
  getProfile,
  updateProfile as updateProfileAPI,
  changePassword as changePasswordAPI,
} from "../../../services/authService";
import {
  BANK_ACCOUNTS_QUERY_KEY,
  createBankAccount,
  deleteBankAccount,
  getBankAccounts,
  updateBankAccount,
} from "../../../services/walletService";
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

const bankAccountSchema = yup.object({
  bankName: yup.string().trim().required("Vui lòng nhập tên ngân hàng."),
  accountNumber: yup
    .string()
    .trim()
    .required("Vui lòng nhập số tài khoản.")
    .matches(/^[0-9]{6,50}$/, "Số tài khoản chỉ gồm chữ số và dài từ 6 đến 50 ký tự."),
  accountHolderName: yup.string().trim().required("Vui lòng nhập tên chủ tài khoản."),
});

const formatDateLabel = (value) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const maskAccountNumber = (value) => {
  const digits = String(value || "").replace(/\s/g, "");
  if (!digits) return "Chưa cập nhật";
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const getBankBadge = (bankName) => {
  const cleaned = String(bankName || "").trim();
  if (!cleaned) return "BA";
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const OwnerProfile = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: getProfile,
  });

  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery({
    queryKey: BANK_ACCOUNTS_QUERY_KEY,
    queryFn: getBankAccounts,
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

  const {
    register: regBank,
    handleSubmit: submitBank,
    reset: resetBank,
    formState: { errors: bankErrors },
  } = useForm({
    resolver: yupResolver(bankAccountSchema),
    mode: "onTouched",
    defaultValues: {
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
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

  const profileName = profile?.fullName?.trim() || "Field Owner";
  const profilePhone = profile?.phoneNumber?.trim() || "Chưa cập nhật";
  const profileDob = formatDateLabel(profile?.dateOfBirth);
  const avatarLetter = (profileName || "O").charAt(0).toUpperCase();

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
      setEditingProfile(false);
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

  const openCreateBankForm = () => {
    setEditingBankId(null);
    resetBank({
      bankName: "",
      accountNumber: "",
      accountHolderName: profileName,
    });
    setShowBankForm(true);
  };

  const openEditBankForm = (account) => {
    setEditingBankId(account.id);
    resetBank({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
    });
    setShowBankForm(true);
  };

  const closeBankForm = () => {
    setEditingBankId(null);
    setShowBankForm(false);
    resetBank({
      bankName: "",
      accountNumber: "",
      accountHolderName: profileName,
    });
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
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      closeBankForm();
    } catch (error) {
      toast.error(errMessage(error));
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
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (editingBankId === account.id) {
        closeBankForm();
      }
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setDeletingBankId(null);
    }
  };

  const profileErr = (name) => profileErrors[name]?.message;
  const pwdErr = (name) => pwdErrors[name]?.message;
  const bankErr = (name) => bankErrors[name]?.message;

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
        <Link to="/owner/subscription/overview" className="op-btn op-hero-plan-btn">
          Membership
        </Link>
      </section>

      <div className="op-dashboard-grid">
        <section className="op-card op-info-card">
          <div className="op-info-head">
            <div>
              <h2 className="op-card-title" style={{ marginBottom: 0 }}>
                <User size={18} aria-hidden />
                Hồ sơ chủ sân
              </h2>
              <p className="op-card-subtitle">Cập nhật thông tin cá nhân để đồng bộ hồ sơ và đối soát thanh toán.</p>
            </div>
            <button
              type="button"
              className="op-btn op-btn--edit"
              onClick={() => setEditingProfile((value) => !value)}
            >
              <SquarePen size={16} />
              {editingProfile ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}
            </button>
          </div>

          {profileLoading && !profile ? (
            <p className="op-muted">Đang tải…</p>
          ) : editingProfile ? (
            <form className="op-form op-edit-form" onSubmit={submitProfile(onProfileSave)} noValidate>
              <div className="op-form-grid">
                <label className="op-field">
                  <span>Họ tên</span>
                  <input {...regProfile("fullName")} />
                  {profileErr("fullName") ? <span className="op-field-error">{profileErr("fullName")}</span> : null}
                </label>
                <label className="op-field">
                  <span>Email</span>
                  <input value={profile?.email || ""} disabled className="op-input-disabled" readOnly />
                </label>
                <label className="op-field">
                  <span>Số điện thoại</span>
                  <input {...regProfile("phoneNumber")} />
                  {profileErr("phoneNumber") ? <span className="op-field-error">{profileErr("phoneNumber")}</span> : null}
                </label>
                <label className="op-field">
                  <span>Ngày sinh</span>
                  <input type="date" {...regProfile("dateOfBirth")} />
                  {profileErr("dateOfBirth") ? <span className="op-field-error">{profileErr("dateOfBirth")}</span> : null}
                </label>
              </div>
              <div className="op-inline-actions">
                <button type="submit" className="op-btn op-btn--primary" disabled={savingProfile}>
                  {savingProfile ? "Đang lưu…" : "Lưu hồ sơ"}
                </button>
                <button type="button" className="op-btn op-btn--secondary" onClick={() => setEditingProfile(false)}>
                  Hủy
                </button>
              </div>
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
                  <p className="op-info-value">{profile?.email?.trim() || "Chưa cập nhật"}</p>
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

        <div className="op-side-column">
          <section className="op-card op-bank-card">
            <div className="op-info-head">
              <div>
                <h2 className="op-card-title" style={{ marginBottom: 0 }}>
                  <Landmark size={18} aria-hidden />
                  Tài khoản ngân hàng
                </h2>
                <p className="op-card-subtitle">Tài khoản dùng để nhận payout từ hệ thống.</p>
              </div>
              <button
                type="button"
                className="op-btn op-btn--edit"
                onClick={showBankForm ? closeBankForm : openCreateBankForm}
                style={bankAccounts.length > 0 && !showBankForm ? { display: "none" } : undefined}
              >
                {showBankForm ? "Đóng" : <><Plus size={16} /> Thêm tài khoản</>}
              </button>
            </div>

            {bankAccountsLoading ? (
              <p className="op-muted">Đang tải tài khoản ngân hàng…</p>
            ) : bankAccounts.length > 0 ? (
              <div className="op-bank-list">
                {bankAccounts.map((account, index) => (
                  <article key={account.id} className={`op-bank-item${editingBankId === account.id ? " is-editing" : ""}`}>
                    <span className="op-bank-badge">{getBankBadge(account.bankName)}</span>
                    <div className="op-bank-copy">
                      <div className="op-bank-heading">
                        <p className="op-bank-name">{account.bankName}</p>
                        {index === 0 ? <span className="op-bank-tag"><BadgeCheck size={14} /> Ưu tiên</span> : null}
                      </div>
                      <p className="op-bank-meta">STK {maskAccountNumber(account.accountNumber)}</p>
                      <p className="op-bank-owner">{account.accountHolderName}</p>
                    </div>
                    <div className="op-bank-actions">
                      <button type="button" className="op-btn op-btn--secondary op-btn--sm" onClick={() => openEditBankForm(account)}>
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="op-btn op-btn--danger op-btn--sm"
                        onClick={() => handleDeleteBank(account)}
                        disabled={deletingBankId === account.id}
                      >
                        <Trash2 size={14} />
                        {deletingBankId === account.id ? "Đang xóa…" : "Xóa"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="op-empty-bank">
                <span className="op-empty-bank-icon">
                  <CreditCard size={18} />
                </span>
                <div>
                  <p className="op-empty-bank-title">Chưa có tài khoản ngân hàng</p>
                  <p className="op-empty-bank-text">Thêm ít nhất một tài khoản để nhận payout nhanh và đúng đích.</p>
                </div>
              </div>
            )}

            {showBankForm && bankAccounts.length === 0 ? (
              <form className="op-form op-bank-form" onSubmit={submitBank(onBankSave)} noValidate>
                <div className="op-form-grid">
                  <label className="op-field">
                    <span>Tên ngân hàng</span>
                    <input placeholder="VD: Vietcombank" {...regBank("bankName")} />
                    {bankErr("bankName") ? <span className="op-field-error">{bankErr("bankName")}</span> : null}
                  </label>
                  <label className="op-field">
                    <span>Số tài khoản</span>
                    <input placeholder="Nhập số tài khoản" {...regBank("accountNumber")} />
                    {bankErr("accountNumber") ? <span className="op-field-error">{bankErr("accountNumber")}</span> : null}
                  </label>
                  <label className="op-field op-field--full">
                    <span>Chủ tài khoản</span>
                    <input placeholder="Nhập tên chủ tài khoản" {...regBank("accountHolderName")} />
                    {bankErr("accountHolderName") ? <span className="op-field-error">{bankErr("accountHolderName")}</span> : null}
                  </label>
                </div>
                <div className="op-inline-actions">
                  <button type="submit" className="op-btn op-btn--primary" disabled={savingBank}>
                    {savingBank ? "Đang lưu…" : editingBankId ? "Cập nhật tài khoản" : "Lưu tài khoản"}
                  </button>
                  <button type="button" className="op-btn op-btn--secondary" onClick={closeBankForm}>
                    Hủy
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="op-card op-password-card">
            <div className="op-info-head op-info-head--compact">
              <div>
                <h2 className="op-card-title" style={{ marginBottom: 0 }}>
                  <Lock size={18} aria-hidden />
                  Bảo mật tài khoản
                </h2>
                <p className="op-card-subtitle">Đổi mật khẩu định kỳ để tăng an toàn khi quản lý cơ sở và payout.</p>
              </div>
              <button
                type="button"
                className="op-btn op-btn--secondary op-btn--sm"
                onClick={() => setSecurityOpen((value) => !value)}
                aria-expanded={securityOpen}
              >
                {securityOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {securityOpen ? "Đóng" : "Mở"}
              </button>
            </div>

            {securityOpen ? (
              <form className="op-form" onSubmit={submitPassword(onPasswordSave)} noValidate>
                <label className="op-field">
                  <span>Mật khẩu hiện tại</span>
                  <input type="password" autoComplete="current-password" {...regPwd("currentPassword")} />
                  {pwdErr("currentPassword") ? <span className="op-field-error">{pwdErr("currentPassword")}</span> : null}
                </label>
                <label className="op-field">
                  <span>Mật khẩu mới</span>
                  <input type="password" autoComplete="new-password" {...regPwd("newPassword")} />
                  {pwdErr("newPassword") ? <span className="op-field-error">{pwdErr("newPassword")}</span> : null}
                </label>
                <label className="op-field">
                  <span>Nhập lại mật khẩu mới</span>
                  <input type="password" autoComplete="new-password" {...regPwd("confirmPassword")} />
                  {pwdErr("confirmPassword") ? <span className="op-field-error">{pwdErr("confirmPassword")}</span> : null}
                </label>
                <button type="submit" className="op-btn op-btn--primary" disabled={savingPassword}>
                  {savingPassword ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile;

