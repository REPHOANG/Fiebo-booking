import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Filter, 
  Download, 
  Building2, 
  MapPin,
  Eye,
  Search
} from 'lucide-react';
import { Pagination } from '@mui/material';
import { formatDate } from './../../../utils/helperFunction';
import { ADMIN_PENDING_VENUES_QUERY_KEY, getPendingVenues } from '../../../services/adminService';
import { useQuery } from '@tanstack/react-query';
import LoadingPage from '../../../components/ui/Loading/LoadingPage';
import './AdminVenueRegistrations.css';

const STATUS_MAP = {
  'Pending': { label: 'Chờ xử lý', class: 'pending' },
  'Approved': { label: 'Đã duyệt', class: 'approved' },
  'Rejected': { label: 'Đã từ chối', class: 'rejected' },
};

export const AdminVenueRegistrations = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const pageSize = 10;
  
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...ADMIN_PENDING_VENUES_QUERY_KEY, page, pageSize, search, statusFilter],
    queryFn: () => getPendingVenues({ 
      page, 
      pageSize, 
      SearchTerm: search, 
      Status: statusFilter 
    }),
  });

  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingPage />;
  }

  // Filter items locally as a fallback in case the backend ignores the status param
  // but usually for a registrations page, we only show Pending anyway.
  const rawItems = data?.items ?? [];
  const items = rawItems.filter(item => {
    const matchSearch = !search || item.venueName?.toLowerCase().includes(search.toLowerCase());
    // If statusFilter is empty (All), show all. If it matches item status, show it.
    // Since this is a "Registrations" page, item.status is likely always Pending.
    const matchStatus = !statusFilter || item.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalItems = Number(data?.totalItems ?? 0);
  const totalPages = Math.max(Number(data?.totalPages ?? 0), 1);

  return (
    <div className="venue-registrations-container">
      <div className="registrations-card">
        <div className="card-header">
          <h2 className="card-title">Danh sách hồ sơ</h2>
          <div className="header-actions">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Tìm tên cơ sở..." 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            
            <div className="filter-group">
              <button 
                className={`filter-trigger ${isFilterOpen ? "active" : ""}`}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter size={16} />
                Bộ lọc nâng cao
              </button>

              {isFilterOpen && (
                <>
                  <div className="filter-overlay" onClick={() => setIsFilterOpen(false)} />
                  <div className="filter-dropdown">
                    <div className="dropdown-label">TRẠNG THÁI</div>
                    <div 
                      className={`filter-option ${statusFilter === "" ? "active" : ""}`}
                      onClick={() => { setStatusFilter(""); setIsFilterOpen(false); setPage(1); }}
                    >
                      <span className="dot all"></span> Tất cả
                    </div>
                    <div 
                      className={`filter-option ${statusFilter === "Pending" ? "active" : ""}`}
                      onClick={() => { setStatusFilter("Pending"); setIsFilterOpen(false); setPage(1); }}
                    >
                      <span className="dot pending"></span> Chờ xử lý
                    </div>
                    <div 
                      className={`filter-option ${statusFilter === "Approved" ? "active" : ""}`}
                      onClick={() => { setStatusFilter("Approved"); setIsFilterOpen(false); setPage(1); }}
                    >
                      <span className="dot success"></span> Đã duyệt
                    </div>
                    <div 
                      className={`filter-option ${statusFilter === "Rejected" ? "active" : ""}`}
                      onClick={() => { setStatusFilter("Rejected"); setIsFilterOpen(false); setPage(1); }}
                    >
                      <span className="dot service"></span> Đã từ chối
                    </div>
                  </div>
                </>
              )}
            </div>

            <button className="btn-action">
              <Download size={16} />
              Xuất Excel
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="registrations-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên cơ sở</th>
                <th>Chủ sở hữu</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((venue, index) => (
                <tr key={venue.venueId}>
                  <td className="stt-col">{(page - 1) * pageSize + index + 1}</td>
                  <td>
                    <div className="venue-col">
                      <span className="venue-name-text">{venue.venueName}</span>
                    </div>
                  </td>
                  <td className="owner-name">{venue.ownerName}</td>
                  <td className="date-col">{formatDate(venue.submittedDate)}</td>
                  <td>
                    <div className={`status-pill ${STATUS_MAP[venue.status]?.class || 'pending'}`}>
                      <span className="status-dot"></span>
                      {STATUS_MAP[venue.status]?.label || venue.status || 'Chờ xử lý'}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn-view-detail"
                      onClick={() => navigate(`/admin/venue-registrations/${venue.venueId}`)}
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Không có hồ sơ đăng ký sân nào đang chờ duyệt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer">
          <div className="pagination-info">
            Hiển thị {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)} trên tổng số {totalItems} hồ sơ
          </div>
          <div className="pagination-wrapper">
            <Pagination
              color="primary"
              page={page}
              count={totalPages}
              onChange={(_, value) => setPage(value)}
              shape="rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
