import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CancelReasonModal from "../../../components/common/CancelReasonModal/CancelReasonModal";
import {
  getOwnerBookingDetail,
  ownerCancelBookingApi,
  confirmBookingApi,
  rejectBookingApi,
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
  if (s === "pending") return "Chờ xác nhận";
  if (s === "booked") return "Đã đặt";
  if (s === "completed") return "Hoàn thành";
  if (s === "customercancelled") return "Đã hủy (khách)";
  if (s === "ownercancelled") return "Đã hủy (chủ sân)";
  if (s === "cancelled") return "Đã hủy";
  if (s === "rejected") return "Đã từ chối";
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

const OwnerBookingDetail = ({
  bookingsListPath = "/owner/bookings",
  fetchDetailFn = getOwnerBookingDetail,
  isStaff = false,
}) => {
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
      const data = await fetchDetailFn(id);
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

  const handleReject = async () => {
    if (!bookingId) return;
    const result = await Swal.fire({
      title: "Từ chối đơn đặt sân?",
      text: "Bạn có chắc chắn muốn từ chối đơn này không? Hệ thống sẽ hoàn trả tiền cho khách.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Từ chối",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc3545",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await rejectBookingApi(bookingId, "Chủ sân từ chối đơn đặt sân");
        toast.success("Đã từ chối đơn đặt sân thành công.");
        await fetchDetail();
      } catch (e) {
        toast.error(e?.response?.data?.message || "Không thể từ chối đơn.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      await confirmBookingApi(bookingId);
      toast.success("Đã xác nhận đơn đặt sân.");
      await fetchDetail();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Không thể xác nhận đơn.");
    } finally {
      setLoading(false);
    }
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
          ? "Vui lòng nhập lý do"
          : "Vui lòng chọn lý do",
      );
      return;
    }

    setCancelling(true);
    try {
      await ownerCancelBookingApi(bookingId, reason);
      toast.success("Đã hủy đơn đặt sân thành công");
      setCancelModalOpen(false);
      setCancelReason("");
      setCustomCancelReason("");
      setCancelReasonError("");
      await fetchDetail();
    } catch (e) {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Thao tác thất bại",
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="owner-home obd-page">
      <div className="owner-home-header">
        <h1>Đơn đặt sân #{d.bookingId ?? id}</h1>
      </div>

      <div className="owner-home-content">
        <div className="obd-card">
          <div className="obd-meta">
            <span className="obd-badge" data-status={(d.status || "").toLowerCase()}>
              {translateStatus(d.status)}
            </span>
            <span>Đặt lúc: {d.createdAt ? new Date(d.createdAt).toLocaleString("vi-VN") : "—"}</span>

            <div className="obd-action-group">
              {!isStaff && statusKey === "pending" && (
                <>
                  <button
                    type="button"
                    className="obd-action-btn obd-btn-accept"
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    Xác nhận
                  </button>
                  <button
                    type="button"
                    className="obd-action-btn obd-btn-reject"
                    onClick={handleReject}
                    disabled={loading || cancelling}
                  >
                    Từ chối
                  </button>
                </>
              )}
              {!isStaff && statusKey === "booked" && (
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
          title={statusKey === "pending" ? "Từ chối đơn đặt sân" : "Hủy đơn đặt sân"}
          description={
            statusKey === "pending"
              ? "Chọn lý do từ chối. Hệ thống sẽ hoàn trả tiền cho khách hàng."
              : "Chọn lý do hủy. Hệ thống sẽ hoàn tiền 100% cho khách hàng."
          }
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

