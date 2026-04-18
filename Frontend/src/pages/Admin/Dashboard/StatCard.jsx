import { Box, Card, CardContent, Typography } from '@mui/material';

const COLORS = {
  onSurface: '#0b1c30',
  onSurfaceVariant: '#6b7280',
  white: '#ffffff',
  surfaceContainer: '#d3e4fe',
};

export default function StatCard({
  title,
  value,
  unit,
  icon,
  change,
  changeColor = '#00b341',
  changeBg = '#c8e6c9',
  bgColor = '#e3f2fd',
  iconColor = '#2196f3',
  isLive = false,
}) {
  return (
    <Card
      sx={{
        bgcolor: COLORS.white,
        border: `1px solid ${COLORS.surfaceContainer}`,
        borderRadius: 1,
        boxShadow: '0px 0px 24px rgba(11,28,48,0.06)',
        height: '100%',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              p: 1.25,
              bgcolor: bgColor,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: 24 }}>
              {icon}
            </span>
          </Box>

          {change && (
            <Typography
              sx={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: changeColor,
                bgcolor: changeBg,
                px: 1,
                py: 0.5,
                borderRadius: '999px',
              }}
            >
              {change}
            </Typography>
          )}

          {isLive && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#006e2d',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                boxShadow: '0 0 8px #7ffc97',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
        </Box>

        <Typography
          sx={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: COLORS.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mb: 1,
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: COLORS.onSurface,
            }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography sx={{ fontSize: '12px', fontWeight: 'medium', color: COLORS.onSurfaceVariant }}>
              {unit}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
