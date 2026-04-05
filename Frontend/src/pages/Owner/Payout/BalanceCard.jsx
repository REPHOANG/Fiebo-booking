import {
  Card,
  Typography,
  Box,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatVND } from '../../../utils/helperFunction';

export const BalanceCard = ({ pendingBalance = 0, nextPayoutLabel = 'Chưa có lịch chi trả tiếp theo' }) => {
  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, #131b2e 0%, #1a2332 100%)',
        color: 'white',
        borderRadius: 3,
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          background: 'rgba(79, 222, 163, 0.1)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.875rem', fontFamily: 'inherit' }}>
            Số dư chờ chi trả
          </Typography>
          <InfoIcon sx={{ fontSize: '1rem' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
          <Typography variant="h1" sx={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'inherit' }}>
            {formatVND(pendingBalance)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            width: 'fit-content',
            px: 1.5,
            py: 1,
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: '1rem', color: '#4edea3' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, fontFamily: 'inherit' }}>
            {nextPayoutLabel}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};
