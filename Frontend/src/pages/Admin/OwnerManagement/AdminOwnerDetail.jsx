import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { getOwnerDetail } from "../../../services/adminService";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import "../VenueRegistration/VenueDetailPage.css";
import "./AdminOwnerDetail.css";

const formatDate = (value) => {
  if (!value) return "-";
  return dayjs(value).format("DD/MM/YYYY");
};

const accountStatusStyle = {
  1: { label: "Đang hoạt động", bg: "#dcfce7", color: "#166534" },
  Active: { label: "Đang hoạt động", bg: "#dcfce7", color: "#166534" },
  0: { label: "Không hoạt động", bg: "#fef9c3", color: "#854d0e" },
  Inactive: { label: "Không hoạt động", bg: "#fef9c3", color: "#854d0e" },
  "-1": { label: "Bị cấm", bg: "#fee2e2", color: "#991b1b" },
  Banned: { label: "Bị cấm", bg: "#fee2e2", color: "#991b1b" },
};

const subStatusStyle = {
  Active: { label: "Đang hoạt động", bg: "#dbeafe", color: "#1d4ed8" },
  Expired: { label: "Đã hết hạn", bg: "#fee2e2", color: "#991b1b" },
  Cancelled: { label: "Đã huỷ", bg: "#f1f5f9", color: "#64748b" },
};

const venueStatusStyle = {
  Inactive: { label: "Không hoạt động", bg: "#fef9c3", color: "#854d0e" },
  Active: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Locked: { label: "Đã khoá", bg: "#fee2e2", color: "#991b1b" },
  Pending: { label: "Chờ duyệt", bg: "#fef9c3", color: "#854d0e" },
  Rejected: { label: "Bị từ chối", bg: "#fee2e2", color: "#991b1b" },
};

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

const AdminOwnerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminOwnerDetail", id],
    queryFn: () => getOwnerDetail(id),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <LoadingPage />;

  if (isError || !data) {
    return (
      <div className="avr-page">
        <div className="avr-card">
          <p style={{ color: "#991b1b" }}>Không thể tải thông tin chủ sân.</p>
          <button className="avr-back-btn" onClick={() => navigate("/admin/owners")}>
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const name = data.fullName ?? data.name ?? data.ownerName ?? "";
  const email = data.email ?? "-";
  const phone = data.phoneNumber ?? data.phone ?? "-";
  const rawAccStatus = data.status ?? data.accountStatus;
  const accSt = accountStatusStyle[String(rawAccStatus)] ?? accountStatusStyle[rawAccStatus] ?? { label: String(rawAccStatus || "Không rõ"), bg: "#f1f5f9", color: "#475569" };
  const createdAt = formatDate(data.createdAt ?? data.createdDate);

  const sub = data.subscription ?? data.currentSubscription ?? null;
  const rawSubStatus = sub?.status ?? sub?.subscriptionStatus;
  const subSt = subStatusStyle[rawSubStatus] ?? { label: rawSubStatus || "Không có", bg: "#f1f5f9", color: "#64748b" };

  const venues = Array.isArray(data.venues) ? data.venues : [];

  return (
    <div className="avr-page">
      <div className="avr-card">
        {/* Header */}
        <header className="avr-page-header">
          <div className="avr-page-header__top">
            <h3 className="avr-page-title">
              <UserRound size={22} strokeWidth={2} aria-hidden />
              Hồ sơ chủ sân
            </h3>
            <button
              type="button"
              className="avr-back-btn"
              onClick={() => navigate("/admin/owners")}
            >
              <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
              Quay lại danh sách
            </button>
          </div>
        </header>

        {/* Hero */}
        <div className="owner-detail-hero">
          <div className="owner-detail-avatar">{getInitials(name)}</div>
          <div className="owner-detail-hero-text">
            <h2 className="owner-detail-name">{name || "Chưa có tên"}</h2>
            <div className="avr-hero-chips">
              <span
                className="avr-chip"
                style={{ background: accSt.bg, color: accSt.color, borderColor: accSt.bg }}
              >
                {accSt.label}
              </span>
              {createdAt !== "-" && (
                <span className="avr-chip">
                  <CalendarDays size={13} strokeWidth={2} />
                  Ngày tạo: {createdAt}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info columns */}
        <div className="avr-body">
          <div className="avr-columns">
            {/* Contact */}
            <section className="avr-panel avr-panel--subtle">
              <h4 className="avr-panel-title">
                <UserRound size={16} strokeWidth={2} aria-hidden />
                Thông tin liên hệ
              </h4>
              <div className="avr-panel-body">
                <dl className="avr-dl avr-dl--compact">
                  <div className="avr-dl-row">
                    <dt><Mail size={14} strokeWidth={2} /> Email</dt>
                    <dd>{email}</dd>
                  </div>
                  <div className="avr-dl-row">
                    <dt><Phone size={14} strokeWidth={2} /> Số điện thoại</dt>
                    <dd>{phone}</dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Subscription */}
            <section className="avr-panel avr-panel--subtle">
              <h4 className="avr-panel-title">
                <CreditCard size={16} strokeWidth={2} aria-hidden />
                Gói đăng ký
              </h4>
              <div className="avr-panel-body">
                {sub ? (
                  <dl className="avr-dl avr-dl--compact">
                    <div className="avr-dl-row">
                      <dt><Package size={14} strokeWidth={2} /> Tên gói</dt>
                      <dd>{sub.currentPlan ?? "-"}</dd>
                    </div>
                    <div className="avr-dl-row">
                      <dt><CalendarDays size={14} strokeWidth={2} /> Bắt đầu</dt>
                      <dd>{formatDate(sub.startDate)}</dd>
                    </div>
                    <div className="avr-dl-row">
                      <dt><CalendarDays size={14} strokeWidth={2} /> Kết thúc</dt>
                      <dd>{formatDate(sub.endDate)}</dd>
                    </div>
                    <div className="avr-dl-row">
                      <dt>Trạng thái</dt>
                      <dd>
                        <span
                          className="owner-detail-sub-badge"
                          style={{ background: subSt.bg, color: subSt.color }}
                        >
                          {subSt.label}
                        </span>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="avr-muted">Chủ sân chưa đăng ký gói nào.</p>
                )}
              </div>
            </section>
          </div>

          {/* Venues list */}
          <div className="owner-detail-venues">
            <h4 className="avr-docs-landmark">
              <Building2 size={16} strokeWidth={2} aria-hidden />
              Danh sách sân ({venues.length})
            </h4>

            {venues.length === 0 ? (
              <p className="avr-muted">Chủ sân chưa có sân nào.</p>
            ) : (
              <div className="owner-detail-venue-grid">
                {venues.map((v) => {
                  const venueId = v.id ?? v.venueId;
                  const rawVSt = v.status ?? "";
                  const vSt = venueStatusStyle[rawVSt] ?? { label: rawVSt || "Không rõ", bg: "#f1f5f9", color: "#475569" };
                  const fieldCount = v.fieldCount ?? v.numberOfFields ?? v.fields ?? 0;
                  return (
                    <div
                      key={venueId}
                      className="owner-detail-venue-card"
                      onClick={() =>
                        navigate(`/admin/venues/${venueId}`, {
                          state: { venue: v, owner: { id, name, email, phone } },
                        })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        navigate(`/admin/owners/${id}/venues/${venueId}`, {
                          state: { venue: v, owner: { name, email, phone } },
                        })
                      }
                    >
                      <div className="owner-detail-venue-card__top">
                        <span className="owner-detail-venue-icon">
                          <Building2 size={18} strokeWidth={2} />
                        </span>
                        <span
                          className="owner-detail-venue-status"
                          style={{ background: vSt.bg, color: vSt.color }}
                        >
                          {vSt.label}
                        </span>
                      </div>
                      <p className="owner-detail-venue-name">
                        {v.venueName ?? v.name ?? "Chưa đặt tên"}
                      </p>
                      <p className="owner-detail-venue-address">
                        <MapPin size={13} strokeWidth={2} />
                        {v.addressDetail} - {v.ward} - {v.province}
                      </p>
                      <p className="owner-detail-venue-fields">
                        <Store size={13} strokeWidth={2} />
                        {fieldCount} sân
                      </p>
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

export default AdminOwnerDetail;
