'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const mockData = [
  { name: 'Cao Cấp', value: 50 },
  { name: 'Phổ Thông', value: 50 },
];

const COLORS = ['#006e2d', '#005ac2'];

const STYLE_COLORS = {
  white: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#6b7280',
  surfaceContainer: '#d3e4fe',
};

export default function ServicePlanChart() {
  return (
    <Card
      sx={{
        bgcolor: STYLE_COLORS.white,
        border: `1px solid ${STYLE_COLORS.surfaceContainer}`,
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
            color: STYLE_COLORS.onSurface,
            mb: 3,
          }}
        >
          Phân bổ gói dịch vụ
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Pie Chart */}
          <Box sx={{ width: 120, height: 120, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {mockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${STYLE_COLORS.surfaceContainer}`,
                    boxShadow: '0 2px 8px rgba(11, 28, 48, 0.1)',
                    bgcolor: STYLE_COLORS.white,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mockData.map((item, index) => (
              <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '2px',
                    bgcolor: COLORS[index],
                  }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: STYLE_COLORS.onSurfaceVariant,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: STYLE_COLORS.onSurface,
                    }}
                  >
                    {item.value}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
