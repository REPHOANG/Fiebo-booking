import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  ChevronRight, 
  Search,
  User,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Pagination } from "@mui/material";
import { getOwners } from "../../../services/adminService";
import "./AdminOwner.css";

const AVATAR_COLORS = [
  "#2563eb", // blue
  "#d97706", // amber
  "#059669", // emerald
  "#7c3aed", // violet
  "#db2777", // pink
  "#4b5563", // gray
];

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const getAvatarColor = (id) => {
  const index = typeof id === "number" ? id % AVATAR_COLORS.length : (id?.length || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const PAGE_SIZE = 9;

const AdminOwners = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    searchTerm: debouncedSearch.trim() || undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminOwners", queryParams],
    queryFn: () => getOwners(queryParams),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const owners = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Mock status mapping for design purposes (since it might not be in the API yet)
  const getStatus = (item) => {
    if (item.status === 0 || item.isLocked === false) return { label: "ACTIVE", class: "active" };
    if (item.status === 1) return { label: "PENDING", class: "pending" };
    if (item.isLocked === true) return { label: "SUSPENDED", class: "suspended" };
    return { label: "ACTIVE", class: "active" };
  };

  return (
    <div className="admin-owners-container">
      <header className="owners-header">
        <div style={{ maxWidth: 400}}>
          <div className="search-wrapper" style={{ position: "relative" }}>
            <Search 
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} 
              size={18} 
            />
            <input 
              type="text" 
              placeholder="Tìm kiếm chủ sân..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px 12px 40px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                outline: "none"
              }}
            />
          </div>
        </div>
      </header>

      {isError && (
        <div className="error-container" style={{ color: "#ef4444", background: "#fef2f2", padding: 16, borderRadius: 12, marginBottom: 24 }}>
          <AlertCircle size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
          {error?.response?.data?.message || error?.message || "Không thể tải danh sách chủ sân."}
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <Loader2 className="animate-spin" size={40} color="#2563eb" />
          <p style={{ marginTop: 16, color: "#64748b" }}>Đang tải danh sách chủ sân...</p>
        </div>
      ) : (
        <>
          <div className="owners-grid">
            {owners.map((item) => {
              const name = item.fullName ?? item.name ?? item.ownerName ?? "Chưa có tên";
              const id = item.id ?? item.ownerId;
              const status = getStatus(item);
              const initials = getInitials(name);
              const avatarColor = getAvatarColor(id);

              return (
                <div 
                  key={id} 
                  className="owner-card"
                  onClick={() => navigate(`/admin/owners/${id}`)}
                >
                  <div className="owner-card-header">
                    <div className="owner-avatar" style={{ backgroundColor: avatarColor }}>
                      {initials}
                    </div>
                    <div className="owner-info">
                      <h3 className="owner-name">{name}</h3>
                      <span className="owner-username">u-{id.toString().slice(0, 8)}</span>
                    </div>
                    <span className={`owner-card__status ${status.class}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="owner-card-content">
                    <div className="contact-item">
                      <span className="contact-icon"><Mail size={16} /></span>
                      {item.email || "Email chưa cập nhật"}
                    </div>
                    <div className="contact-item">
                      <span className="contact-icon"><Phone size={16} /></span>
                      {item.phoneNumber ?? item.phone ?? "SĐT chưa cập nhật"}
                    </div>

                    <div className="owner-stats-row">
                      <div className="stat-box">
                        <span className="stat-value">{item.totalVenues ?? 0}</span>
                        <span className="stat-label">Cơ sở</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-value">{item.totalFields ?? 0}</span>
                        <span className="stat-label">Sân bóng</span>
                      </div>
                    </div>
                  </div>

                  <div className="owner-card-footer">
                    <span className="update-time">
                      Cập nhật {item.updatedAt ? "vừa xong" : "hôm qua"}
                    </span>
                    <button className="btn-details">
                      CHI TIẾT <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {owners.length === 0 && (
            <div className="empty-container">
              <User size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <p style={{ color: "#64748b" }}>Không tìm thấy chủ sân phù hợp bộ lọc đã chọn.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminOwners;
