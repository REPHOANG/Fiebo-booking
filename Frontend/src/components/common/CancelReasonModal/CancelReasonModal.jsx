import React, { useEffect } from "react";
import "./CancelReasonModal.css";

const CancelReasonModal = ({
  open,
  title,
  description,
  reasons = [],
  selectedReason,
  onSelectReason,
  allowCustomReason = false,
  customOptionLabel = "Khác",
  customReason = "",
  onCustomReasonChange,
  errorMessage = "",
  onClose,
  onConfirm,
  isSubmitting = false,
  cancelText = "Hủy",
  confirmText = "Xác nhận",
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  const isCustomSelected = allowCustomReason && selectedReason === customOptionLabel;

  return (
    <div className="crm-backdrop" role="presentation" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="crm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="crm-title" className="crm-title">
          {title}
        </h3>
        {description ? <p className="crm-desc">{description}</p> : null}

        <fieldset className="crm-reasons">
          <legend className="crm-sr-only">Lý do hủy</legend>
          {reasons.map((reason) => (
            <label key={reason} className="crm-reason-row">
              <input
                type="radio"
                name="cancelReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={() => onSelectReason?.(reason)}
                disabled={isSubmitting}
              />
              <span>{reason}</span>
            </label>
          ))}
        </fieldset>

        {isCustomSelected && (
          <label className="crm-custom-wrap">
            Lý do khác
            <textarea
              rows={3}
              value={customReason}
              onChange={(event) => onCustomReasonChange?.(event.target.value)}
              placeholder="Nhập lý do hủy"
              disabled={isSubmitting}
            />
          </label>
        )}

        {errorMessage ? (
          <p className="crm-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="crm-actions">
          <button
            type="button"
            className="crm-btn crm-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang xử lý..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelReasonModal;
