import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "react-toastify";
import { getStaffVenues } from "../../../services/staffService";
import "../../Owner/Venue/OwnerVenues.css";

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

function normalizeVenueStatus(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const byNum = {
      0: "inactive",
      1: "active",
      2: "pending",
      3: "rejected",
      4: "draft",
    };
    return byNum[raw] ?? String(raw).toLowerCase();
  }
  return String(raw).trim().toLowerCase();
}

const translateVenueStatus = (status) => {
  const s = normalizeVenueStatus(status);
  if (s === "active") return "Hoạt động";
  if (s === "inactive") return "Đã vô hiệu hóa";
  if (s === "pending") return "Chờ duyệt";
  if (s === "draft") return "Bản nháp";
  if (s === "rejected") return "Từ chối";
  return status || "—";
};

const StaffVenues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getStaffVenues();
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

  const filteredVenues = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) => {
      const name = String(pick(v, "name", "Name") ?? "").toLowerCase();
      const province = String(pick(v, "province", "Province") ?? "").toLowerCase();
      const ward = String(pick(v, "ward", "Ward") ?? "").toLowerCase();
      return name.includes(q) || province.includes(q) || ward.includes(q);
    });
  }, [venues, searchText]);

  const renderVenueCard = (v) => {
    const id = pick(v, "venueId", "VenueId") ?? pick(v, "id", "Id");
    const name = pick(v, "name", "Name") ?? "—";
    const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
    const province = pick(v, "province", "Province") ?? pick(v, "provinceName", "ProvinceName") ?? "";
    const ward = pick(v, "ward", "Ward") ?? pick(v, "wardName", "WardName") ?? "";
    const status = pick(v, "status", "Status");
    const totalFields = pick(v, "totalFields", "TotalFields") ?? 0;
    const statusLower = normalizeVenueStatus(status);

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
            </div>
            <p className="ov-card-meta">
              {[ward, province].filter(Boolean).join(", ") || "—"}
            </p>
            <p className="ov-card-meta">Số sân: {totalFields}</p>
            <div className="ov-card-badges">
              <span className="ov-status" data-status={statusLower}>
                {translateVenueStatus(status)}
              </span>
            </div>
            <div className="ov-card-actions">
              <Link to={`/staff/venues/${id}`} className="ov-btn ov-btn--secondary">
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="owner-venues-page">
      <div className="ov-header">
        <div>
          <h1>Cơ sở của tôi</h1>
        </div>
        <div className="ov-header-right">
          <label className="ov-search">
            <Search size={14} />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo tên cơ sở, phường, tỉnh..."
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="ov-empty">
          <div className="owner-loading">
            <span className="owner-spinner" />
          </div>
        </div>
      ) : venues.length === 0 ? (
        <div className="ov-empty">
          <p>Hiện bạn chưa được gán cho cơ sở nào.</p>
        </div>
      ) : (
        <div className="ov-list">
          {filteredVenues.length === 0 ? (
            <div className="ov-section-empty">Không có kết quả phù hợp với từ khóa tìm kiếm.</div>
          ) : (
            filteredVenues.map(renderVenueCard)
          )}
        </div>
      )}
    </div>
  );
};

export default StaffVenues;
