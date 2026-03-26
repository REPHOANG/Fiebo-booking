import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "./OwnerVenues.css";
import { deactivateOwnerVenue, getOwnerVenues } from "../../services/venueService";

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

const translateVenueStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "Hoạt động";
  if (s === "inactive") return "Đã vô hiệu hóa";
  return status || "—";
};

const OwnerVenues = () => {
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

  const handleDeactivate = async (venueId, name) => {
    const ok = window.confirm(
      `Vô hiệu hóa cơ sở "${name}"? Khách sẽ không đặt sân tại đây nữa.`
    );
    if (!ok) return;
    try {
      await deactivateOwnerVenue(venueId);
      toast.success("Đã vô hiệu hóa cơ sở.");
      await loadVenues();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Không vô hiệu hóa được.");
    }
  };

  return (
    <div className="owner-venues-page">
      <div className="ov-header">
        <div>
          <h1>Danh sách sân của tôi</h1>
          <p>Quản lý các cơ sở và sân bạn đang sở hữu.</p>
        </div>
        <Link to="/owner/create-venue" className="ov-create-btn">
          + Tạo cơ sở mới
        </Link>
      </div>

      {loading ? (
        <div className="ov-empty">
          <p>Đang tải...</p>
        </div>
      ) : venues.length === 0 ? (
        <div className="ov-empty">
          <p>Hiện bạn chưa có cơ sở nào.</p>
          <Link to="/owner/create-venue" className="ov-create-link">
            Bắt đầu tạo cơ sở đầu tiên
          </Link>
        </div>
      ) : (
        <div className="ov-list">
          {venues.map((v) => {
            const id = pick(v, "venueId", "VenueId");
            const name = pick(v, "name", "Name") ?? "—";
            const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
            const province = pick(v, "province", "Province") ?? "";
            const ward = pick(v, "ward", "Ward") ?? "";
            const status = pick(v, "status", "Status");
            const totalFields = pick(v, "totalFields", "TotalFields") ?? 0;
            const statusLower = String(status || "").toLowerCase();
            const canDeactivate = statusLower === "active";

            return (
              <div key={id} className="ov-card">
                <div className="ov-card-main">
                  <div className="ov-thumb-wrap">
                    {thumb ? (
                      <img className="ov-thumb" src={thumb} alt="" />
                    ) : (
                      <div className="ov-thumb ov-thumb--placeholder" aria-hidden />
                    )}
                  </div>
                  <div className="ov-card-body">
                    <div className="ov-card-title-row">
                      <h2 className="ov-card-title">{name}</h2>
                      <span className="ov-status" data-status={statusLower}>
                        {translateVenueStatus(status)}
                      </span>
                    </div>
                    <p className="ov-card-meta">
                      {[ward, province].filter(Boolean).join(", ") || "—"}
                    </p>
                    <p className="ov-card-meta">Số sân: {totalFields}</p>
                    <div className="ov-card-actions">
                      <Link
                        to={`/owner/venues/${id}`}
                        className="ov-btn ov-btn--secondary"
                      >
                        Xem chi tiết
                      </Link>
                      {canDeactivate ? (
                        <button
                          type="button"
                          className="ov-btn ov-btn--danger"
                          onClick={() => handleDeactivate(id, name)}
                        >
                          Vô hiệu hóa
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OwnerVenues;
