import React from "react";
import { LayoutList, Plus, X } from "lucide-react";
import { DocImagePreviewItem } from "./DocImagePreviewItem";

/**
 * Bước 2: Giấy tờ + ảnh
 */
export default function CreateVenueStepDocuments({
  venueId,
  createdVenue,
  docs,
  setDocs,
  docInputRefs,
  isSubmitting,
  onBack,
  onSaveAndNext,
}) {
  return (
    <div className="cv-card">
      <h3 className="cv-card-title">
        <LayoutList size={20} /> Giấy tờ (Documents + Images)
      </h3>
      {!venueId ? (
        <p className="cv-error-text">Chưa có venueId. Vui lòng quay lại bước 1.</p>
      ) : (
        <>
          <div className="cv-wizard-hint">
            Venue #{venueId} · Trạng thái: <strong>{createdVenue?.status ?? "DRAFT"}</strong>
          </div>
          <div className="cv-docs">
            {docs.map((d, di) => {
              const existing = d.existingImageUrls ?? [];
              const files = d.files ?? [];
              const total = existing.length + files.length;
              const canAddMore = total < 5;

              return (
                <div key={d.apiPrefix} className="cv-doc-card">
                  <div className="cv-doc-head">
                    <strong>{d.label}</strong>
                  </div>
                  <div className="cv-form-grid">
                    <div className="cv-form-group">
                      <label>
                        Ngày cấp <span className="cv-required">*</span>
                      </label>
                      <input
                        type="date"
                        value={d.issueDate}
                        onChange={(e) =>
                          setDocs((p) => p.map((x, i) => (i === di ? { ...x, issueDate: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="cv-form-group">
                      <label>
                        Ngày hết hạn <span className="cv-required">*</span>
                      </label>
                      <input
                        type="date"
                        value={d.expiryDate}
                        min={d.issueDate || undefined}
                        onChange={(e) =>
                          setDocs((p) => p.map((x, i) => (i === di ? { ...x, expiryDate: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="cv-form-group cv-full-width">
                      <span className="cv-doc-gallery-label">
                        Ảnh giấy tờ <span className="cv-required">*</span>
                        <span className="cv-doc-gallery-sublabel">
                          Tối đa 5 ảnh · bấm ô &quot;Thêm ảnh&quot; để chọn file · bấm X chỉ sửa trên form (gửi lên máy chủ
                          khi bấm Lưu &amp; Tiếp tục)
                        </span>
                      </span>
                      <ul className="cv-doc-gallery" aria-label={`Ảnh ${d.label}`}>
                        {existing.map((url, ui) => (
                          <li key={`srv-${url}-${ui}`} className="cv-doc-gallery-item">
                            <div className="cv-doc-gallery-tile cv-doc-gallery-tile--server">
                              <img src={url} alt="" />
                              <span className="cv-doc-gallery-badge">Đã lưu</span>
                              <button
                                type="button"
                                className="cv-doc-gallery-remove"
                                aria-label="Gỡ ảnh khỏi danh sách"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDocs((p) =>
                                    p.map((x, i) =>
                                      i === di
                                        ? {
                                            ...x,
                                            existingImageUrls: (x.existingImageUrls ?? []).filter((u) => u !== url),
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          </li>
                        ))}
                        {files.map((f, fi) => (
                          <DocImagePreviewItem
                            key={`${f.name}-${fi}`}
                            file={f}
                            onRemove={() => {
                              setDocs((p) =>
                                p.map((x, i) =>
                                  i === di ? { ...x, files: x.files.filter((_, j) => j !== fi) } : x,
                                ),
                              );
                              const nextCount =
                                existing.length + files.filter((_, j) => j !== fi).length;
                              if (nextCount === 0) {
                                const refEl = docInputRefs.current[d.apiPrefix];
                                if (refEl) refEl.value = "";
                              }
                            }}
                          />
                        ))}
                        {canAddMore ? (
                          <li className="cv-doc-gallery-item cv-doc-gallery-item--add">
                            <label className="cv-doc-gallery-add">
                              <input
                                ref={(el) => {
                                  docInputRefs.current[d.apiPrefix] = el;
                                }}
                                type="file"
                                accept="image/*"
                                multiple
                                className="cv-doc-file-input-sr-only"
                                onChange={(e) => {
                                  const picked = Array.from(e.target.files || []).filter(Boolean);
                                  setDocs((p) =>
                                    p.map((x, i) => {
                                      if (i !== di) return x;
                                      const ex = x.existingImageUrls?.length ?? 0;
                                      const cur = x.files?.length ?? 0;
                                      const room = Math.max(0, 5 - ex - cur);
                                      const take = picked.slice(0, room);
                                      return { ...x, files: [...(x.files || []), ...take] };
                                    }),
                                  );
                                  e.target.value = "";
                                }}
                              />
                              <Plus size={26} strokeWidth={2.2} aria-hidden />
                              <span className="cv-doc-gallery-add-text">Thêm ảnh</span>
                            </label>
                          </li>
                        ) : null}
                      </ul>
                      {total === 0 ? (
                        <p className="cv-wizard-hint cv-doc-gallery-hint">Chưa có ảnh — bấm ô &quot;Thêm ảnh&quot; để chọn file.</p>
                      ) : null}
                      {existing.length > 0 || files.length > 0 ? (
                        <p className="cv-wizard-hint cv-doc-gallery-hint">
                          Không gọi API khi bấm X — chỉ khi bấm <strong>Lưu &amp; Tiếp tục</strong> mới gửi ảnh mới lên
                          máy chủ (hoặc sang bước xác nhận nếu đã đủ ảnh). Tải mới lần đầu cần chọn file cho{" "}
                          <strong>cả hai</strong> loại giấy trong cùng một lần.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cv-submit-section">
            <button type="button" className="cv-cancel-btn" onClick={onBack} disabled={isSubmitting}>
              Quay lại
            </button>
            <button type="button" className="cv-submit-btn" onClick={onSaveAndNext} disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu & Tiếp tục"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
