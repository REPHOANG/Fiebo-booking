import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

/**
 * Xem ảnh giấy tờ kiểu OwnerVenueDetail: khung xám lớn, prev/next, đếm, thumbnail viền xanh.
 */
export default function ReviewDocImageCarousel({ images = [], title = "Giấy tờ", emptyHint }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [safeImages.length]);

  if (safeImages.length === 0) {
    return (
      <div
        className="cv-review-legal-stage cv-review-legal-stage--empty"
        role="img"
        aria-label="Chưa có ảnh"
      >
        <FileText size={36} strokeWidth={1.4} aria-hidden />
        <span>{emptyHint || "Chưa có ảnh đính kèm"}</span>
      </div>
    );
  }

  const prev = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIdx((p) => (p - 1 + safeImages.length) % safeImages.length);
  };
  const next = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIdx((p) => (p + 1) % safeImages.length);
  };

  return (
    <div className="cv-review-legal-viewer">
      <div className="cv-review-legal-stage">
        <a
          href={safeImages[idx]}
          target="_blank"
          rel="noopener noreferrer"
          className="cv-review-legal-stage-link"
          title="Mở ảnh kích thước đầy đủ"
        >
          <img src={safeImages[idx]} alt={`${title} ${idx + 1}`} className="cv-review-legal-stage-img" />
        </a>
        {safeImages.length > 1 ? (
          <>
            <button type="button" className="cv-review-legal-nav cv-review-legal-nav--left" onClick={prev} aria-label="Ảnh trước">
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <button type="button" className="cv-review-legal-nav cv-review-legal-nav--right" onClick={next} aria-label="Ảnh kế tiếp">
              <ChevronRight size={20} strokeWidth={2.2} />
            </button>
          </>
        ) : null}
        <span className="cv-review-legal-counter">
          {idx + 1} / {safeImages.length}
        </span>
      </div>
      {safeImages.length > 1 ? (
        <ul className="cv-review-legal-thumbstrip" role="tablist" aria-label="Chọn ảnh xem nhanh">
          {safeImages.map((url, i) => (
            <li key={`${url}-${i}`} role="none">
              <button
                type="button"
                role="tab"
                aria-selected={i === idx}
                className={`cv-review-legal-thumbstrip-btn ${i === idx ? "is-active" : ""}`}
                onClick={() => setIdx(i)}
              >
                <img src={url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
