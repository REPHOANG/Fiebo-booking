import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getEventOwner, updateEventOwner } from "../../../services/eventService";
import "./OwnerEventDetail.css";

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
  if (s === "pending") return "Đang chờ";
  if (s === "scheduled") return "Đã lên lịch";
  if (s === "active") return "Đang diễn ra";
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled" || s === "canceled") return "Đã hủy";
  if (s === "draft") return "Bản nháp";
  return status || "—";
};

const translateParticipantStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Chờ";
  if (s === "pendingpayment" || s === "pending_payment") return "Chờ thanh toán";
  if (s === "confirmed" || s === "paid") return "Đã xác nhận";
  if (s === "cancelled" || s === "canceled") return "Đã hủy";
  if (s === "used") return "Đã sử dụng";
  if (s === "refunded") return "Đã hoàn tiền";
  return status || "—";
};

const OwnerEventDetail = () => {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ description: "", minPlayer: 0, maxPlayer: 0, pricePerPerson: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const data = await getEventOwner(id);
        if (mounted) {
          setDetail(data);
          setEditForm({
            description: data?.description ?? "",
            minPlayer: data?.minPlayer ?? 0,
            maxPlayer: data?.maxPlayer ?? 0,
            pricePerPerson: data?.pricePerPerson ?? 0,
          });
        }
      } catch (e) {
        if (mounted) {
          setDetail(null);
          setError(e?.response?.data?.message || e?.message || "Không tải được chi tiết sự kiện.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => { mounted = false; };
  }, [id]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!id || !detail?.isEditable) return;
    setSaving(true);
    setError("");
    try {
      await updateEventOwner(id, {
        description: editForm.description.trim() || null,
        minPlayer: Number(editForm.minPlayer) || 0,
        maxPlayer: Number(editForm.maxPlayer) || 0,
        pricePerPerson: Number(editForm.pricePerPerson) || 0,
      });
      setDetail((prev) => (prev ? { ...prev, ...editForm } : null));
      setEditMode(false);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
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

  if (error && !detail) {
    return (
      <div className="owner-home oed-page">
        <div className="owner-home-header">
          <Link to="/owner/events" className="oed-back">← Danh sách sự kiện</Link>
        </div>
        <div className="owner-home-content">
          <div className="oed-error">{error}</div>
        </div>
      </div>
    );
  }

  const d = detail || {};
  const slots = d.slots ?? [];
  const participants = d.participants ?? [];

  return (
    <div className="owner-home oed-page">
      <div className="owner-home-header">
        <h1>Chi tiết sự kiện #{d.id}</h1>
        <Link to="/owner/events" className="oh-create-btn">Danh sách</Link>
      </div>

      <div className="owner-home-content">
        {error && <div className="oed-error" role="alert">{error}</div>}

        <div className="oed-card">
          <div className="oed-meta">
            <span className="oed-badge" data-status={(d.status || "").toLowerCase()}>
              {translateStatus(d.status)}
            </span>
            <span>Ngày: {formatDate(d.eventDate)}</span>
            {d.isEditable && <span className="oed-editable">Có thể sửa</span>}
          </div>

          {!editMode ? (
            <>
              {d.description && <p className="oed-desc">{d.description}</p>}
              <ul className="oed-info">
                <li>Số người tối thiểu: <strong>{d.minPlayer}</strong></li>
                <li>Số người tối đa: <strong>{d.maxPlayer}</strong></li>
                <li>Phí tham gia: <strong>{formatPrice(d.pricePerPerson)}</strong></li>
              </ul>
              {d.isEditable && (
                <button type="button" className="oed-btn secondary" onClick={() => setEditMode(true)}>
                  Sửa thông tin
                </button>
              )}
            </>
          ) : (
            <form className="oed-edit-form" onSubmit={handleSaveEdit}>
              <label>
                Mô tả
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </label>
              <div className="oed-edit-row">
                <label>
                  Số người tối thiểu
                  <input
                    type="number"
                    min={1}
                    value={editForm.minPlayer}
                    onChange={(e) => setEditForm((f) => ({ ...f, minPlayer: e.target.value }))}
                  />
                </label>
                <label>
                  Số người tối đa
                  <input
                    type="number"
                    min={1}
                    value={editForm.maxPlayer}
                    onChange={(e) => setEditForm((f) => ({ ...f, maxPlayer: e.target.value }))}
                  />
                </label>
              </div>
              <label>
                Phí tham gia (VNĐ)
                <input
                  type="number"
                  min={0}
                  value={editForm.pricePerPerson}
                  onChange={(e) => setEditForm((f) => ({ ...f, pricePerPerson: e.target.value }))}
                />
              </label>
              <div className="oed-edit-actions">
                <button type="submit" className="oed-btn primary" disabled={saving}>
                  {saving ? "Đang lưu…" : "Lưu"}
                </button>
                <button type="button" className="oed-btn link" onClick={() => setEditMode(false)}>
                  Huỷ
                </button>
              </div>
            </form>
          )}

          <h4>Khung giờ</h4>
          <ul className="oed-slots">
            {slots.length === 0 ? "—" : slots.map((s, i) => (
              <li key={i}>{s.fieldName ?? "Sân"} — {formatTime(s.startTime)}–{formatTime(s.endTime)}</li>
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
                      <td>{p.joinedAt ? new Date(p.joinedAt).toLocaleString("vi-VN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerEventDetail;
