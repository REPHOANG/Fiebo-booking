import React from "react";
import { Building2, Calendar, Clock, Hash, MapPin } from "lucide-react";
import ReviewDocImageCarousel from "./ReviewDocImageCarousel";

/**
 * Bước 3: Xem lại toàn bộ thông tin đã khai báo & gửi duyệt
 * (bố cục: banner xanh → hero tên + ảnh → hai ô xám Giới thiệu / Địa chỉ → giấy tờ xem lớn như chi tiết cơ sở)
 */
export default function CreateVenueStepReview({ review, isSubmitting, onBack, onSubmitVenue }) {
  const {
    venueId,
    name,
    description,
    openTime,
    closeTime,
    addressDetail,
    provinceName,
    wardName,
    thumbnailSrc,
    thumbnailCaption,
    docsSummary,
  } = review;

  return (
    <div className="cv-card cv-review-card">
      <header className="cv-review-page-header">
        <h3 className="cv-card-title cv-review-page-title">
          <Building2 size={22} strokeWidth={2} aria-hidden />
          Xác nhận &amp; gửi duyệt
        </h3>
        <div className="cv-review-alert" role="status">
          Kiểm tra lại nội dung trước khi gửi. Sau khi gửi, cơ sở chuyển sang trạng thái{" "}
          <strong>chờ duyệt</strong>.
        </div>
      </header>

      <div className="cv-review-hero">
        <div className="cv-review-hero-text">
          <p className="cv-review-hero-eyebrow">Tên cơ sở</p>
          <h2 className="cv-review-hero-name">{name?.trim() || "—"}</h2>
          <div className="cv-review-hero-chips" role="list">
            <span className="cv-review-chip" role="listitem">
              <Hash size={14} strokeWidth={2.2} aria-hidden />
              Mã #{venueId ?? "—"}
            </span>
            <span className="cv-review-chip cv-review-chip--accent" role="listitem">
              <Clock size={14} strokeWidth={2.2} aria-hidden />
              {openTime || "—"} – {closeTime || "—"}
            </span>
          </div>
        </div>
        <div className="cv-review-hero-media">
          {thumbnailSrc ? (
            <figure className="cv-review-hero-figure">
              <img src={thumbnailSrc} alt="" className="cv-review-hero-img" />
              {thumbnailCaption ? (
                <figcaption className="cv-review-hero-caption">{thumbnailCaption}</figcaption>
              ) : null}
            </figure>
          ) : (
            <div className="cv-review-hero-placeholder" role="img" aria-label="Chưa có ảnh đại diện">
              <Building2 size={40} strokeWidth={1.4} aria-hidden />
              <span>Chưa có ảnh đại diện</span>
            </div>
          )}
        </div>
      </div>

      <div className="cv-review-body">
        <div className="cv-review-columns">
          <section
            className="cv-review-panel cv-review-panel--subtle"
            aria-labelledby="cv-review-desc-heading"
          >
            <h4 id="cv-review-desc-heading" className="cv-review-panel-title">
              Giới thiệu
            </h4>
            <div className="cv-review-panel-body">
              {description ? (
                <p className="cv-review-panel-text">{description}</p>
              ) : (
                <p className="cv-review-muted">Chưa nhập mô tả.</p>
              )}
            </div>
          </section>

          <section
            className="cv-review-panel cv-review-panel--subtle"
            aria-labelledby="cv-review-addr-heading"
          >
            <h4 id="cv-review-addr-heading" className="cv-review-panel-title">
              <MapPin size={16} strokeWidth={2} aria-hidden />
              Địa chỉ
            </h4>
            <div className="cv-review-panel-body">
              <dl className="cv-review-dl">
                <div className="cv-review-dl-row">
                  <dt>Tỉnh / Thành phố</dt>
                  <dd>{provinceName}</dd>
                </div>
                <div className="cv-review-dl-row">
                  <dt>Quận / Huyện</dt>
                  <dd>{wardName}</dd>
                </div>
                <div className="cv-review-dl-row cv-review-dl-row--block">
                  <dt>Địa chỉ chi tiết</dt>
                  <dd>{addressDetail?.trim() || "—"}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <div className="cv-review-docs-block">
          <h4 id="cv-review-docs-heading" className="cv-review-docs-landmark">
            <Calendar size={16} strokeWidth={2} aria-hidden />
            Giấy tờ pháp lý
          </h4>
          {docsSummary?.length ? (
            <div className="cv-review-docs-columns" role="list" aria-label="Danh sách giấy tờ">
              {docsSummary.map((d, i) => {
                const hasServer = d.existingImageUrls.length > 0;
                const titleId = `cv-review-doc-title-${i}`;
                return (
                  <article
                    key={d.label}
                    className="cv-review-legal-card"
                    role="listitem"
                    aria-labelledby={titleId}
                  >
                    <div className="cv-review-legal-card-head">
                      <h4 id={titleId} className="cv-review-legal-card-title">
                        {d.label}
                      </h4>
                      <div className="cv-review-doc-badges">
                        {hasServer ? (
                          <span className="cv-review-chip cv-review-chip--doc">
                            {d.existingImageUrls.length} ảnh đã lưu
                          </span>
                        ) : null}
                        {d.newFileCount > 0 ? (
                          <span className="cv-review-chip cv-review-chip--doc cv-review-chip--pending">
                            {d.newFileCount} ảnh mới (sẽ tải khi gửi)
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="cv-review-legal-meta cv-review-legal-meta--row">
                      <div className="cv-review-legal-meta-item">
                        <span className="cv-review-legal-meta-label">Ngày cấp</span>
                        <strong className="cv-review-legal-meta-value">{d.issueDateLabel}</strong>
                      </div>
                      <div className="cv-review-legal-meta-item">
                        <span className="cv-review-legal-meta-label">Ngày hết hạn</span>
                        <strong className="cv-review-legal-meta-value">{d.expiryDateLabel}</strong>
                      </div>
                    </div>
                    <div className="cv-review-legal-images">
                      <ReviewDocImageCarousel
                        images={d.existingImageUrls}
                        title={d.label}
                        emptyHint={
                          d.newFileCount > 0
                            ? "Ảnh mới sẽ hiển thị sau khi tải lên"
                            : "Chưa có ảnh đính kèm"
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="cv-review-legal-card" aria-labelledby="cv-review-docs-heading">
              <p className="cv-review-muted">Chưa có dữ liệu giấy tờ.</p>
            </div>
          )}
        </div>
      </div>

      <div className="cv-submit-section cv-review-actions">
        <button type="button" className="cv-cancel-btn" onClick={onBack} disabled={isSubmitting}>
          Quay lại
        </button>
        <button type="button" className="cv-submit-btn" onClick={onSubmitVenue} disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi..." : "Gửi duyệt"}
        </button>
      </div>
    </div>
  );
}
