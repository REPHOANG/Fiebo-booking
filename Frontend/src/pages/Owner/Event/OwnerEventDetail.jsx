import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CancelReasonModal from "../../../components/common/CancelReasonModal/CancelReasonModal";
import {
  cancelEventOwner,
  getEventOwner,
  updateEventOwner,
} from "../../../services/eventService";
import "./OwnerEventDetail.css";

const editEventSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Vui lòng nhập tên sự kiện")
    .min(3, "Tên sự kiện tối thiểu 3 ký tự")
    .max(100, "Tên sự kiện tối đa 100 ký tự"),
  description: yup.string().optional(),
  minPlayer: yup
    .number()
    .transform((v, o) => (o === "" || o == null ? undefined : Number(o)))
    .typeError("Nhập số hợp lệ")
    .min(1, "Tối thiểu 1")
    .required(),
  maxPlayer: yup
    .number()
    .transform((v, o) => (o === "" || o == null ? undefined : Number(o)))
    .typeError("Nhập số hợp lệ")
    .min(1, "Tối thiểu 1")
    .required()
    .test("max-ge-min", "Số tối đa phải ≥ số tối thiểu", function testMax(max) {
      const min = this.parent.minPlayer;
      if (min == null || max == null) return true;
      return max >= min;
    }),
  pricePerPerson: yup
    .number()
    .transform((v, o) => (o === "" || o == null ? 0 : Number(o)))
    .typeError("Nhập số hợp lệ")
    .min(0, "Không được âm")
    .required(),
});

const formatPrice = (n) => {
  if (n == null || Number.isNaN(n)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n);
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
  if (s === "pending") return "Chưa diễn ra";
  if (s === "ongoing") return "Đang diễn ra";
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled" || s === "canceled") return "Đã hủy";
  return status || "—";
};

const translateParticipantStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Chờ thanh toán";
  if (s === "joined" || s === "paid") return "Đã thanh toán";
  if (s === "cancelled" || s === "canceled") return "Đã hủy";
  if (s === "used") return "Đã sử dụng";
  if (s === "refunded") return "Đã hoàn tiền";
  return status || "—";
};

const CANCEL_REASON_OPTIONS = [
  "Điều kiện thời tiết không phù hợp",
  "Sân không thể hoạt động theo lịch",
  "Điều chỉnh kế hoạch tổ chức",
  "Khác",
];

const OwnerEventDetail = ({
  eventListPath = "/owner/events",
  fetchEventFn = getEventOwner,
  isStaff = false,
}) => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(editEventSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
      minPlayer: 0,
      maxPlayer: 0,
      pricePerPerson: 0,
    },
  });

  const {
    data: detail,
    isLoading: loading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: [isStaff ? "staff-event-detail" : "owner-event-detail", id],
    queryFn: () => fetchEventFn(id),
    enabled: Boolean(id),
    retry: 0,
  });

  useEffect(() => {
    if (!detail) return;
    reset({
      name:
        detail?.name ??
        detail?.eventName ??
        detail?.title ??
        detail?.Name ??
        detail?.EventName ??
        detail?.Title ??
        "",
      description: detail?.description ?? "",
      minPlayer: detail?.minPlayer ?? 0,
      maxPlayer: detail?.maxPlayer ?? 0,
      pricePerPerson: detail?.pricePerPerson ?? 0,
    });
  }, [detail, reset]);

  const updateEventMutation = useMutation({
    mutationFn: (payload) => updateEventOwner(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-event-detail", id] });
      setEditMode(false);
    },
    onError: (err) => {
      setActionError(
        err?.response?.data?.message || err?.message || "Cập nhật thất bại.",
      );
    },
  });

  const onSaveEdit = async (values) => {
    if (!id || !detail?.isEditable || updateEventMutation.isPending) return;

    const payload = {
      name: values.name?.trim() || "",
      description: values.description?.trim() || null,
      minPlayer: Number(values.minPlayer) || 0,
      maxPlayer: Number(values.maxPlayer) || 0,
      pricePerPerson: Number(values.pricePerPerson) || 0,
    };

    setActionError("");
    await updateEventMutation.mutateAsync(payload);
  };

  const cancelEventMutation = useMutation({
    mutationFn: ({ cancelNote }) => cancelEventOwner(id, { cancelNote }),
    onSuccess: async () => {
      await refetchDetail();
      setEditMode(false);
      setShowCancelPopup(false);
      setSelectedCancelReason("");
      setCustomCancelReason("");
      setCancelReasonError("");
    },
    onError: (err) => {
      setActionError(err?.response?.data?.message || err?.message || "Hủy sự kiện thất bại.");
    },
  });

  const openCancelPopup = () => {
    setActionError("");
    setCancelReasonError("");
    setShowCancelPopup(true);
  };

  const closeCancelPopup = () => {
    if (cancelEventMutation.isPending) return;
    setShowCancelPopup(false);
    setSelectedCancelReason("");
    setCustomCancelReason("");
    setCancelReasonError("");
  };

  const confirmCancelEvent = async () => {
    if (!id || cancelEventMutation.isPending) return;

    if (!selectedCancelReason) {
      setCancelReasonError("Vui lòng chọn lý do hủy.");
      return;
    }

    const cancelNote =
      selectedCancelReason === "Khác"
        ? customCancelReason.trim()
        : selectedCancelReason;

    if (!cancelNote) {
      setCancelReasonError("Vui lòng nhập lý do hủy.");
      return;
    }

    setCancelReasonError("");
    setActionError("");
    await cancelEventMutation.mutateAsync({ cancelNote });
  };

  if (loading) {
    return (
      <div className="owner-home oed-page">
        <div className="owner-home-content">
          <p className="oed-loading">Đang tải…</p>
        </div>
      </div>
    );
  }

  if (detailError && !detail) {
    return (
      <div className="owner-home oed-page">
        <div className="owner-home-header">
          <Link to={eventListPath} className="oed-back">
            ← Danh sách sự kiện
          </Link>
        </div>
        <div className="owner-home-content">
          <div className="oed-error">
            {detailError?.response?.data?.message || detailError?.message || "Không tải được chi tiết sự kiện."}
          </div>
        </div>
      </div>
    );
  }

  const d = detail || {};
  const statusLower = String(d.status || "").toLowerCase();
  const showCancelButton = !isStaff && statusLower === "pending";

  const eventName =
    d.name ?? d.eventName ?? d.title ?? d.Name ?? d.EventName ?? d.Title;
  const slots = d.slots ?? [];
  const participants = d.participants ?? [];

  return (
    <div className="owner-home oed-page">
      <div className="owner-home-header" style={{
        marginBottom:"10px"
      }}>
        <h1>Chi tiết sự kiện #{d.id}</h1>
      </div>

      <div className="owner-home-content">
        {actionError && (
          <div className="oed-error" role="alert">
            {actionError}
          </div>
        )}

        <div className="oed-card">
          <div className="oed-meta">
            <div className="oed-meta-left">
              <span
                className="oed-badge"
                data-status={(d.status || "").toLowerCase()}
              >
                {translateStatus(d.status)}
              </span>
              <span>Ngày: {formatDate(d.eventDate)}</span>
            </div>
            <div className="oed-meta-right">
              {!isStaff && (
                <button
                  type="button"
                  className="oed-btn oed-edit-btn"
                  onClick={() => setEditMode(true)}
                  disabled={!d.isEditable || editMode || cancelEventMutation.isPending || updateEventMutation.isPending}
                >
                  Sửa thông tin
                </button>
              )}
              {showCancelButton && (
                <button
                  type="button"
                  className="oed-btn oed-cancel-btn"
                  onClick={openCancelPopup}
                >
                  Huỷ sự kiện
                </button>
              )}
            </div>
          </div>
          {!editMode ? (
            <>
              <p className="oed-desc">
                <strong>Tên sự kiện:</strong> {eventName || "—"}
              </p>
              <p className="oed-desc">
                <strong>Mô tả:</strong> {d.description || "—"}
              </p>
              <ul className="oed-info">
                <li>
                  Số người tối thiểu: <strong>{d.minPlayer}</strong>
                </li>
                <li>
                  Số người tối đa: <strong>{d.maxPlayer}</strong>
                </li>
                <li>
                  Phí tham gia: <strong>{formatPrice(d.pricePerPerson)}</strong>
                </li>
              </ul>
              
            </>
          ) : (
            <form
              className="oed-edit-form"
              onSubmit={handleSubmit(onSaveEdit)}
              noValidate
            >
              <label>
                Tên sự kiện
                <input type="text" maxLength={100} {...register("name")} />
                {errors.name && (
                  <span className="oed-field-error">{errors.name.message}</span>
                )}
              </label>
              <label>
                Mô tả
                <textarea {...register("description")} rows={2} />
              </label>
              <div className="oed-edit-row">
                <label>
                  Số người tối thiểu
                  <input type="number" min={1} {...register("minPlayer")} />
                  {errors.minPlayer && (
                    <span className="oed-field-error">
                      {errors.minPlayer.message}
                    </span>
                  )}
                </label>
                <label>
                  Số người tối đa
                  <input type="number" min={1} {...register("maxPlayer")} />
                  {errors.maxPlayer && (
                    <span className="oed-field-error">
                      {errors.maxPlayer.message}
                    </span>
                  )}
                </label>
              </div>
              <label>
                Phí tham gia (VNĐ)
                <input type="number" min={0} {...register("pricePerPerson")} />
                {errors.pricePerPerson && (
                  <span className="oed-field-error">
                    {errors.pricePerPerson.message}
                  </span>
                )}
              </label>
              <div className="oed-edit-actions">
                <button
                  type="submit"
                  className="oed-btn primary"
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? "Đang lưu…" : "Lưu"}
                </button>
                <button
                  type="button"
                  className="oed-btn link"
                  onClick={() => setEditMode(false)}
                >
                  Huỷ
                </button>
              </div>
            </form>
          )}

          <h4>Khung giờ</h4>
          <ul className="oed-slots">
            {slots.length === 0
              ? "—"
              : slots.map((s, i) => (
                  <li key={i}>
                    {s.fieldName ?? "Sân"} — {formatTime(s.startTime)}–
                    {formatTime(s.endTime)}
                  </li>
                ))}
          </ul>

          <h4>Người tham gia ({participants.length})</h4>
          {participants.length === 0 ? (
            <p className="oed-empty">Chưa có ai đăng ký.</p>
          ) : (
            <div className="oed-table-wrap">
              <table className="oed-table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>SĐT</th>
                    <th>Số vé</th>
                    <th>Trạng thái</th>
                    <th>Thời gian đăng ký</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, i) => (
                    <tr key={i}>
                      <td>{p.fullname ?? p.fullName}</td>
                      <td>{p.phoneNumber ?? p.phone}</td>
                      <td>{p.ticketQuantity ?? 0}</td>
                      <td>{translateParticipantStatus(p.status)}</td>
                      <td>
                        {p.joinedAt
                          ? new Date(p.joinedAt).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <CancelReasonModal
          open={showCancelPopup}
          title="Huỷ sự kiện"
          description="Chọn lý do huỷ sự kiện"
          reasons={CANCEL_REASON_OPTIONS}
          selectedReason={selectedCancelReason}
          onSelectReason={(reason) => {
            setSelectedCancelReason(reason);
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
          isSubmitting={cancelEventMutation.isPending}
          onClose={closeCancelPopup}
          onConfirm={confirmCancelEvent}
          cancelText="Đóng"
          confirmText="Xác nhận huỷ"
        />
      </div>
    </div>
  );
};

export default OwnerEventDetail;
