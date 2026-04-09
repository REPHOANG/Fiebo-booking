import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    watch,
    formState: { errors, isSubmitted },
  } = useForm({
    mode: "onSubmit",
    defaultValues: {
      docs: docs.map((d) => ({
        issueDate: d.issueDate || "",
        expiryDate: d.expiryDate || "",
      })),
    },
  });

  useEffect(() => {
    reset({
      docs: docs.map((d) => ({
        issueDate: d.issueDate || "",
        expiryDate: d.expiryDate || "",
      })),
    });
  }, [docs, reset]);

  const validateImagesBeforeSubmit = () => {
    let hasImageError = false;
    docs.forEach((d, di) => {
      const totalImages = (d.existingImageUrls?.length ?? 0) + (d.files?.length ?? 0);
      if (totalImages === 0) {
        hasImageError = true;
        setError(`docs.${di}.images`, {
          type: "manual",
          message: "Vui lòng thêm ít nhất 1 ảnh giấy tờ.",
        });
      } else {
        clearErrors(`docs.${di}.images`);
      }
    });
    return !hasImageError;
  };

  const handleSaveAndNext = handleSubmit(() => {
    const imagesValid = validateImagesBeforeSubmit();
    if (!imagesValid) return;
    onSaveAndNext();
  });

  return (
    <div className="cv-card">
      <h3 className="cv-card-title">
        <LayoutList size={20} /> Giấy tờ (Documents + Images)
      </h3>
      {!venueId ? (
        <p className="cv-error-text">Chưa có venueId. Vui lòng quay lại bước 1.</p>
      ) : (
        <>
          <fieldset disabled={isSubmitting} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <div className="cv-wizard-hint">
              Venue #{venueId} · Trạng thái: <strong>{createdVenue?.status ?? "DRAFT"}</strong>
            </div>
            <div className="cv-docs">
              {docs.map((d, di) => {
                const existing = d.existingImageUrls ?? [];
                const files = d.files ?? [];
                const total = existing.length + files.length;
                const canAddMore = total < 5;
                const issueDateError = errors?.docs?.[di]?.issueDate?.message;
                const expiryDateError = errors?.docs?.[di]?.expiryDate?.message;
                const imageError = errors?.docs?.[di]?.images?.message;
                const issueDateValue = watch(`docs.${di}.issueDate`);

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
                        <Controller
                          name={`docs.${di}.issueDate`}
                          control={control}
                          rules={{
                            required: "Vui lòng chọn ngày cấp.",
                          }}
                          render={({ field }) => (
                            <input
                              type="date"
                              className={issueDateError ? "cv-input-invalid" : ""}
                              value={field.value || ""}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                field.onChange(nextValue);
                                setValue(`docs.${di}.issueDate`, nextValue, {
                                  shouldDirty: true,
                                  shouldValidate: isSubmitted,
                                });
                                setDocs((p) =>
                                  p.map((x, i) => (i === di ? { ...x, issueDate: nextValue } : x)),
                                );
                              }}
                            />
                          )}
                        />
                        {issueDateError ? <p className="cv-error-text">{issueDateError}</p> : null}
                      </div>
                      <div className="cv-form-group">
                        <label>
                          Ngày hết hạn <span className="cv-required">*</span>
                        </label>
                        <Controller
                          name={`docs.${di}.expiryDate`}
                          control={control}
                          rules={{
                            required: "Vui lòng chọn ngày hết hạn.",
                            validate: (value) => {
                              const issue = watch(`docs.${di}.issueDate`);
                              if (!issue || !value) return true;
                              const issueMs = new Date(issue).getTime();
                              const expiryMs = new Date(value).getTime();
                              if (Number.isNaN(issueMs) || Number.isNaN(expiryMs)) return true;
                              return expiryMs >= issueMs || "Ngày hết hạn phải từ ngày cấp trở đi.";
                            },
                          }}
                          render={({ field }) => (
                            <input
                              type="date"
                              className={expiryDateError ? "cv-input-invalid" : ""}
                              value={field.value || ""}
                              min={issueDateValue || undefined}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                field.onChange(nextValue);
                                setValue(`docs.${di}.expiryDate`, nextValue, {
                                  shouldDirty: true,
                                  shouldValidate: isSubmitted,
                                });
                                setDocs((p) =>
                                  p.map((x, i) => (i === di ? { ...x, expiryDate: nextValue } : x)),
                                );
                              }}
                            />
                          )}
                        />
                        {expiryDateError ? <p className="cv-error-text">{expiryDateError}</p> : null}
                      </div>
                      <div className="cv-form-group cv-full-width">
                        <span className="cv-doc-gallery-label">
                          Ảnh giấy tờ <span className="cv-required">*</span>
                          <span className="cv-doc-gallery-sublabel">
                            Tối đa 5 ảnh · bấm ô &quot;Thêm ảnh&quot; để chọn file · bấm X chỉ sửa trên form (gửi lên
                            máy chủ khi bấm Lưu &amp; Tiếp tục)
                          </span>
                        </span>
                        <ul
                          className={`cv-doc-gallery${imageError ? " cv-doc-gallery-invalid" : ""}`}
                          aria-label={`Ảnh ${d.label}`}
                        >
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
                                              existingImageUrls: (x.existingImageUrls ?? []).filter(
                                                (u) => u !== url,
                                              ),
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
                                const nextCount = existing.length + files.filter((_, j) => j !== fi).length;
                                if (nextCount === 0) {
                                  const refEl = docInputRefs.current[d.apiPrefix];
                                  if (refEl) refEl.value = "";
                                } else {
                                  clearErrors(`docs.${di}.images`);
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
                                    let hasImageAfterPick = false;
                                    setDocs((p) =>
                                      p.map((x, i) => {
                                        if (i !== di) return x;
                                        const ex = x.existingImageUrls?.length ?? 0;
                                        const cur = x.files?.length ?? 0;
                                        const room = Math.max(0, 5 - ex - cur);
                                        const take = picked.slice(0, room);
                                        const nextFiles = [...(x.files || []), ...take];
                                        hasImageAfterPick = ex + nextFiles.length > 0;
                                        return { ...x, files: nextFiles };
                                      }),
                                    );
                                    if (hasImageAfterPick) clearErrors(`docs.${di}.images`);
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
                          <p className="cv-wizard-hint cv-doc-gallery-hint">
                            Chưa có ảnh - bấm ô &quot;Thêm ảnh&quot; để chọn file.
                          </p>
                        ) : null}
                        {existing.length > 0 || files.length > 0 ? (
                          <p className="cv-wizard-hint cv-doc-gallery-hint">
                            Không gọi API khi bấm X - chỉ khi bấm <strong>Lưu &amp; Tiếp tục</strong> mới gửi ảnh mới
                            lên máy chủ (hoặc sang bước xác nhận nếu đã đủ ảnh). Tải mới lần đầu cần chọn file cho{" "}
                            <strong>cả hai</strong> loại giấy trong cùng một lần.
                          </p>
                        ) : null}
                        {imageError ? <p className="cv-error-text">{imageError}</p> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="cv-submit-section">
            <button type="button" className="cv-cancel-btn" onClick={onBack} disabled={isSubmitting}>
              Quay lại
            </button>
            <button type="button" className="cv-submit-btn" onClick={handleSaveAndNext} disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu & Tiếp tục"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
