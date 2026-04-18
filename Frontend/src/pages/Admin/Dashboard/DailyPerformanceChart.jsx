'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: '11/04', bookings: 45, users: 120 },
  { date: '12/04', bookings: 52, users: 128 },
  { date: '13/04', bookings: 48, users: 125 },
  { date: '14/04', bookings: 61, users: 135 },
  { date: '15/04', bookings: 55, users: 130 },
  { date: '16/04', bookings: 67, users: 142 },
  { date: '17/04', bookings: 72, users: 148 },
  { date: '18/04', bookings: 70, users: 145 },
];

const COLORS = {
  white: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#6b7280',
  surfaceContainer: '#d3e4fe',
  primary: '#006e2d',
  secondary: '#005ac2',
  outline: '#bccbb9',
};

export default function DailyPerformanceChart() {
  return (
    <Card
      sx={{
        bgcolor: COLORS.white,
        border: `1px solid ${COLORS.surfaceContainer}`,
        borderRadius: 1,
        boxShadow: '0px 0px 24px rgba(11,28,48,0.06)',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: COLORS.onSurface,
            }}
          >
            Hiệu suất hàng ngày
          </Typography>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: COLORS.primary,
                }}
              />
              <Typography sx={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bookings
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: COLORS.secondary,
                }}
              />
              <Typography sx={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Users
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="4" stroke={COLORS.outline} opacity={0.2} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: COLORS.onSurfaceVariant, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(Math.floor(mockData.length / 7), 0)}
              />
              <YAxis
                tick={{ fill: COLORS.onSurfaceVariant, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 110, 45, 0.08)' }}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${COLORS.surfaceContainer}`,
                  boxShadow: '0 4px 12px rgba(11, 28, 48, 0.1)',
                  bgcolor: COLORS.white,
                }}
                formatter={(value) => value}
                labelFormatter={(label) => `Ngày ${label}`}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke={COLORS.primary}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
                name="Bookings"
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke={COLORS.secondary}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
                name="Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
