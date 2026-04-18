import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CancelReasonModal from "../../../components/common/CancelReasonModal/CancelReasonModal";
import {
  getOwnerBookingDetail,
  ownerCancelBookingApi,
} from "../../../services/bookingService";
import "./OwnerBookingDetail.css";

const formatPrice = (n) => {
  if (n == null || Number.isNaN(n)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

const formatDate = (d) => {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

const formatTime = (t) => {
  if (!t) return "";
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const translateStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Chờ thanh toán";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy (khách)";
  if (s === "ownercancelled") return "Đã hủy (chủ sân)";
  if (s === "expired") return "Hết hạn";
  return status || "—";
};

const OWNER_CANCEL_REASONS = [
  "Không thể sắp xếp được sân",
  "Sân bảo trì / sửa chữa",
  "Điều kiện thời tiết không tổ chức được",
  "Trùng lịch / đặt nhầm",
  "Sự cố kỹ thuật tại cơ sở",
  "Yêu cầu từ ban quản lý / cơ quan",
  "Khác",
];

const OwnerBookingDetail = ({ bookingsListPath = "/owner/bookings" }) => {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getOwnerBookingDetail(id);
      setDetail(data);
    } catch (e) {
      setDetail(null);
      setError(
        e?.response?.data?.message || e?.message || "Không tải được chi tiết đơn.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="owner-home obd-page">
        <div className="owner-home-content">
          <p className="obd-loading">Đang tải…</p>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="owner-home obd-page">
        <div className="owner-home-header">
          <Link to={bookingsListPath} className="obd-back">← Đơn đặt sân</Link>
        </div>
        <div className="owner-home-content">
          <div className="obd-error">{error}</div>
        </div>
      </div>
    );
  }

  const d = detail || {};
  const items = d.bookedItems ?? d.BookedItems ?? [];
  const bookingId = d.bookingId ?? id;
  const statusKey = String(d.status || "").toLowerCase();
  const canCancel = statusKey === "pending" || statusKey === "booked";

  const openCancelModal = () => {
    if (!canCancel) return;
    setCancelReason("");
    setCustomCancelReason("");
    setCancelReasonError("");
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    if (cancelling) return;
    setCancelModalOpen(false);
    setCancelReason("");
    setCustomCancelReason("");
    setCancelReasonError("");
  };

  const handleConfirmCancel = async () => {
    if (!bookingId || !canCancel) return;
    const reason =
      cancelReason === "Khác"
        ? String(customCancelReason || "").trim()
        : String(cancelReason || "").trim();
    if (!reason) {
      setCancelReasonError(
        cancelReason === "Khác"
          ? "Vui lòng nhập lý do hủy"
          : "Vui lòng chọn lý do hủy",
      );
      return;
    }

    setCancelling(true);
    try {
      await ownerCancelBookingApi(bookingId, reason);
      toast.success("Đã hủy đặt sân thành công");
      setCancelModalOpen(false);
      setCancelReason("");
      setCustomCancelReason("");
      setCancelReasonError("");
      await fetchDetail();
    } catch (e) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Không thể hủy đặt sân",
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="owner-home obd-page">
      <div className="owner-home-header">
        <h1>Đơn đặt sân #{d.bookingId ?? id}</h1>
        <Link to={bookingsListPath} className="oh-create-btn">Danh sách đơn</Link>
      </div>

      <div className="owner-home-content">
        <div className="obd-card">
          <div className="obd-meta">
            <span className="obd-badge" data-status={(d.status || "").toLowerCase()}>
              {translateStatus(d.status)}
            </span>
            <span>Đặt lúc: {d.createdAt ? new Date(d.createdAt).toLocaleString("vi-VN") : "—"}</span>

            {canCancel && (
              <button
                type="button"
                className="obd-cancel-btn"
                onClick={openCancelModal}
                disabled={cancelling}
              >
                Hủy đặt sân
              </button>
            )}
          </div>

          <div className="obd-section">
            <h3>Khách hàng</h3>
            <ul className="obd-info">
              <li>Họ tên: <strong>{d.customerName ?? "—"}</strong></li>
              <li>SĐT: <strong>{d.phoneNumber ?? "—"}</strong></li>
              {d.bookingNote ? <li>Ghi chú: {d.bookingNote}</li> : null}
            </ul>
          </div>

          <div className="obd-section">
            <h3>Chi tiết sân đã đặt</h3>
            {items.length === 0 ? (
              <p className="obd-empty">Không có mục nào.</p>
            ) : (
              <div className="obd-table-wrap">
                <table className="obd-table">
                  <thead>
                    <tr>
                      <th>Sân</th>
                      <th>Ngày</th>
                      <th>Giờ</th>
                      <th>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => (
                      <tr key={i}>
                        <td>{row.fieldName ?? "—"}</td>
                        <td>{formatDate(row.playDate)}</td>
                        <td>{formatTime(row.startTime)} – {formatTime(row.endTime)}</td>
                        <td>{formatPrice(row.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="obd-total">
            <span>Tổng tiền</span>
            <strong>{formatPrice(d.totalPrice)}</strong>
          </div>
        </div>
      </div>

      {cancelModalOpen && (
        <CancelReasonModal
          open={cancelModalOpen}
          title="Hủy đặt sân"
          description="Chọn lý do hủy. Sau khi xác nhận, hệ thống sẽ hoàn tiền 100% cho khách hàng (theo quy định)."
          reasons={OWNER_CANCEL_REASONS}
          selectedReason={cancelReason}
          onSelectReason={(reason) => {
            setCancelReason(reason);
            setCancelReasonError("");
          }}
          allowCustomReason
          customOptionLabel="Khác"
          customReason={customCancelReason}
          onCustomReasonChange={(value) => {
            setCustomCancelReason(value);
            setCancelReasonError("");
          }}
          errorMessage={cancelReasonError}
          isSubmitting={cancelling}
          onClose={closeCancelModal}
          onConfirm={handleConfirmCancel}
          cancelText="Hủy"
          confirmText="Xác nhận"
        />
      )}
    </div>
  );
};

export default OwnerBookingDetail;

