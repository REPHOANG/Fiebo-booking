'use client';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatDate } from './../../../utils/helperFunction';
import { getPendingVenues } from '../../../services/adminService';
import { useQuery } from '@tanstack/react-query';
import LoadingPage from '../../../components/ui/Loading/LoadingPage';
import { Link } from 'react-router-dom';

export const AdminVenueRegistrations = () => {
  const {data = [], isLoading} = useQuery({
    queryKey: ['pendingVenues'],
    queryFn: getPendingVenues,
  });
  const navigate = useNavigate();
  if(isLoading){
    return <LoadingPage/>
  }
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
            {data.items.map((venue, index) => (
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
                  {index + 1}
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
                    // as={Link}
                    // to={"/admin/venue/" + venue.venueId}
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => navigate(`/admin/venue/${venue.venueId}`)}
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
          </TableBody>
        </Table>
      </TableContainer>

      {/* Empty State */}
      
    </Container>
  );
};
