import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  Container,
  Chip,
  Pagination,
  Stack,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from './../../../utils/helperFunction';
import { ADMIN_PENDING_VENUES_QUERY_KEY, getPendingVenues } from '../../../services/adminService';
import { useQuery } from '@tanstack/react-query';
import LoadingPage from '../../../components/ui/Loading/LoadingPage';

export const AdminVenueRegistrations = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...ADMIN_PENDING_VENUES_QUERY_KEY, page, pageSize],
    queryFn: () => getPendingVenues({ page, pageSize }),
  });

  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingPage />;
  }

  const items = data?.items ?? [];
  const totalItems = Number(data?.totalItems ?? 0);
  const totalPages = Math.max(Number(data?.totalPages ?? 0), 1);

  return (
    <Container
      maxWidth="lg"
      style={{
        padding: '24px 0',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Header */}
      <Box
        style={{
          marginBottom: '24px',
        }}
      >
        <Typography
          variant="h4"
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '8px',
          }}
        >
          Danh sách cơ sở thể thao chờ phê duyệt
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Chip
            label={`${totalItems} hồ sơ đang chờ duyệt`}
            color="warning"
            variant="outlined"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
          />
          <Button
            variant="outlined"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              fontFamily: "'Be Vietnam Pro', sans-serif",
              textTransform: 'none',
            }}
          >
            {isFetching ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
        }}
      >
        <Table
          style={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          {/* Header */}
          <TableHead>
            <TableRow
              style={{
                backgroundColor: '#f5f5f5',
              }}
            >
              <TableCell
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontSize: '14px',
                  padding: '16px',
                }}
              >
                STT
              </TableCell>
              <TableCell
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontSize: '14px',
                  padding: '16px',
                }}
              >
                Tên cơ sở
              </TableCell>
              <TableCell
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontSize: '14px',
                  padding: '16px',
                }}
              >
                Chủ sở hữu
              </TableCell>
              <TableCell
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontSize: '14px',
                  padding: '16px',
                }}
              >
                Ngày gửi
              </TableCell>
              <TableCell
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontSize: '14px',
                  padding: '16px',
                }}
              >
                Trạng thái
              </TableCell>
              <TableCell
                align="center"
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontSize: '14px',
                  padding: '16px',
                }}
              >
                Hành động
              </TableCell>
            </TableRow>
          </TableHead>

          {/* Body */}
          <TableBody>
            {items.map((venue, index) => (
              <TableRow
                key={venue.venueId}
                style={{
                  borderBottom: '1px solid #e0e0e0',
                  '&:hover': {
                    backgroundColor: '#fafafa',
                  },
                }}
              >
                <TableCell
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    color: '#666',
                    fontSize: '14px',
                    padding: '16px',
                  }}
                >
                  {(page - 1) * pageSize + index + 1}
                </TableCell>
                <TableCell
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    color: '#1a1a1a',
                    fontSize: '14px',
                    padding: '16px',
                    fontWeight: 500,
                  }}
                >
                  {venue.venueName}
                </TableCell>
                <TableCell
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    color: '#666',
                    fontSize: '14px',
                    padding: '16px',
                  }}
                >
                  {venue.ownerName}
                </TableCell>
                <TableCell
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    color: '#666',
                    fontSize: '14px',
                    padding: '16px',
                  }}
                >
                  <Chip
                    label={formatDate(venue.submittedDate)}
                    size="small"
                    variant="outlined"
                    style={{
                      fontFamily: "'Be Vietnam Pro', sans-serif",
                    }}
                  />
                </TableCell>
                <TableCell
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    color: '#666',
                    fontSize: '14px',
                    padding: '16px',
                  }}
                >
                  {venue.status}
                </TableCell>
                <TableCell
                  align="center"
                  style={{
                    padding: '16px',
                  }}
                >
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => navigate(`/admin/venue-registrations/${venue.venueId}`)}
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Xem chi tiết
                    </Button>
                    
                </TableCell>
              </TableRow>
            ))}
            {!items.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    color: '#666',
                    padding: '32px 16px',
                  }}
                >
                  Không có hồ sơ đăng ký sân nào đang chờ duyệt.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalItems > 0 && (
        <Box mt={3} display="flex" justifyContent="center">
          <Pagination
            color="primary"
            page={page}
            count={totalPages}
            onChange={(_, value) => setPage(value)}
          />
        </Box>
      )}
    </Container>
  );
};
