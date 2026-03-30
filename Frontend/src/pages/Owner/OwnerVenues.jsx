import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "react-toastify";
import "./OwnerVenues.css";
import { deactivateOwnerVenue, getOwnerVenues } from "../../services/venueService";

const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

/** Chuẩn hóa status từ API (chuỗi hoặc enum số backend). */
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

/**
 * - approved: chỉ Active
 * - cancelled: Rejected
 * - pending: Pending, Draft, Inactive, … (mọi thứ còn lại — Pending luôn thuộc “chờ duyệt”)
 */
function bucketVenuesByApproval(list) {
  const approved = [];
  const pending = [];
  const cancelled = [];
  for (const v of list) {
    const s = normalizeVenueStatus(pick(v, "status", "Status"));
    if (s === "active") approved.push(v);
    else if (s === "rejected") cancelled.push(v);
    else pending.push(v);
  }
  return { approved, pending, cancelled };
}

const OwnerVenues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [listTab, setListTab] = useState("approved");

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

  const { approved: approvedVenues, pending: pendingVenues, cancelled: cancelledVenues } = useMemo(
    () => bucketVenuesByApproval(filteredVenues),
    [filteredVenues]
  );

  const activeList =
    listTab === "approved" ? approvedVenues : listTab === "pending" ? pendingVenues : cancelledVenues;

  const activeTabId =
    listTab === "approved" ? "ov-tab-approved" : listTab === "pending" ? "ov-tab-pending" : "ov-tab-cancelled";

  const renderVenueCard = (v) => {
    const id = pick(v, "venueId", "VenueId");
    const name = pick(v, "name", "Name") ?? "—";
    const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
    const province = pick(v, "province", "Province") ?? "";
    const ward = pick(v, "ward", "Ward") ?? "";
    const status = pick(v, "status", "Status");
    const totalFields = pick(v, "totalFields", "TotalFields") ?? 0;
    const statusLower = normalizeVenueStatus(status);
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
              <Link to={`/owner/venues/${id}`} className="ov-btn ov-btn--secondary">
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
  };

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
          <h1>Danh sách cơ sở của tôi</h1>
          <p>Quản lý các cơ sở và sân bạn đang sở hữu.</p>
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
          <Link to="/owner/create-venue" className="ov-create-btn">
            + Tạo cơ sở mới
          </Link>
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
          <p>Hiện bạn chưa có cơ sở nào.</p>
          <Link to="/owner/create-venue" className="ov-create-link">
            Bắt đầu tạo cơ sở đầu tiên
          </Link>
        </div>
      ) : (
        <div className="ov-tab-wrap">
          <div className="ov-tabbar" role="tablist" aria-label="Lọc cơ sở theo trạng thái duyệt">
            <button
              type="button"
              role="tab"
              id="ov-tab-approved"
              aria-selected={listTab === "approved"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "approved" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("approved")}
            >
              <span className="ov-tab-label">
                Cơ sở đã duyệt</span>
              <span className="ov-tab-count">{approvedVenues.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="ov-tab-pending"
              aria-selected={listTab === "pending"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "pending" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("pending")}
            >
              <span className="ov-tab-label">Cơ sở chờ duyệt</span>
              <span className="ov-tab-count">{pendingVenues.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="ov-tab-cancelled"
              aria-selected={listTab === "cancelled"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "cancelled" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("cancelled")}
            >
              <span className="ov-tab-label">Cơ sở bị hủy</span>
              <span className="ov-tab-count">{cancelledVenues.length}</span>
            </button>
          </div>

          <p className="ov-tab-hint" id="ov-tab-hint">
            {listTab === "approved"
              ? "Chỉ hiển thị cơ sở có trạng thái Active (đang hoạt động)."
              : listTab === "pending"
                ? "Gồm cơ sở Pending (đã gửi chờ duyệt), bản nháp Draft, và Inactive."
                : "Cơ sở bị từ chối duyệt (trạng thái Rejected trên hệ thống)."}
          </p>

          <div
            id="ov-tabpanel-venues"
            role="tabpanel"
            aria-labelledby={activeTabId}
            className="ov-tabpanel"
          >
            {filteredVenues.length === 0 ? (
              <div className="ov-section-empty">Không có kết quả phù hợp với từ khóa tìm kiếm.</div>
            ) : activeList.length === 0 ? (
              <div className="ov-section-empty">
                Không có cơ sở nào trong mục này (hoặc không khớp tìm kiếm).
              </div>
            ) : (
              <div className="ov-list">{activeList.map(renderVenueCard)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerVenues;
