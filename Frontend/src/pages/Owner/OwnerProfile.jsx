import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { User, Lock, Mail, Phone, Cake, SquarePen, Wallet } from "lucide-react";
import {
  getProfile,
  updateProfile as updateProfileAPI,
  changePassword as changePasswordAPI,
} from "../../services/authService";
import { getWalletBalance } from "../../services/walletService";
import { updateProfile as updateProfileRedux } from "../../store/authSlice";
import "./OwnerProfile.css";

const errMessage = (e) =>
  e?.response?.data?.message ??
  e?.response?.data?.Message ??
  e?.message ??
  "Có lỗi xảy ra. Vui lòng thử lại.";

const OwnerProfile = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: getProfile,
  });
  const { data: walletInfo, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: getWalletBalance,
  });

  useEffect(() => {
    if (!profile) return;
    setProfileData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phoneNumber: profile.phoneNumber || "",
      dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
    });
  }, [profile]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.fullName?.trim()) {
      toast.error("Vui lòng nhập họ tên.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfileAPI(profileData);
      dispatch(updateProfileRedux(profileData));
      toast.success("Cập nhật hồ sơ thành công.");
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng điền đủ các ô mật khẩu.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới không khớp.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePasswordAPI(passwordData);
      toast.success("Đổi mật khẩu thành công.");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const profileName = profileData.fullName?.trim() || "Field Owner";
  const profileEmail = profileData.email?.trim() || "Chưa cập nhật";
  const profilePhone = profileData.phoneNumber?.trim() || "Chưa cập nhật";
  const profileDob = profileData.dateOfBirth?.trim() || "Chưa cập nhật";
  const avatarLetter = (profileName || "O").charAt(0).toUpperCase();

  return (
    <div className="owner-profile">
      <header className="op-header">
        <div>
          <h1>Hồ sơ chủ sân</h1>
          <p className="op-sub">Thông tin tài khoản, đổi mật khẩu và đăng ký gói trên cùng một trang.</p>
        </div>
        <Link to="/owner" className="op-btn op-btn--ghost">
          ← Tổng quan
        </Link>
      </header>

      <section className="op-hero">
        <div className="op-hero-main">
          <div className="op-hero-avatar">{avatarLetter}</div>
          <div>
            <h2 className="op-hero-name">{profileName}</h2>
            <p className="op-hero-role">Thành viên Fiebo</p>
          </div>
        </div>
        <Link to="/owner/subscription" className="op-btn op-hero-plan-btn">
          Subscription plan
        </Link>
      </section>

      <section className="op-card op-info-card">
        <div className="op-info-head">
          <h2 className="op-card-title" style={{ marginBottom: 0 }}>
            <User size={18} aria-hidden />
            Thông tin cá nhân
          </h2>
          <button
            type="button"
            className="op-btn op-btn--secondary"
            onClick={() => setEditingProfile((v) => !v)}
          >
            <SquarePen size={16} />
            {editingProfile ? "Ẩn chỉnh sửa" : "Chỉnh sửa"}
          </button>
        </div>

        {profileLoading && !profile ? (
          <p className="op-muted">Đang tải…</p>
        ) : editingProfile ? (
          <form className="op-form op-edit-form" onSubmit={handleProfileSubmit}>
            <label className="op-field">
              <span>Họ tên</span>
              <input
                name="fullName"
                value={profileData.fullName}
                onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
              />
            </label>
            <label className="op-field">
              <span>Email</span>
              <input value={profileData.email} disabled className="op-input-disabled" />
            </label>
            <label className="op-field">
              <span>Số điện thoại</span>
              <input
                name="phoneNumber"
                value={profileData.phoneNumber}
                onChange={(e) => setProfileData((p) => ({ ...p, phoneNumber: e.target.value }))}
              />
            </label>
            <label className="op-field">
              <span>Ngày sinh</span>
              <input
                type="date"
                name="dateOfBirth"
                value={profileData.dateOfBirth}
                onChange={(e) => setProfileData((p) => ({ ...p, dateOfBirth: e.target.value }))}
              />
            </label>
            <button type="submit" className="op-btn op-btn--primary" disabled={savingProfile}>
              {savingProfile ? "Đang lưu…" : "Lưu hồ sơ"}
            </button>
          </form>
        ) : (
          <div className="op-info-grid">
            <div className="op-info-item">
              <span className="op-info-icon"><User size={18} /></span>
              <div>
                <p className="op-info-label">Họ và tên</p>
                <p className="op-info-value">{profileName}</p>
              </div>
            </div>
            <div className="op-info-item">
              <span className="op-info-icon"><Mail size={18} /></span>
              <div>
                <p className="op-info-label">Email</p>
                <p className="op-info-value">{profileEmail}</p>
              </div>
            </div>
            <div className="op-info-item">
              <span className="op-info-icon"><Phone size={18} /></span>
              <div>
                <p className="op-info-label">Số điện thoại</p>
                <p className="op-info-value">{profilePhone}</p>
              </div>
            </div>
            <div className="op-info-item">
              <span className="op-info-icon"><Cake size={18} /></span>
              <div>
                <p className="op-info-label">Ngày sinh</p>
                <p className="op-info-value">{profileDob}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="op-grid">

        <section className="op-card">
          <h2 className="op-card-title">
            <Lock size={18} aria-hidden />
            Đổi mật khẩu
          </h2>
          <form className="op-form" onSubmit={handlePasswordSubmit}>
            <label className="op-field">
              <span>Mật khẩu hiện tại</span>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))
                }
              />
            </label>
            <label className="op-field">
              <span>Mật khẩu mới</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </label>
            <label className="op-field">
              <span>Nhập lại mật khẩu mới</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                }
              />
            </label>
            <button type="submit" className="op-btn op-btn--secondary" disabled={savingPassword}>
              {savingPassword ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
            </button>
          </form>
        </section>

        <section className="op-card op-sub-wallet-card">
          <div className="op-card-title" style={{ marginBottom: 10 }}>
            <Wallet size={18} aria-hidden />
            Số dư ví
          </div>
          {walletLoading && walletInfo == null ? (
            <p className="op-muted">Đang tải số dư…</p>
          ) : (
            <div className="op-sub-wallet-inner">
              <div className="op-sub-wallet-balance">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                  Number(walletInfo?.balance ?? 0),
                )}
              </div>
              <Link to="/wallet/top-up" className="op-btn op-btn--secondary op-btn--sm">
                Nạp tiền
              </Link>
            </div>
          )}
        </section>
      </div>

    </div>
  );
};

export default OwnerProfile;
