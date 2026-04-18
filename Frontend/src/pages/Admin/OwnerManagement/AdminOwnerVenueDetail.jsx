import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Clock3,
  CreditCard,
  Landmark,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  UserRound,
} from "lucide-react";
import { getAdminVenueDetail, lockVenue, unlockVenue } from "../../../services/adminService";
import ReviewDocImageCarousel from "../../Owner/CreateVenueSteps/ReviewDocImageCarousel";
import { toast } from "react-toastify";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import "../../Owner/Venue/CreateVenue.css";
import "../VenueRegistration/VenueDetailPage.css";

const formatDate = (value) => {
  if (!value) return "-";
  return dayjs(value).format("DD/MM/YYYY");
};

const formatTimeValue = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 5);
};

const DetailPanel = ({ title, icon: Icon, children }) => (
  <section className="avr-panel avr-panel--subtle">
    <h4 className="avr-panel-title">
      {Icon ? <Icon size={16} strokeWidth={2} aria-hidden /> : null}
      {title}
    </h4>
    <div className="avr-panel-body">{children}</div>
  </section>
);

const venueStatusStyle = {
  Open: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Active: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Locked: { label: "Đã khoá", bg: "#fee2e2", color: "#991b1b" },
  Pending: { label: "Chờ duyệt", bg: "#fef9c3", color: "#854d0e" },
};

export const AdminOwnerVenueDetail = () => {
  const { ownerId, venueId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmLock, setConfirmLock] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adminOwnerVenueDetail", venueId],
    queryFn: () => getAdminVenueDetail(venueId),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const lockMutation = useMutation({
    mutationFn: () => lockVenue(venueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOwnerVenueDetail", venueId] });
      queryClient.invalidateQueries({ queryKey: ["adminOwnerDetail", ownerId] });
      toast.success("Đã khoá sân thành công");
      setConfirmLock(false);
    },
    onError: () => toast.error("Khoá sân thất bại"),
  });

  const unlockMutation = useMutation({
    mutationFn: () => unlockVenue(venueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOwnerVenueDetail", venueId] });
      queryClient.invalidateQueries({ queryKey: ["adminOwnerDetail", ownerId] });
      toast.success("Đã mở khoá sân thành công");
    },
    onError: () => toast.error("Mở khoá sân thất bại"),
  });

  if (isLoading) return <LoadingPage />;

  const isLocked = (data?.status ?? "").toLowerCase() === "locked";
  const venueStatus = data?.status ?? "Open";
  const vSt = venueStatusStyle[venueStatus] ?? { label: venueStatus, bg: "#f1f5f9", color: "#475569" };

  const businessLicenseImages = data?.businessLicense?.images ?? [];
  const landUseDocumentImages = data?.landUseDocument?.images ?? [];
  const venueName = data?.venueName ?? data?.name ?? "Chưa đặt tên";
  const address = data?.address ?? "Chưa có địa chỉ";
  const openTime = formatTimeValue(data?.openTime);
  const closeTime = formatTimeValue(data?.closeTime);

  const businessLicenseInfo = {
    label: "Giấy phép kinh doanh",
    issueDateLabel: formatDate(data?.businessLicense?.issueDate),
    expiryDateLabel: formatDate(data?.businessLicense?.expiryDate),
    images: businessLicenseImages,
  };
  const landUseInfo = {
    label: "Giấy tờ sử dụng đất",
    issueDateLabel: formatDate(data?.landUseDocument?.issueDate),
    expiryDateLabel: formatDate(data?.landUseDocument?.expiryDate),
    images: landUseDocumentImages,
  };

  return (
    <div className="avr-page">
      <div className="avr-card">
        <header className="avr-page-header">
          <div className="avr-page-header__top">
            <h3 className="avr-page-title">
              <Building2 size={22} strokeWidth={2} aria-hidden />
              Chi tiết cơ sở
            </h3>
            <button
              type="button"
              className="avr-back-btn"
              onClick={() => navigate(`/admin/owners/${ownerId}`)}
            >
              <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
              Quay lại hồ sơ chủ sân
            </button>
          </div>

          <div
            className="avr-alert"
            style={
              isLocked
                ? { background: "#fff1f2", borderColor: "#fecdd3", color: "#be123c" }
                : undefined
            }
          >
            <CircleAlert size={18} strokeWidth={2} aria-hidden />
            <span>
              {isLocked
                ? "Sân này đang bị khoá. Nhấn nút mở khoá để cho phép cơ sở hoạt động trở lại."
                : "Nhấn nút khoá sân để tạm dừng hoạt động cơ sở. Người dùng sẽ không thể đặt sân trong thời gian khoá."}
            </span>
          </div>
        </header>

        <div className="avr-hero">
          <div className="avr-hero-text">
            <p className="avr-hero-eyebrow">Tên cơ sở</p>
            <h2 className="avr-hero-name">{venueName}</h2>
            <div className="avr-hero-chips" role="list">
              <span
                className="avr-chip"
                style={{ background: vSt.bg, color: vSt.color, borderColor: vSt.bg }}
                role="listitem"
              >
                {vSt.label}
              </span>
              <span className="avr-chip" role="listitem">
                <ScrollText size={14} strokeWidth={2.2} aria-hidden />
                Mã sân #{data?.venueId ?? venueId}
              </span>
              <span className="avr-chip avr-chip--accent" role="listitem">
                <Clock3 size={14} strokeWidth={2.2} aria-hidden />
                {openTime} - {closeTime}
              </span>
            </div>
          </div>

          <div className="avr-hero-media">
            <div className="avr-hero-placeholder" role="img" aria-label="Xem trước cơ sở">
              <Building2 size={40} strokeWidth={1.4} aria-hidden />
              <span>{venueName}</span>
              <small>{address}</small>
            </div>
          </div>
        </div>

        <div className="avr-body">
          <div className="avr-columns">
            <DetailPanel title="Giới thiệu" icon={Building2}>
              {data?.description ? (
                <p className="avr-panel-text">{data.description}</p>
              ) : (
                <p className="avr-muted">Chủ sân chưa nhập mô tả.</p>
              )}
            </DetailPanel>

            <DetailPanel title="Địa chỉ & thời gian hoạt động" icon={MapPin}>
              <dl className="avr-dl">
                <div className="avr-dl-row avr-dl-row--block">
                  <dt>Địa chỉ</dt>
                  <dd>{address}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt>Mở cửa</dt>
                  <dd>{openTime}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt>Đóng cửa</dt>
                  <dd>{closeTime}</dd>
                </div>
              </dl>
            </DetailPanel>
          </div>

          <div className="avr-columns avr-columns--secondary">
            <DetailPanel title="Chủ sở hữu" icon={UserRound}>
              <dl className="avr-dl avr-dl--compact">
                <div className="avr-dl-row">
                  <dt><Mail size={14} strokeWidth={2} aria-hidden /> Email</dt>
                  <dd>{data?.ownerEmail || "-"}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt><Phone size={14} strokeWidth={2} aria-hidden /> Số điện thoại</dt>
                  <dd>{data?.ownerPhone || "-"}</dd>
                </div>
                <div className="avr-dl-row avr-dl-row--block">
                  <dt>Họ tên</dt>
                  <dd>{data?.ownerName || "-"}</dd>
                </div>
              </dl>
            </DetailPanel>

            <DetailPanel title="Tài khoản nhận tiền" icon={CreditCard}>
              <dl className="avr-dl avr-dl--compact">
                <div className="avr-dl-row">
                  <dt><Landmark size={14} strokeWidth={2} aria-hidden /> Ngân hàng</dt>
                  <dd>{data?.ownerBankName || "-"}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt>Số tài khoản</dt>
                  <dd>{data?.ownerBankAccountNumber || "-"}</dd>
                </div>
                <div className="avr-dl-row avr-dl-row--block">
                  <dt>Chủ tài khoản</dt>
                  <dd>{data?.ownerAccountHolderName || "-"}</dd>
                </div>
              </dl>
            </DetailPanel>
          </div>

          {(businessLicenseImages.length > 0 || landUseDocumentImages.length > 0) && (
            <div className="avr-docs-block">
              <h4 className="avr-docs-landmark">
                <ScrollText size={16} strokeWidth={2} aria-hidden />
                Giấy tờ pháp lý
              </h4>
              <div className="avr-docs-columns" role="list">
                {[businessLicenseInfo, landUseInfo].map((doc) => (
                  <article key={doc.label} className="avr-legal-card" role="listitem">
                    <div className="avr-legal-card-head">
                      <h4 className="avr-legal-card-title">{doc.label}</h4>
                      <div className="avr-doc-badges">
                        <span className="avr-chip avr-chip--doc">{doc.images.length} ảnh đính kèm</span>
                      </div>
                    </div>
                    <div className="avr-legal-meta avr-legal-meta--row">
                      <div className="avr-legal-meta-item">
                        <span className="avr-legal-meta-label">Ngày cấp</span>
                        <strong className="avr-legal-meta-value">{doc.issueDateLabel}</strong>
                      </div>
                      <div className="avr-legal-meta-item">
                        <span className="avr-legal-meta-label">Ngày hết hạn</span>
                        <strong className="avr-legal-meta-value">{doc.expiryDateLabel}</strong>
                      </div>
                    </div>
                    <div className="avr-legal-images">
                      <ReviewDocImageCarousel
                        images={doc.images}
                        title={doc.label}
                        emptyHint="Chưa có ảnh đính kèm"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="avr-actions">
          {isLocked ? (
            <button
              type="button"
              className="avr-action-btn avr-action-btn--approve"
              onClick={() => unlockMutation.mutate()}
              disabled={unlockMutation.isPending}
            >
              <LockOpen size={18} strokeWidth={2.2} aria-hidden />
              <span>{unlockMutation.isPending ? "Đang mở khoá..." : "Mở khoá sân"}</span>
            </button>
          ) : (
            <>
              {!confirmLock ? (
                <button
                  type="button"
                  className="avr-action-btn avr-action-btn--reject"
                  onClick={() => setConfirmLock(true)}
                >
                  <Lock size={18} strokeWidth={2.2} aria-hidden />
                  <span>Khoá sân</span>
                </button>
              ) : (
                <div className="avr-lock-confirm">
                  <span>Xác nhận khoá sân <strong>{venueName}</strong>?</span>
                  <button
                    type="button"
                    className="avr-action-btn avr-action-btn--reject"
                    onClick={() => lockMutation.mutate()}
                    disabled={lockMutation.isPending}
                  >
                    <Lock size={16} strokeWidth={2.2} />
                    <span>{lockMutation.isPending ? "Đang khoá..." : "Xác nhận khoá"}</span>
                  </button>
                  <button
                    type="button"
                    className="avr-action-btn"
                    style={{ background: "#f1f5f9", color: "#475569" }}
                    onClick={() => setConfirmLock(false)}
                  >
                    Huỷ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOwnerVenueDetail;
