import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, CircleCheck, FilePenLine, Hourglass, Ban } from "lucide-react";
import { toast } from "react-toastify";
import "./OwnerVenues.css";
import { deactivateOwnerVenue, getOwnerVenues } from "../../../services/venueService";

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

function bucketVenuesByApproval(list) {
  const approved = [];
  const draft = [];
  const pending = [];
  const cancelled = [];
  for (const v of list) {
    const s = normalizeVenueStatus(pick(v, "status", "Status"));
    if (s === "active") approved.push(v);
    else if (s === "draft") draft.push(v);
    else if (s === "rejected") cancelled.push(v);
    else pending.push(v);
  }
  return { approved, draft, pending, cancelled };
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

  const {
    approved: approvedVenues,
    draft: draftVenues,
    pending: pendingVenues,
    cancelled: cancelledVenues,
  } = useMemo(() => bucketVenuesByApproval(filteredVenues), [filteredVenues]);

  const activeList =
    listTab === "approved"
      ? approvedVenues
      : listTab === "draft"
        ? draftVenues
        : listTab === "pending"
          ? pendingVenues
          : cancelledVenues;

  const activeTabId =
    listTab === "approved"
      ? "ov-tab-approved"
      : listTab === "draft"
        ? "ov-tab-draft"
        : listTab === "pending"
          ? "ov-tab-pending"
          : "ov-tab-cancelled";

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

  const renderVenueCard = (v) => {
    const id = pick(v, "venueId", "VenueId");
    const name = pick(v, "name", "Name") ?? "—";
    const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
    const province = pick(v, "province", "Province") ?? "";
    const ward = pick(v, "ward", "Ward") ?? "";
    const status = pick(v, "status", "Status");
    const totalFields = pick(v, "totalFields", "TotalFields") ?? 0;
    const statusLower = normalizeVenueStatus(status);
    const canDeactivate = statusLower === "active" || statusLower === "draft";

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
              <Link
                to={statusLower === "draft" ? `/owner/create-venue?venueId=${id}` : `/owner/venues/${id}`}
                className="ov-btn ov-btn--secondary"
              >
                {statusLower === "draft" ? "Tiếp tục tạo" : "Xem chi tiết"}
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

  return (
    <div className="owner-venues-page">
      <div className="ov-header">
        <div>
          <h1>Danh sách cơ sở của tôi</h1>
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
              data-kind="approved"
              aria-selected={listTab === "approved"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "approved" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("approved")}
            >
              <span className="ov-tab-icon" aria-hidden>
                <CircleCheck size={18} strokeWidth={2.25} />
              </span>
              <span className="ov-tab-main">
                <span className="ov-tab-label">Cơ sở đã duyệt</span>
                <span className="ov-tab-count">{approvedVenues.length}</span>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              id="ov-tab-draft"
              data-kind="draft"
              aria-selected={listTab === "draft"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "draft" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("draft")}
            >
              <span className="ov-tab-icon" aria-hidden>
                <FilePenLine size={18} strokeWidth={2.25} />
              </span>
              <span className="ov-tab-main">
                <span className="ov-tab-label">Bản nháp</span>
                <span className="ov-tab-count">{draftVenues.length}</span>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              id="ov-tab-pending"
              data-kind="pending"
              aria-selected={listTab === "pending"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "pending" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("pending")}
            >
              <span className="ov-tab-icon" aria-hidden>
                <Hourglass size={18} strokeWidth={2.25} />
              </span>
              <span className="ov-tab-main">
                <span className="ov-tab-label">Cơ sở chờ duyệt</span>
                <span className="ov-tab-count">{pendingVenues.length}</span>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              id="ov-tab-cancelled"
              data-kind="cancelled"
              aria-selected={listTab === "cancelled"}
              aria-controls="ov-tabpanel-venues"
              className={`ov-tab${listTab === "cancelled" ? " ov-tab--active" : ""}`}
              onClick={() => setListTab("cancelled")}
            >
              <span className="ov-tab-icon" aria-hidden>
                <Ban size={18} strokeWidth={2.25} />
              </span>
              <span className="ov-tab-main">
                <span className="ov-tab-label">Cơ sở bị hủy</span>
                <span className="ov-tab-count">{cancelledVenues.length}</span>
              </span>
            </button>
          </div>

          <p className="ov-tab-hint" id="ov-tab-hint">
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
};

export default OwnerVenues;

