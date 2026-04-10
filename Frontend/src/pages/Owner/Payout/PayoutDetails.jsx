import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Chip,
  Collapse,
} from '@mui/material';
import {
  AccountBalanceWallet,
  AccountBalance,
  Stadium,
  SportsSoccer,
  VerifiedUser,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  HourglassTop,
  Schedule,
  ErrorOutline,
  HelpOutline,
} from '@mui/icons-material';
import { getOwnerPayoutDetail } from '../../../services/ownerService';
import LoadingPage from '../../../components/ui/Loading/LoadingPage';
import ErrorPage from '../../../components/ui/Error/ErrorPage';
import { formatDate, formatDateTime, formatVND } from '../../../utils/helperFunction';

const fontStyle = {
  fontFamily: "'Be Vietnam Pro', sans-serif",
};

const containerStyle = {
  ...fontStyle,
  backgroundColor: '#f7f9fb',
  minHeight: '100vh',
  paddingBottom: '24px',
};

const cardStyle = {
  borderRadius: '24px',
  boxShadow: '0 12px 40px rgba(25,28,30,0.06)',
};

const venueHeaderStyle = {
  ...cardStyle,
  backgroundColor: '#ffffff',
  padding: '20px',
  marginBottom: '12px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  '&:hover': {
    backgroundColor: '#f2f4f6',
  },
};

const bookingItemStyle = {
  ...cardStyle,
  backgroundColor: '#f2f4f6',
  padding: '16px 24px',
  marginBottom: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const statusMap = {
  Completed: 'Đã hoàn tất',
  Processing: 'Đang xử lý',
  Pending: 'Đang chờ',
  Failed: 'Thất bại',
};

const statusColorMap = {
  Completed: { backgroundColor: '#009668', color: '#ffffff' },
  Processing: { backgroundColor: '#e8def8', color: '#4a4458' },
  Pending: { backgroundColor: '#d5e3fc', color: '#3f465c' },
  Failed: { backgroundColor: '#ffdad6', color: '#93000a' },
};

const statusIconMap = {
  Completed: CheckCircle,
  Processing: HourglassTop,
  Pending: Schedule,
  Failed: ErrorOutline,
};

export default function PayoutDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [expandedVenue, setExpandedVenue] = useState(null);

  const {
    data: payoutData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ownerPayoutDetail', id],
    queryFn: () => getOwnerPayoutDetail(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <LoadingPage />;
  if (isError || !payoutData) return <ErrorPage />;

  const generalInfo = payoutData?.generalInfo || {};
  const financialSummary = payoutData?.financialSummary || {};
  const facilitiesBreakdown = Array.isArray(payoutData?.facilitiesBreakdown)
    ? payoutData.facilitiesBreakdown
    : [];

  const statusLabel = statusMap[generalInfo?.status] || generalInfo?.status || 'Không xác định';
  const statusStyle = statusColorMap[generalInfo?.status] || {
    backgroundColor: '#e0e3e5',
    color: '#45464d',
  };
  const StatusIcon = statusIconMap[generalInfo?.status] || HelpOutline;

  const totalBookings = facilitiesBreakdown.reduce(
    (sum, venue) => sum + (Array.isArray(venue?.bookings) ? venue.bookings.length : 0),
    0
  );

  const toggleVenue = (venueId) => {
    setExpandedVenue(expandedVenue === venueId ? null : venueId);
  };

  return (
    <div style={containerStyle}>
      <Container sx={{
        width: '85%'
      }} style={{ marginTop: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <Paper
            style={{
              ...cardStyle,
              backgroundColor: '#ffffff',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ ...fontStyle, fontSize: '12px', fontWeight: 500, color: '#45464d', letterSpacing: '0.05em', marginBottom: '8px' }}>
                TỔNG CHI TRẢ
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ ...fontStyle, fontSize: '36px', fontWeight: 800, color: '#191c1e' }}>
                  {formatVND(Number(financialSummary?.totalAmount || 0))}
                </span>
              </div>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Chip
                icon={<StatusIcon sx={{ fontSize: '16px' }} />}
                label={statusLabel}
                sx={{
                  ...statusStyle,
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: '12px',
                  fontWeight: 700,
                  '& .MuiChip-icon': {
                    color: statusStyle.color,
                  },
                }}
              />
              <span style={{ ...fontStyle, fontSize: '11px', fontWeight: 500, color: '#45464d' }}>
                Đã xử lý: {formatDateTime(generalInfo?.processedAt)}
              </span>
            </div>
            {generalInfo?.failureReason ? (
              <div style={{ ...fontStyle, marginTop: '8px', color: '#ba1a1a', fontSize: '12px', fontWeight: 600 }}>
                Lý do thất bại: {generalInfo.failureReason}
              </div>
            ) : null}
          </Paper>

          <Paper
            style={{
              ...cardStyle,
              backgroundColor: '#131b2e',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              color: '#ffffff',
            }}
          >
            <AccountBalanceWallet style={{ fontSize: '40px', marginBottom: '12px', color: '#6ffbbe' }} />
            <div style={{ ...fontStyle, fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', marginBottom: '4px' }}>
              HÌNH THỨC
            </div>
            <div style={{ ...fontStyle, fontSize: '18px', fontWeight: 700 }}>Chuyển khoản ngân hàng</div>
          </Paper>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ ...fontStyle, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#45464d', letterSpacing: '0.1em', paddingLeft: '8px', marginBottom: '16px' }}>
            Tài khoản nhận tiền
          </h2>
          <Paper
            style={{
              ...cardStyle,
              backgroundColor: '#f2f4f6',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: '#e0e3e5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AccountBalance style={{ color: '#515f74' }} />
              </div>
              <div>
                <p style={{ ...fontStyle, fontSize: '16px', fontWeight: 700, color: '#191c1e', margin: '0 0 4px 0' }}>
                  {financialSummary?.accountHolderName?.toUpperCase() || '--'}
                </p>
                <p style={{ ...fontStyle, fontSize: '13px', color: '#45464d', margin: 0, letterSpacing: '0.02em' }}>
                  Ngân hàng: {financialSummary?.bankName || '--'} | Số tài khoản: {financialSummary?.accountNumber || financialSummary?.maskedAccountNumber || '--'}
                </p>
              </div>
            </div>
            <VerifiedUser style={{ color: '#000000' }} />
          </Paper>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: '8px', marginBottom: '24px' }}>
            <h2 style={{ ...fontStyle, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#45464d', letterSpacing: '0.1em', margin: 0 }}>
              Chi tiết theo cơ sở
            </h2>
            <span style={{ ...fontStyle, fontSize: '12px', color: '#45464d', fontWeight: 500 }}>
              {totalBookings} lượt đặt
            </span>
          </div>

          {facilitiesBreakdown.map((venue, index) => {
            const IconComponent = index % 2 === 0 ? Stadium : SportsSoccer;
            const venueId = venue?.venueId || `venue-${index}`;
            const isExpanded = expandedVenue === venueId;
            const bookings = Array.isArray(venue?.bookings) ? venue.bookings : [];

            return (
              <div key={venueId} style={{ marginBottom: '24px' }}>
                <Paper
                  onClick={() => toggleVenue(venueId)}
                  style={{
                    ...venueHeaderStyle,
                    backgroundColor: isExpanded ? '#f2f4f6' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: venue.iconBg,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent style={{ color: venue.iconColor }} />
                    </div>
                    <h3 style={{ ...fontStyle, fontSize: '16px', fontWeight: 700, color: '#191c1e', margin: 0, flex: 1 }}>
                      {venue?.venueName || 'Cơ sở không tên'}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <p style={{ ...fontStyle, fontSize: '16px', fontWeight: 800, color: '#191c1e', margin: '0 0 4px 0' }}>
                        {formatVND(Number(venue?.subtotal || 0))}
                      </p>
                    </div>
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </div>
                </Paper>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <div style={{ marginTop: '8px', paddingLeft: '8px' }}>
                    {bookings.map((booking) => (
                      <Paper
                        key={booking?.bookingId}
                        onClick={() => {
                          if (booking?.bookingId) {
                            navigate(`/owner/bookings/${booking.bookingId}`);
                          }
                        }}
                        sx={{
                          ...bookingItemStyle,
                          cursor: booking?.bookingId ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          '&:hover': booking?.bookingId
                            ? { boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }
                            : {},
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ ...fontStyle, fontSize: '12px', fontWeight: 700, color: '#3f465c' }}>
                              #{booking?.bookingId}
                            </span>
                            <p style={{ ...fontStyle, fontSize: '14px', fontWeight: 600, color: '#191c1e', margin: 0 }}>
                              {booking?.subFieldName || 'Sân không tên'}
                            </p>
                          </div>
                          <p style={{ ...fontStyle, fontSize: '11px', color: '#45464d', margin: '4px 0 0 0' }}>
                            Ngày chơi: {formatDate(booking?.playDate)}
                          </p>
                        </div>
                        <p style={{ ...fontStyle, fontSize: '14px', fontWeight: 700, color: '#191c1e' }}>
                          {formatVND(Number(booking?.amount || 0))}
                        </p>
                      </Paper>
                    ))}

                    {bookings.length === 0 ? (
                      <Paper style={{ ...bookingItemStyle, justifyContent: 'center' }}>
                        <p style={{ ...fontStyle, fontSize: '13px', color: '#45464d', margin: 0 }}>
                          Chưa có lượt đặt cho cơ sở này.
                        </p>
                      </Paper>
                    ) : null}
                  </div>
                </Collapse>
              </div>
            );
          })}

          {facilitiesBreakdown.length === 0 ? (
            <Paper style={{ ...bookingItemStyle, justifyContent: 'center' }}>
              <p style={{ ...fontStyle, fontSize: '14px', color: '#45464d', margin: 0 }}>
                Không có dữ liệu chi tiết theo cơ sở.
              </p>
            </Paper>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
