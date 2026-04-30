import React, { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import "./BookingTypeModal.css";
import { lockBodyScroll, unlockBodyScroll } from "../../../utils/bodyScrollLock";

const BookingTypeModal = ({ open, onClose, venueId, onSelectRegular, onSelectEvent }) => {
  const navigate = useNavigate();

  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return undefined;

    lockBodyScroll({ reserveScrollbarGap: true });

    // focus panel to prevent browser auto-scroll to focused elements
    try {
      if (panelRef.current && panelRef.current.focus) panelRef.current.focus({ preventScroll: true });
    } catch (e) {}

    return () => {
      unlockBodyScroll();
    };
  }, [open]);

  if (!open) return null;

  const handleRegular = () => {
    onClose && onClose();
    setTimeout(() => {
      if (onSelectRegular) onSelectRegular();
      navigate(`/venue/${venueId}/booking/schedule`);
    }, 0);
  };

  const handleEvent = () => {
    onClose && onClose();
    setTimeout(() => {
      if (onSelectEvent) onSelectEvent();
      navigate(`/venue/${venueId}/events`);
    }, 0);
  };

  return createPortal(
    <div
      className="btm-overlay"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose && onClose();
      }}
    >
      <div
        className="btm-panel"
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="btm-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose && onClose();
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 className="btm-title">Chọn hình thức đặt</h3>

        <div className="btm-options">
          <div className="btm-option btm-regular">
            <div className="btm-option-body">
              <strong>Đặt lịch ngày trực quan</strong>
              <p className="btm-desc">
                Đặt lịch ngày khi khách chơi nhiều khung giờ, nhiều sân.
              </p>
            </div>
            <button
              className="btm-go"
              onClick={handleRegular}
              aria-label="Chọn đặt thường"
              type="button"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="btm-option btm-event">
            <div className="btm-option-body">
              <div className="btm-event-row">
                <strong>Đặt lịch sự kiện</strong>
                <span className="btm-new">New</span>
              </div>
              <p className="btm-desc">
                Sự kiện giúp bạn chơi chung với người có cùng niềm đam mê, trình độ.
              </p>
            </div>
            <button
              className="btm-go"
              onClick={handleEvent}
              aria-label="Chọn đặt sự kiện"
              type="button"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BookingTypeModal;
