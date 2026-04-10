import { Box, Card, CardContent, Chip, Typography } from '@mui/material';

export default function OwnerDashboardKpiCardV2({
  title,
  value,
  change,
  icon,
  tone = 'primary',
  subtitle,
}) {
  const Icon = icon;
  const hasChange = typeof change === 'number';
  const isPositive = Number(change || 0) >= 0;

  return (
    <Card className="od2-kpi-card" elevation={0}>
      <CardContent className="od2-kpi-content">
        <Box className="od2-kpi-head">
          <Box className={`od2-kpi-icon ${tone}`}>
            <Icon fontSize="small" />
          </Box>
          {hasChange && (
            <Chip
              size="small"
              className={`od2-chip ${isPositive ? 'up' : 'down'}`}
              label={`${isPositive ? '+' : ''}${Number(change).toFixed(1)}%`}
            />
          )}
        </Box>

        <Typography className="od2-kpi-title">{title}</Typography>
        <Typography className="od2-kpi-value">{value}</Typography>
        {subtitle ? <Typography className="od2-kpi-subtitle">{subtitle}</Typography> : null}
      </CardContent>
    </Card>
  );
}
