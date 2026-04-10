import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const KpiCard = ({ label, value, change, icon: Icon, colorClass }) => (
  <div className={`kpi-card ${colorClass}`}>
    <div className="kpi-header">
      <div className="kpi-content">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
      <div className="kpi-icon">
        <Icon />
      </div>
    </div>
    {change !== undefined && (
      <div className={`kpi-change ${change >= 0 ? 'positive' : 'negative'}`}>
        {change >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    )}
  </div>
);

export default KpiCard;
