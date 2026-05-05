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
          <h2 className="card-title">Danh sách hồ sơ đăng ký cơ sở</h2>
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
