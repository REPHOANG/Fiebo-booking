import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getOwnerVenues } from "../../../services/venueService";
import "./OwnerOfflineBooking.css";

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

function normalizeVenueStatus(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const byNum = { 0: "inactive", 1: "active", 2: "pending", 3: "rejected", 4: "draft" };
    return byNum[raw] ?? String(raw).toLowerCase();
  }
  return String(raw).trim().toLowerCase();
}

const translateVenueStatus = (status) => {
  const s = normalizeVenueStatus(status);
  if (s === "active") return "Hoạt động";
  if (s === "inactive") return "Đã vô hiệu hóa";
  if (s === "draft") return "Nháp";
  if (s === "pending") return "Chờ duyệt";
  if (s === "rejected") return "Từ chối";
  return status || "—";
};

const OwnerOfflineBooking = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getOwnerVenues();
      setVenues(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không tải được danh sách cơ sở.");
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const activeVenues = useMemo(
    () =>
      venues.filter((v) => normalizeVenueStatus(pick(v, "status", "Status")) === "active"),
    [venues]
  );

  return (
    <div className="owner-offline-page">
      <div className="oob-header">
        <div>
          <h1>Đặt sân offline</h1>
          <p>Chọn cơ sở để bắt đầu đặt sân offline.</p>
        </div>
        <Link to="/owner/venues" className="oob-secondary-btn">
          Danh sách cơ sở
        </Link>
      </div>

      {loading ? (
        <div className="oob-empty">
          <div className="owner-loading">
            <span className="owner-spinner" />
          </div>
        </div>
      ) : venues.length === 0 ? (
        <div className="oob-empty">
          <p>Bạn chưa có cơ sở nào.</p>
          <Link to="/owner/create-venue" className="oob-primary-btn">
            + Tạo cơ sở mới
          </Link>
        </div>
      ) : activeVenues.length === 0 ? (
        <div className="oob-empty">
          <p>
            Hiện không có cơ sở nào đang hoạt động để đặt offline. Chỉ cơ sở{" "}
            <strong>Active</strong> mới xuất hiện tại đây.
          </p>
          <Link to="/owner/venues" className="oob-primary-btn">
            Xem tất cả cơ sở
          </Link>
        </div>
      ) : (
        <div className="oob-grid">
          {activeVenues.map((v) => {
            const id = pick(v, "venueId", "VenueId", "id");
            if (!id) return null;
            const name = pick(v, "name", "Name") ?? `Cơ sở #${id}`;
            const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
            const province = pick(v, "province", "Province") ?? "";
            const ward = pick(v, "ward", "Ward") ?? "";
            const status = pick(v, "status", "Status");
            const statusLower = normalizeVenueStatus(status);

            return (
              <button
                key={id}
                type="button"
                className="oob-card"
                onClick={() => {
                  navigate(`/owner/venues/${id}/offline-booking`);
                }}
              >
                <div className="oob-thumb-wrap">
                  {thumb ? (
                    <img className="oob-thumb" src={thumb} alt="" />
                  ) : (
                    <div className="oob-thumb oob-thumb--placeholder" aria-hidden />
                  )}
                </div>
                <div className="oob-body">
                  <div className="oob-title-row">
                    <h2 className="oob-title">{name}</h2>
                    <span className="oob-status" data-status={statusLower}>
                      {translateVenueStatus(status)}
                    </span>
                  </div>
                  <p className="oob-meta">{[ward, province].filter(Boolean).join(", ") || "—"}</p>
                  <p className="oob-hint">Bấm để đặt offline</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerOfflineBooking;

