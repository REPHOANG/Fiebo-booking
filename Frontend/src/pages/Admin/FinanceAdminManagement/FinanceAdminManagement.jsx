import React, { useDeferredValue, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Switch,
  IconButton
} from "@mui/material";
import { 
  Plus, 
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Key,
  Copy,
  Users
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import CreateFinanceAdminForm from "./CreateFinanceAdminForm";
import { createFinanceAdmin, getFinanceAdmins, resetFinanceAdminPassword } from "../../../services/adminService";
import {  formatDateTime } from "../../../utils/helperFunction";
import "./FinanceAdminManagement.css";
import ErrorPage from "../../../components/ui/Error/ErrorPage";

const AVATAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];

const getAvatarColor = (id) => {
  const index = typeof id === "number" ? id % AVATAR_COLORS.length : (id?.length || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const FinanceAdminManagement = () => {
  const queryClient = useQueryClient();
  const [search] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdDesc");
  const [openCreate, setOpenCreate] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [resetPasswordResult, setResetPasswordResult] = useState(null);

  const {
    data: accounts = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["financeAdmins"],
    queryFn: getFinanceAdmins,
    select: (list) => {
      return (Array.isArray(list) ? list : []).map((item) => ({
        id: item?.id ?? item?.Id ?? "",
        name: item?.fullName || item?.FullName || "Chưa có tên",
        email: item?.email ||  "-",
        createdAt: item?.createdAt || "-",
        status: String(item?.status || item?.Status || "").toLowerCase() === "active" ? "active" : "inactive",
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: createFinanceAdmin,
    onSuccess: async () => {
      toast.success("Tạo tài khoản thành công!");
      setOpenCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["financeAdmins"] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => resetFinanceAdminPassword(id),
    onSuccess: (data) => {
      setResetPasswordResult(data?.TempPassword ?? data?.tempPassword ?? "");
      toast.success("Reset mật khẩu thành công!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Reset mật khẩu thất bại.");
    },
  });

  const toggleAccountStatus = (id) => {
    setStatusOverrides((prev) => {
      const current = prev[id] || accounts.find(a => a.id === id)?.status;
      return { ...prev, [id]: current === "active" ? "inactive" : "active" };
    });
  };

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filteredAccounts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return accounts.filter((item) => {
      const currentStatus = statusOverrides[item.id] || item.status;
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "createdDesc") return new Date(b.createdAt) - new Date(a.createdAt);
      return a.name.localeCompare(b.name);
    });
  }, [accounts, deferredSearch, statusFilter, sortBy, statusOverrides]);

  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const currentItems = filteredAccounts.slice((page - 1) * pageSize, page * pageSize);
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  if(isError){
    return (<ErrorPage/>);
  }
  return (
    <div className="finance-admin-container">
      {/* Header Section */}
      <div className="finance-header">
        <div className="finance-title">
          <h2>Quản lý tài chính</h2>
          <p>Quản lý nhân viên tài chính</p>
        </div>
        <button className="btn-add-new" onClick={() => setOpenCreate(true)}>
          <Plus size={18} />
          Thêm mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-item">
          <label className="filter-label">TRẠNG THÁI:</label>
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
        </div>
        
        <div className="filter-item">
          <label className="filter-label">NGÀY TẠO:</label>
          <select 
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="month">Tháng này</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-label">SẮP XẾP:</label>
          <select 
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdDesc">Mới nhất</option>
            <option value="nameAsc">Tên A-Z</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="staff-grid">
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
            <CircularProgress size={32} />
          </div>
        ) : (
          <>
            {currentItems.map((item) => {
              const currentStatus = statusOverrides[item.id] || item.status;
              const initials = getInitials(item.name);
              const avatarColor = getAvatarColor(item.id);

              return (
                <div className="staff-card" key={item.id}>
                  <div className="staff-card__toggle">
                    <Switch 
                      size="small" 
                      checked={currentStatus === 'active'}
                      onChange={() => toggleAccountStatus(item.id)}
                      color="success"
                    />
                  </div>
                  
                  <div className="staff-card__header">
                    <div className="staff-avatar" style={{ backgroundColor: avatarColor }}>
                      <div className="avatar-placeholder">{initials}</div>
                    </div>
                    <div className="staff-info">
                      <h3>{item.name}</h3>
                      <p>{item.email}</p>
                    </div>
                  </div>

                  <div className="staff-details">
                    <div className="detail-row" style={{backgroundColor:"none"}}>
                      <label>Mã nhân viên</label>
                      <span>{item.id}</span>
                    </div>
                    <div className="detail-row">
                      <label>Ngày tạo</label>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <label>Trạng thái</label>
                      <span className={`status-badge ${currentStatus}`}>
                        {currentStatus === 'active' ? 'ĐANG HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}
                      </span>
                    </div>
                  </div>

                  <div className="staff-card__actions">
                    <button 
                      className="btn-edit-icon" 
                      title="Reset mật khẩu"
                      onClick={() => resetPasswordMutation.mutate(item.id)}
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending && resetPasswordMutation.variables === item.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Key size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {currentItems.length === 0 && (
              <div className="empty-state-container">
                <div className="empty-state-icon">
                  <Users size={48} />
                </div>
                <h3>Không có nhân viên nào</h3>
                <p>Hiện tại chưa có nhân viên tài chính nào trong danh sách hoặc không khớp với bộ lọc.</p>
                <button className="btn-add-new" style={{ marginTop: '20px' }} onClick={() => setOpenCreate(true)}>
                  <Plus size={18} />
                  Thêm nhân viên ngay
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="pagination-footer">
        <div className="pagination-text">
          Hiển thị {startItem}-{endItem} trong tổng số {totalItems} nhân viên
        </div>
        <div className="pagination-controls">
          <button 
            className="btn-page" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i + 1}
              className={`btn-page ${page === i + 1 ? "active" : ""}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button 
            className="btn-page"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
          <button className="btn-add-floating" onClick={() => setOpenCreate(true)}>
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      {/* Reset Password Result Modal */}
      <Dialog 
        open={!!resetPasswordResult} 
        onClose={() => setResetPasswordResult(null)}
        PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', color: '#1e293b', fontFamily:"Be Vietnam Pro" }}>
          Mật khẩu mới đã được tạo
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            Vui lòng cung cấp mật khẩu tạm thời này cho nhân viên. Họ nên đổi mật khẩu ngay sau khi đăng nhập.
          </p>
          <div style={{ 
            backgroundColor: '#f1f5f9', 
            padding: '16px', 
            borderRadius: '12px',
            fontSize: '20px',
            fontWeight: 800,
            color: '#1e56d9',
            letterSpacing: '0.1em',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px'
          }}>
            {resetPasswordResult}
            <IconButton 
              size="small" 
              onClick={() => {
                navigator.clipboard.writeText(resetPasswordResult);
                toast.success("Đã sao chép mật khẩu!");
              }}
            >
              <Copy size={18} />
            </IconButton>
          </div>
          <button 
            className="btn-add-new" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setResetPasswordResult(null)}
          >
            Đã hiểu
          </button>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <CreateFinanceAdminForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />
    </div>
  );
};

export default FinanceAdminManagement;
