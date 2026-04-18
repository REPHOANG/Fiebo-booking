'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';

const mockData = [
  { name: 'Bóng đá', count: 40, color: '#006e2d' },
  { name: 'Cầu lông', count: 40, color: '#005ac2' },
  { name: 'Pickleball', count: 40, color: '#ff9800' },
  { name: 'Tennis', count: 40, color: '#2196f3' },
];

const COLORS = {
  white: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#6b7280',
  surfaceContainer: '#d3e4fe',
  bgLight: '#f5f5f5',
};

export default function FieldTypeChart() {
  return (
    <Card
      sx={{
        bgcolor: COLORS.white,
        border: `1px solid ${COLORS.surfaceContainer}`,
        borderRadius: 1,
        boxShadow: '0px 0px 24px rgba(11,28,48,0.06)',
        height: '100%',
      }}
    >
      <CardContent>
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: COLORS.onSurface,
            mb: 3,
          }}
        >
          Phân bổ loại sân
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {mockData.map((item) => (
            <Box
              key={item.name}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: COLORS.bgLight,
                p: 2,
                borderRadius: '8px',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 32,
                  borderRadius: '4px',
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />

              <Box>
                <Typography
                  sx={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: COLORS.onSurfaceVariant,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.5,
                  }}
                >
                  {item.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: COLORS.onSurface,
                  }}
                >
                  {item.count} sân
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
