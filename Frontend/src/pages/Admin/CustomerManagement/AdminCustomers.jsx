import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Pagination,
  Typography,
} from "@mui/material";
import { Select as AntdSelect } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  User,
  UserX,
  ChevronDown
} from "lucide-react";
import { getCustomers } from "../../../services/adminService";
import "./AdminCustomers.css";

const STATUS_OPTIONS = [
  { value: "", label: "Trạng thái: Tất cả" },
  { value: "1", label: "Đang hoạt động" },
  { value: "0", label: "Không hoạt động" },
  { value: "-1", label: "Đã khóa" },
];

const DATE_OPTIONS = [
  { value: "newest", label: "Ngày đăng ký: Mới nhất" },
  { value: "oldest", label: "Ngày đăng ký: Cũ nhất" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Sắp xếp: A - Z" },
  { value: "name_desc", label: "Sắp xếp: Z - A" },
];

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const PAGE_SIZE = 10;

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    searchTerm: debouncedSearch.trim() || undefined,
    status: statusFilter !== "" ? Number(statusFilter) : undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  };

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminCustomers", queryParams],
    queryFn: () => getCustomers(queryParams),
    staleTime: 2 * 60 * 1000,
  });

  const customers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleExport = () => {
    if (customers.length === 0) return;
    const headers = ["ID", "Họ tên", "Email", "Số điện thoại", "Trạng thái"];
    const rows = customers.map(c => [
      c.id,
      c.fullName,
      c.email,
      c.phoneNumber,
      c.status === 1 ? "Hoạt động" : c.status === 0 ? "Không hoạt động" : "Bị khóa"
    ]);

    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_sach_khach_hang_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const getStatusClass = (status) => {
    if (status === 1) return "active";
    if (status === -1) return "locked";
    return "inactive";
  };

  const getStatusLabel = (status) => {
    if (status === 1) return "Đang hoạt động";
    if (status === -1) return "Đã khóa";
    return "Không hoạt động";
  };

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="admin-customers-container">
      {/* Header */}
      <div className="customers-header">
        <div className="header-title">
          <h1>Quản lý khách hàng</h1>
          <p>Tổng số <span>{totalItems.toLocaleString()}</span> người dùng trong hệ thống.</p>
        </div>
        <button className="btn-export" onClick={handleExport}>
          <Download size={18} />
          Xuất báo cáo
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <AntdSelect
          className="filter-select"
          value={statusFilter}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          suffixIcon={<ChevronDown size={14} />}
        />

        <AntdSelect
          className="filter-select"
          defaultValue="newest"
          options={DATE_OPTIONS}
          suffixIcon={<ChevronDown size={14} />}
        />

        <AntdSelect
          className="filter-select"
          defaultValue="name_asc"
          options={SORT_OPTIONS}
          suffixIcon={<ChevronDown size={14} />}
        />
      </div>

      {/* Table Card */}
      <div className="customers-table-card">
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={40} />
          </Box>
        ) : isError ? (
          <Box sx={{ p: 4, textAlign: 'center', color: '#ef4444' }}>
            Không thể tải dữ liệu. Vui lòng thử lại sau.
          </Box>
        ) : (
          <table className="customers-table">
            <thead>
              <tr>
                <th>KHÁCH HÀNG</th>
                <th>EMAIL/SĐT</th>
                <th>NGÀY THAM GIA</th>
                <th>ĐƠN ĐẶT</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar">
                        {getInitials(item.fullName) || <User size={20} />}
                      </div>
                      <span className="customer-name">{item.fullName || "N/A"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      <div>{item.email || "N/A"}</div>
                      <div className="phone">{item.phoneNumber || "N/A"}</div>
                    </div>
                  </td>
                  <td>24/04/2026</td>
                  <td style={{ fontWeight: 600 }}>12</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn-detail">Chi tiết</button>
                      <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && customers.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <UserX size={32} />
            </div>
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem thêm khách hàng.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && customers.length > 0 && (
        <div className="pagination-section">
          <div className="pagination-info">
            Hiển thị <span>{startIndex}-{endIndex}</span> trong tổng số <span>{totalItems}</span> khách hàng
          </div>
          <div className="pagination-controls">
            <select className="page-size-select">
              <option value="10">10 / trang</option>
              <option value="20">20 / trang</option>
              <option value="50">50 / trang</option>
            </select>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
              size="medium"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
