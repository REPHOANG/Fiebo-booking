import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Building2,
  Ban,
  CheckCircle,
  CircleAlert,
  CreditCard,
  Hash,
  Landmark,
  Layers,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  UserRound,
} from "lucide-react";
import { approveVenue, getAdminVenueById, rejectVenue, toggleLockVenue } from "../../../services/adminService";
import ReviewDocImageCarousel from "../../Owner/CreateVenueSteps/ReviewDocImageCarousel";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import Swal from "sweetalert2";
import "../VenueRegistration/VenueDetailPage.css";

const venueStatusStyle = {
  Open: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Active: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Inactive: { label: "Không hoạt động", bg: "#fef9c3", color: "#854d0e" },
  Locked: { label: "Đã khoá", bg: "#fee2e2", color: "#991b1b" },
  Pending: { label: "Chờ duyệt", bg: "#fef9c3", color: "#854d0e" },
  Rejected: { label: "Bị từ chối", bg: "#fef3f2", color: "#b42318" },
};

const formatDate = (value) => {
  if (!value) return "-";
  return dayjs(value).format("DD/MM/YYYY");
};

const formatTime = (value) => {
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

export const AdminOwnerVenueDetail = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const queryClient = useQueryClient();
  const stateVenue = state?.venue ?? null;
  const owner = state?.owner ?? null;

  const [currentStatus, setCurrentStatus] = useState(stateVenue?.status ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["adminVenueDetail", venueId],
    queryFn: () => getAdminVenueById(venueId),
    staleTime: 2 * 60 * 1000,
  });

  // Sync status from API data if available
  useEffect(() => {
    if (data?.status) setCurrentStatus(data.status);
  }, [data?.status]);

  const { mutate: toggleLock, isPending } = useMutation({
    mutationFn: () =>
      toggleLockVenue({
        id: venueId,
        isLocked: currentStatus !== "Locked",
      }),
    onSuccess: () => {
      const nextStatus = currentStatus === "Locked" ? "Inactive" : "Locked";
      setCurrentStatus(nextStatus);
      toast.success(
        nextStatus === "Locked" ? "Đã khoá cơ sở thành công" : "Đã mở khoá cơ sở thành công"
      );
      queryClient.invalidateQueries({ queryKey: ["adminVenueDetail", venueId] });
      queryClient.invalidateQueries({ queryKey: ["adminOwnerDetail", state?.owner.id] });
    },
    onError: () => {
      toast.error("Thao tác thất bại. Vui lòng thử lại.");
    },
  });
 
  const { mutate: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: () => approveVenue(venueId),
    onSuccess: () => {
      setCurrentStatus("Active");
      toast.success("Đã duyệt cơ sở thành công");
      queryClient.invalidateQueries({ queryKey: ["adminVenueDetail", venueId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? "Duyệt cơ sở thất bại");
    },
  });
 
  const { mutate: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: (reason) => rejectVenue({ id: venueId, reason }),
    onSuccess: () => {
      setCurrentStatus("Rejected");
      toast.success(" Đã từ chối cơ sở thành công");
      queryClient.invalidateQueries({ queryKey: ["adminVenueDetail", venueId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? "Từ chối cơ sở thất bại");
    },
  });
 
  const onRejectClick = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Từ chối cơ sở?",
      input: "textarea",
      inputLabel: "Lý do từ chối",
      inputPlaceholder: "Nhập lý do từ chối...",
      inputAttributes: {
        "aria-label": "Lý do từ chối",
      },
      showCancelButton: true,
      confirmButtonText: "Từ chối",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
      inputValidator: (value) => {
        if (!value) {
          return "Bạn phải nhập lý do từ chối!";
        }
      },
    });
 
    if (isConfirmed && reason) {
      handleReject(reason);
    }
  };

  if (isLoading) return <LoadingPage />;

  // Fallback to state data if API returned nothing useful
  const venueName = data?.venueName || stateVenue?.venueName || stateVenue?.name || "Chưa đặt tên";
  const address = data?.address || [stateVenue?.addressDetail, stateVenue?.ward, stateVenue?.province].filter(Boolean).join(", ") || "Chưa có địa chỉ";
  const description = data?.description ?? "";
  const openTime = formatTime(data?.openTime);
  const closeTime = formatTime(data?.closeTime);
  const fieldCount = stateVenue?.numberOfFields ?? stateVenue?.fieldCount ?? 0;
  const isLocked = currentStatus === "Locked";
  const isPendingStatus = currentStatus === "Pending";
  const vSt = venueStatusStyle[currentStatus] ?? { label: currentStatus || "Không rõ", bg: "#f1f5f9", color: "#475569" };

  const ownerName = data?.ownerName || owner?.name || "-";
  const ownerEmail = data?.ownerEmail || owner?.email || "-";
  const ownerPhone = data?.ownerPhone || owner?.phone || "-";

  const businessLicenseImages = data?.businessLicense?.images ?? [];
  const businessLicenseInfo = {
    label: "Giấy phép kinh doanh",
    issueDateLabel: formatDate(data?.businessLicense?.issueDate),
    expiryDateLabel: formatDate(data?.businessLicense?.expiryDate),
    images: businessLicenseImages,
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
              onClick={() => navigate(`/admin/owners/${owner.Id}`)}
            >
              <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
              Quay lại hồ sơ chủ sân
            </button>
          </div>
        </header>

        {/* Hero */}
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
                <Hash size={13} strokeWidth={2.2} />
                Mã sân #{venueId}
              </span>
              {(openTime !== "-" || closeTime !== "-") && (
                <span className="avr-chip avr-chip--accent" role="listitem">
                  {openTime} - {closeTime}
                </span>
              )}
            </div>
          </div>

          <div className="avr-hero-media">
            <div className="avr-hero-placeholder" role="img" aria-label="Cơ sở">
              <img style={{
                width:"100%",
                height:"100%"
              }} src={data?.thumbnailUrl} alt="" />
            </div>
          </div>
        </div>

        {/* Info panels */}
        <div className="avr-body">
          <div className="avr-columns">
            <DetailPanel title="Giới thiệu" icon={Building2}>
              {description ? (
                <p className="avr-panel-text">{description}</p>
              ) : (
                <p className="avr-muted">Chủ sân chưa nhập mô tả cho cơ sở này.</p>
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
              {data?.latitude && data?.longitude && (
                <div className="avr-map-mini">
                  <iframe
                    title="Vị trí cơ sở"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude - 0.005}%2C${data.latitude - 0.004}%2C${data.longitude + 0.005}%2C${data.latitude + 0.004}&layer=mapnik&marker=${data.latitude}%2C${data.longitude}`}
                    className="avr-map-iframe"
                    loading="lazy"
                  />
                  <a
                    className="avr-map-link"
                    href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin size={12} /> Xem trên Google Maps
                  </a>
                </div>
              )}
            </DetailPanel>
          </div>

          <div className="avr-columns avr-columns--secondary">
            <DetailPanel title="Chủ sở hữu" icon={UserRound}>
              <dl className="avr-dl avr-dl--compact">
                <div className="avr-dl-row">
                  <dt><Mail size={14} strokeWidth={2} aria-hidden /> Email</dt>
                  <dd>{ownerEmail}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt><Phone size={14} strokeWidth={2} aria-hidden /> Số điện thoại</dt>
                  <dd>{ownerPhone}</dd>
                </div>
                <div className="avr-dl-row avr-dl-row--block">
                  <dt>Họ tên</dt>
                  <dd>{ownerName}</dd>
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

          <div className="avr-columns avr-columns--secondary">
            <DetailPanel title="Thông tin cơ sở" icon={Layers}>
              <dl className="avr-dl avr-dl--compact">
                <div className="avr-dl-row">
                  <dt><ScrollText size={14} strokeWidth={2} aria-hidden /> Mã sân</dt>
                  <dd>#{venueId}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt>Số sân con</dt>
                  <dd>{fieldCount} sân</dd>
                </div>
                <div className="avr-dl-row">
                  <dt>Trạng thái</dt>
                  <dd>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: vSt.bg,
                        color: vSt.color,
                      }}
                    >
                      {vSt.label}
                    </span>
                  </dd>
                </div>
              </dl>
            </DetailPanel>
          </div>

          {/* Documents */}
          <div className="avr-docs-block">
            <h4 className="avr-docs-landmark">
              <ScrollText size={16} strokeWidth={2} aria-hidden />
              Giấy tờ pháp lý
            </h4>
            <div className="avr-docs-columns" role="list" aria-label="Danh sách giấy tờ pháp lý">
              {[businessLicenseInfo].map((doc) => (
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
                      images={doc.images.map(img => img.imageUrl)}
                      title={doc.label}
                      emptyHint="Chưa có ảnh đính kèm"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="avr-actions">
          {isPendingStatus ? (
            <>
              <button
                type="button"
                className="avr-action-btn avr-action-btn--approve"
                onClick={() => handleApprove()}
                disabled={isApproving || isRejecting}
              >
                <CheckCircle size={18} strokeWidth={2.2} aria-hidden />
                <span>{isApproving ? "Đang xử lý..." : "Duyệt cơ sở"}</span>
              </button>
              <button
                type="button"
                className="avr-action-btn avr-action-btn--reject"
                onClick={onRejectClick}
                disabled={isApproving || isRejecting}
              >
                <Ban size={18} strokeWidth={2.2} aria-hidden />
                <span>{isRejecting ? "Đang xử lý..." : "Từ chối"}</span>
              </button>
            </>
          ) : isLocked ? (
            <button
              type="button"
              className="avr-action-btn avr-action-btn--approve"
              onClick={() => toggleLock()}
              disabled={isPending}
            >
              <LockOpen size={18} strokeWidth={2.2} aria-hidden />
              <span>{isPending ? "Đang xử lý..." : "Mở khoá sân"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="avr-action-btn avr-action-btn--reject"
              onClick={() => toggleLock()}
              disabled={isPending}
            >
              <Lock size={18} strokeWidth={2.2} aria-hidden />
              <span>{isPending ? "Đang xử lý..." : "Khoá sân"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOwnerVenueDetail;