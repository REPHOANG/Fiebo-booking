import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

/** Ô ảnh trong lưới giấy tờ (file local, có nút xóa) */
export function DocImagePreviewItem({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <li className="cv-doc-gallery-item">
      <div className="cv-doc-gallery-tile">
        {previewUrl ? (
          <img src={previewUrl} alt={file?.name || ""} title={file?.name} />
        ) : (
          <div className="cv-doc-gallery-empty">…</div>
        )}
        <button
          type="button"
          className="cv-doc-gallery-remove"
          aria-label="Xóa ảnh"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove?.();
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </li>
  );
}
