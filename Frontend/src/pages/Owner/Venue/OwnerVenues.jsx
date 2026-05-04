import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, CircleCheck, FilePenLine, Hourglass, Ban, Eye, Power } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
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
  const s = String(raw).trim().toLowerCase();
  if (s === "cancelled") return "rejected";
  return s;
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
    if (s === "active" || s === "inactive") approved.push(v);
    else if (s === "draft") draft.push(v);
    else if (s === "rejected") cancelled.push(v);
    else if (s === "pending") pending.push(v);
  }
  return { approved, draft, pending, cancelled };
}

const OwnerVenues = () => {
  const navigate = useNavigate();
  const profile = useSelector((state) => state.auth?.user);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [listTab, setListTab] = useState("approved");

  const handleCreateVenue = (e) => {
    e.preventDefault();
    const hasBank = profile?.hasBankAccount || profile?.HasBankAccount;
    if (!hasBank) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin ngân hàng",
        text: "Bạn cần thêm tài khoản ngân hàng trong Hồ sơ trước khi tạo cơ sở để có thể nhận thanh toán.",
        showCancelButton: true,
        confirmButtonText: "Đến Hồ sơ",
        cancelButtonText: "Đóng",
        confirmButtonColor: "#045e36",
        cancelButtonColor: "#64748b",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/owner/profile");
        }
      });
    } else {
      navigate("/owner/create-venue");
    }
  };

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

  const handleToggleActive = async (venueId, name, isInactive) => {
    const result = await Swal.fire({
      icon: isInactive ? "question" : "warning",
      title: isInactive ? "Mở lại cơ sở?" : "Vô hiệu hóa cơ sở?",
      text: isInactive
        ? `Bạn muốn mở lại cơ sở "${name}"?`
        : `Vô hiệu hóa cơ sở "${name}"? Khách sẽ không đặt sân tại đây nữa.`,
      showCancelButton: true,
      confirmButtonText: isInactive ? "Mở lại" : "Vô hiệu hóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: isInactive ? "#045e36" : "#dc2626",
      cancelButtonColor: "#64748b",
    });
    if (!result.isConfirmed) return;
    try {
      await deactivateOwnerVenue(venueId);
      const nextStatus = isInactive ? "active" : "inactive";
      setVenues((prev) =>
        prev.map((venue) => {
          const vid = pick(venue, "venueId", "VenueId", "id", "Id");
          if (String(vid) !== String(venueId)) return venue;
          const updated = { ...venue };
          if ("status" in updated) updated.status = nextStatus;
          if ("Status" in updated) updated.Status = nextStatus;
          return updated;
        }),
      );
    } catch (e) {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          (isInactive ? "Không mở lại được." : "Không vô hiệu hóa được."),
      );
    }
  };

  const renderVenueCard = (v) => {
    const id = pick(v, "venueId", "VenueId", "id", "Id");
    const name = pick(v, "name", "Name") ?? "—";
    const thumb = pick(v, "thumbnailUrl", "ThumbnailUrl") || "";
    const province = pick(v, "province", "Province") ?? "";
    const ward = pick(v, "ward", "Ward") ?? "";
    const status = pick(v, "status", "Status");
    const totalFields = pick(v, "totalFields", "TotalFields") ?? 0;
    const statusLower = normalizeVenueStatus(status);
    const canToggleActive = statusLower === "active" || statusLower === "draft" || statusLower === "inactive";
    const isInactive = statusLower === "inactive";

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
              <div className="ov-card-actions">
              <Link
                to={statusLower === "draft" ? `/owner/create-venue?venueId=${id}` : `/owner/venues/${id}`}
                className="ov-icon-btn ov-icon-btn--secondary"
                title={statusLower === "draft" ? "Tiếp tục tạo" : "Xem chi tiết"}
                aria-label={statusLower === "draft" ? "Tiếp tục tạo" : "Xem chi tiết"}
              >
                <Eye size={18} aria-hidden />
              </Link>
              {statusLower === "rejected" ? (
                <Link
                  to={`/owner/venues/${id}/recreate`}
                  className="ov-icon-btn ov-icon-btn--primary"
                  title="Chỉnh sửa"
                  aria-label="Chỉnh sửa"
                >
                  <FilePenLine size={18} aria-hidden />
                </Link>
              ) : null}
              {canToggleActive ? (
                <button
                  type="button"
                  className={`ov-icon-btn ov-icon-btn--toggle${isInactive ? "" : " is-on"}`}
                  title={isInactive ? "Mở lại" : "Vô hiệu hóa"}
                  aria-label={isInactive ? "Mở lại" : "Vô hiệu hóa"}
                  onClick={() => handleToggleActive(id, name, isInactive)}
                >
                  <Power size={18} aria-hidden />
                </button>
              ) : null}
            </div>
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
          <a href="/owner/create-venue" className="ov-create-btn" onClick={handleCreateVenue}>
            + Tạo cơ sở mới
          </a>
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
          <a href="/owner/create-venue" className="ov-create-link" onClick={handleCreateVenue}>
            Bắt đầu tạo cơ sở đầu tiên
          </a>
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
                <span className="ov-tab-label">Cơ sở bị từ chối</span>
                <span className="ov-tab-count">{cancelledVenues.length}</span>
              </span>
            </button>
          </div>

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

