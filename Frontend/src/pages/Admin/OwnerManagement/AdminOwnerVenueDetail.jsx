import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Hash,
  Layers,
  Lock,
  MapPin,
} from "lucide-react";
import "../VenueRegistration/VenueDetailPage.css";

const venueStatusStyle = {
  Open: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Active: { label: "Đang mở", bg: "#dcfce7", color: "#166534" },
  Locked: { label: "Đã khoá", bg: "#fee2e2", color: "#991b1b" },
  Pending: { label: "Chờ duyệt", bg: "#fef9c3", color: "#854d0e" },
  Rejected: { label: "Bị từ chối", bg: "#fef3f2", color: "#b42318" },
};

export const AdminOwnerVenueDetail = () => {
  const { ownerId, venueId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const venue = state?.venue ?? null;

  if (!venue) {
    return (
      <div className="avr-page">
        <div className="avr-card">
          <p style={{ color: "#991b1b", marginBottom: 12 }}>
            Không tìm thấy thông tin sân. Vui lòng quay lại hồ sơ chủ sân.
          </p>
          <button className="avr-back-btn" onClick={() => navigate(`/admin/owners/${ownerId}`)}>
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const rawStatus = venue.status ?? "";
  const vSt = venueStatusStyle[rawStatus] ?? { label: rawStatus || "Không rõ", bg: "#f1f5f9", color: "#475569" };
  const venueName = venue.venueName ?? venue.name ?? "Chưa đặt tên";
  const addressParts = [venue.addressDetail, venue.ward, venue.province].filter(Boolean);
  const address = addressParts.join(", ") || "Chưa có địa chỉ";
  const fieldCount = venue.numberOfFields ?? venue.fieldCount ?? 0;

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
                Mã sân {venue.id ?? venueId}
              </span>
            </div>
          </div>

          <div className="avr-hero-media">
            <div className="avr-hero-placeholder" role="img" aria-label="Cơ sở">
              <Building2 size={40} strokeWidth={1.4} aria-hidden />
              <span>{venueName}</span>
              <small>{address}</small>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="avr-body">
          <div className="avr-columns">
            <section className="avr-panel avr-panel--subtle">
              <h4 className="avr-panel-title">
                <MapPin size={16} strokeWidth={2} />
                Địa chỉ
              </h4>
              <div className="avr-panel-body">
                <dl className="avr-dl">
                  {venue.addressDetail && (
                    <div className="avr-dl-row avr-dl-row--block">
                      <dt>Địa chỉ chi tiết</dt>
                      <dd>{venue.addressDetail}</dd>
                    </div>
                  )}
                  {venue.ward && (
                    <div className="avr-dl-row">
                      <dt>Phường / Xã</dt>
                      <dd>{venue.ward}</dd>
                    </div>
                  )}
                  {venue.province && (
                    <div className="avr-dl-row">
                      <dt>Tỉnh / Thành phố</dt>
                      <dd>{venue.province}</dd>
                    </div>
                  )}
                  {addressParts.length === 0 && (
                    <p className="avr-muted">Chưa có địa chỉ.</p>
                  )}
                </dl>
              </div>
            </section>

            <section className="avr-panel avr-panel--subtle">
              <h4 className="avr-panel-title">
                <Layers size={16} strokeWidth={2} />
                Thông tin cơ sở
              </h4>
              <div className="avr-panel-body">
                <dl className="avr-dl avr-dl--compact">
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
              </div>
            </section>
          </div>
        </div>

        {/* Actions — lock/unlock requires backend endpoint not yet available */}
        <div className="avr-actions">
          <button
            type="button"
            className="avr-action-btn avr-action-btn--reject"
            disabled
            title="Chức năng khoá sân đang được phát triển"
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            <Lock size={18} strokeWidth={2.2} aria-hidden />
            <span>Khoá sân (chưa khả dụng)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOwnerVenueDetail;