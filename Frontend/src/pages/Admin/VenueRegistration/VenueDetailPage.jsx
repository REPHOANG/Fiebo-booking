import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  ADMIN_PENDING_VENUES_QUERY_KEY,
  approveVenue,
  getVenueDetail,
  rejectVenue,
} from "../../../services/adminService";
import ReviewDocImageCarousel from "../../Owner/CreateVenueSteps/ReviewDocImageCarousel";
import { toast } from "react-toastify";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import "../../Owner/Venue/CreateVenue.css";
import "./VenueDetailPage.css";

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

export const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openReject, setOpenReject] = useState(false);
  const [reason, setReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: () => approveVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_VENUES_QUERY_KEY });
      toast.success("Duyệt cơ sở thành công");
      navigate("/admin/venue-registrations");
    },
    onError: () => {
      toast.error("Duyệt cơ sở thất bại");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectVenue({ id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_VENUES_QUERY_KEY });
      toast.success("Từ chối cơ sở thành công");
      navigate("/admin/venue-registrations");
    },
    onError: () => {
      toast.error("Từ chối cơ sở thất bại");
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: [...ADMIN_PENDING_VENUES_QUERY_KEY, "detail", id],
    queryFn: () => getVenueDetail(id),
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  const businessLicenseImages = data?.businessLicense?.images ?? [];
  const landUseDocumentImages = data?.landUseDocument?.images ?? [];
  const venueName = data?.venueName || "Cơ sở chưa đặt tên";
  const address = data?.address || "Chưa có địa chỉ";
  const openTime = formatTimeValue(data?.openTime);
  const closeTime = formatTimeValue(data?.closeTime);
  const businessLicenseInfo = {
    label: "Giấy phép kinh doanh",
    issueDateLabel: formatDate(data?.businessLicense?.issueDate),
    expiryDateLabel: formatDate(data?.businessLicense?.expiryDate),
    images: businessLicenseImages,
  };
  console.log("thumbnail:", data?.thumbnailUrl);

  return (
    <div className="avr-page">
      <div className="avr-card">
        <header className="avr-page-header">
          <div className="avr-page-header__top">
            <h3 className="avr-page-title">
              <Building2 size={22} strokeWidth={2} aria-hidden />
              Xem lại hồ sơ đăng ký sân
            </h3>
            <button
              type="button"
              className="avr-back-btn"
              onClick={() => navigate("/admin/venue-registrations")}
            >
              <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
              Quay lại danh sách
            </button>
          </div>
        </header>

        <div className="avr-hero">
          <div className="avr-hero-text">
            <p className="avr-hero-eyebrow">Tên cơ sở</p>
            <h2 className="avr-hero-name">{venueName}</h2>
            <div className="avr-hero-chips" role="list">
              <span className="avr-chip" role="listitem">
                <ScrollText size={14} strokeWidth={2.2} aria-hidden />
                Mã hồ sơ #{data?.venueId ?? id}
              </span>
              <span className="avr-chip avr-chip--accent" role="listitem">
                <Clock3 size={14} strokeWidth={2.2} aria-hidden />
                {openTime} - {closeTime}
              </span>
            </div>
          </div>

          <div className="avr-hero-media">
            <div className="avr-hero-placeholder" role="img" aria-label="Xem trước hồ sơ sân">
              <img style={{
                width:"100%",
                height:"100%"

              }} src={data?.thumbnailUrl} alt="" />
            </div>
          </div>
        </div>

        <div className="avr-body">
          <div className="avr-columns">
            <DetailPanel title="Giới thiệu" icon={Building2}>
              {data?.description ? (
                <p className="avr-panel-text">{data.description}</p>
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
            </DetailPanel>
          </div>

          <div className="avr-columns avr-columns--secondary">
            <DetailPanel title="Chủ sở hữu" icon={UserRound}>
              <dl className="avr-dl avr-dl--compact">
                <div className="avr-dl-row">
                  <dt>
                    <Mail size={14} strokeWidth={2} aria-hidden /> Email
                  </dt>
                  <dd>{data?.ownerEmail || "-"}</dd>
                </div>
                <div className="avr-dl-row">
                  <dt>
                    <Phone size={14} strokeWidth={2} aria-hidden /> Số điện thoại
                  </dt>
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
                  <dt>
                    <Landmark size={14} strokeWidth={2} aria-hidden /> Ngân hàng
                  </dt>
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
                      images={doc.images}
                      title={doc.label}
                      emptyHint="Chưa có ảnh đính kèm"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="avr-actions">
          <button
            type="button"
            className="avr-action-btn avr-action-btn--approve"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            <CheckCircle2 size={18} strokeWidth={2.2} aria-hidden />
            <span>{approveMutation.isPending ? "Đang duyệt..." : "Duyệt"}</span>
          </button>

          <button
            type="button"
            className="avr-action-btn avr-action-btn--reject"
            onClick={() => setOpenReject(true)}
            disabled={rejectMutation.isPending || approveMutation.isPending}
          >
            <XCircle size={18} strokeWidth={2.2} aria-hidden />
            <span>Từ chối</span>
          </button>
        </div>
      </div>

      <Dialog open={openReject} onClose={() => setOpenReject(false)}>
        <DialogTitle>Từ chối hồ sơ đăng ký sân</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lý do từ chối"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReject(false)}>Huỷ</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => rejectMutation.mutate()}
            disabled={!reason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? "Đang gửi..." : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};