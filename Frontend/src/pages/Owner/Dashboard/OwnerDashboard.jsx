import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	Box,
	Card,
	CardContent,
	LinearProgress,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from '@mui/material';
import { Button as AntButton, DatePicker, Select, message } from 'antd';
import dayjs from 'dayjs';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import {
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { getOwnerDashboard } from '../../../services/ownerService';
import { getOwnerVenueSelectOptions } from '../../../services/venueService';
import {
	aggregateOwnerDistributionData,
	EMPTY_OWNER_DASHBOARD,
	formatCompactVND,
	formatVND,
	mapOwnerDistributionData,
	mapOwnerTrendData,
	normalizeOwnerDashboard,
} from '../../../utils/helperFunction';
import './ownerDashboard.scss';
import ErrorPage from '../../../components/ui/Error/ErrorPage';
import OwnerDashboardKpiCardV2 from './components/OwnerDashboardKpiCardV2';

const CHART_COLORS = ['#7c3aed', '#fea619', '#007650', '#6b7280', '#ef4444', '#06b6d4'];
const MAX_DISTRIBUTION_ITEMS = 8;

export default function OwnerDashboardVer2() {
	const [trendMode, setTrendMode] = useState('revenue');
	const [distributionMode, setDistributionMode] = useState('bookings');
	const [filters, setFilters] = useState({
		fromDate: '',
		toDate: '',
		venueId: '',
	});
	const [appliedFilters, setAppliedFilters] = useState({
		fromDate: '',
		toDate: '',
		venueId: '',
	});

	const queryParams = useMemo(() => {
		const normalizedVenueId = String(appliedFilters.venueId || '').trim();
		const parsedVenueId = normalizedVenueId === '' ? undefined : Number(normalizedVenueId);

		return {
			fromDate: appliedFilters.fromDate || undefined,
			toDate: appliedFilters.toDate || undefined,
			venueId: Number.isInteger(parsedVenueId) ? parsedVenueId : undefined,
		};
	}, [appliedFilters]);

	const { data: venueOptions = [] } = useQuery({
		queryKey: ['owner-venue-select-options'],
		queryFn: getOwnerVenueSelectOptions,
		staleTime: 10 * 60 * 1000,
		cacheTime: 10 * 60 * 1000,
	});

	const {
		data: dashboardData = EMPTY_OWNER_DASHBOARD,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['owner-dashboard', queryParams],
		queryFn: async () => {
			const data = await getOwnerDashboard(queryParams);
			return normalizeOwnerDashboard(data);
		},
		staleTime: 5 * 60 * 1000,
		cacheTime: 5 * 60 * 1000,
	});

	const handleDateChange = (field) => (dateValue) => {
		setFilters((prev) => ({
			...prev,
			[field]: dateValue ? dateValue.format('YYYY-MM-DD') : '',
		}));
	};

	const handleVenueChange = (value) => {
		setFilters((prev) => ({
			...prev,
			venueId: value || '',
		}));
	};

	const isInvalidDateRange = useMemo(() => {
		if (!filters.fromDate || !filters.toDate) return false;
		return dayjs(filters.toDate).isBefore(dayjs(filters.fromDate), 'day');
	}, [filters.fromDate, filters.toDate]);

	const applyFilters = () => {
		if (isInvalidDateRange) {
			message.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
			return;
		}
		setAppliedFilters(filters);
	};

	const clearFilters = () => {
		const emptyFilters = { fromDate: '', toDate: '', venueId: '' };
		setFilters(emptyFilters);
		setAppliedFilters(emptyFilters);
	};

	const trendData = useMemo(
		() => mapOwnerTrendData(dashboardData, trendMode),
		[dashboardData, trendMode],
	);

	const distributionData = useMemo(
		() => mapOwnerDistributionData(dashboardData, distributionMode),
		[dashboardData, distributionMode],
	);

	const displayDistributionData = useMemo(
		() => aggregateOwnerDistributionData(distributionData, MAX_DISTRIBUTION_ITEMS, 'Khác'),
		[distributionData],
	);

	const distributionTotal = useMemo(
		() => displayDistributionData.reduce((sum, item) => sum + Number(item.value || 0), 0),
		[displayDistributionData],
	);

	const peakStart = dashboardData.peakTime?.startTime?.slice?.(0, 5) || '--:--';
	const peakEnd = dashboardData.peakTime?.endTime?.slice?.(0, 5) || '--:--';

    if(isError){
        return (<ErrorPage/>);
    }
	return (
		<Box className="owner-dashboard-v2">
			<Box className="od2-content">
				<Card className="od2-filter-card" elevation={0}>
					<CardContent>
						<Box className="od2-filter-head">
							<Typography className="od2-filter-title">Bộ lọc dữ liệu</Typography>
						</Box>

						<Box className="od2-filter-grid">
							<Box className="od2-filter-field">
								<Typography className="od2-filter-label">Từ ngày</Typography>
								<DatePicker
									className="od2-ant-control"
									value={filters.fromDate ? dayjs(filters.fromDate, 'YYYY-MM-DD') : null}
									onChange={handleDateChange('fromDate')}
									format="DD/MM/YYYY"
									allowClear
								/>
							</Box>
							<Box className="od2-filter-field">
								<Typography className="od2-filter-label">Đến ngày</Typography>
								<DatePicker
									className="od2-ant-control"
									value={filters.toDate ? dayjs(filters.toDate, 'YYYY-MM-DD') : null}
									onChange={handleDateChange('toDate')}
									disabledDate={(current) => (
										!!filters.fromDate
										&& !!current
										&& current.isBefore(dayjs(filters.fromDate, 'YYYY-MM-DD'), 'day')
									)}
									format="DD/MM/YYYY"
									allowClear
								/>
							</Box>
							<Box className="od2-filter-field">
								<Typography className="od2-filter-label">Cơ sở</Typography>
								<Select
									className="od2-ant-control"
									value={filters.venueId || undefined}
									onChange={handleVenueChange}
									allowClear
									placeholder="Tất cả cơ sở"
									options={venueOptions.map((venue) => ({
										value: String(venue.id),
										label: venue.name,
									}))}
								/>
							</Box>
							<Box className="od2-filter-actions">
								<Typography className="od2-filter-label od2-filter-label-hidden">Thao tác</Typography>
								<Box className="od2-filter-actions-row">
									<AntButton className="od2-btn-apply" type="primary" onClick={applyFilters} disabled={isInvalidDateRange}>Áp dụng</AntButton>
									<AntButton className="od2-btn-clear" onClick={clearFilters}>Xóa lọc</AntButton>
								</Box>
							</Box>
						</Box>
						{isInvalidDateRange && (
							<Typography className="od2-filter-error">
								Ngày kết thúc không được nhỏ hơn ngày bắt đầu.
							</Typography>
						)}
					</CardContent>
				</Card>

				<Box className="od2-kpi-grid">
					<OwnerDashboardKpiCardV2
						title="Tổng lượt đặt sân"
						value={Number(dashboardData.totalBookings || 0).toLocaleString('vi-VN')}
						change={dashboardData.bookingChangePercent}
						icon={CalendarMonthRoundedIcon}
						tone="primary"
					/>
					<OwnerDashboardKpiCardV2
						title="Tổng doanh thu"
						value={formatCompactVND(dashboardData.totalRevenue)}
						change={dashboardData.revenueChangePercent}
						icon={PaymentsRoundedIcon}
						tone="secondary"
					/>
					<OwnerDashboardKpiCardV2
						title="Tỉ lệ hoàn thành"
						value={`${Number(dashboardData.completionRate || 0).toFixed(1)}%`}
						icon={TrendingUpRoundedIcon}
						tone="success"
						subtitle="Đơn đã hoàn tất"
					/>
					<OwnerDashboardKpiCardV2
						title="Tỉ lệ hủy lịch"
						value={`${Number(dashboardData.cancellationRate || 0).toFixed(1)}%`}
						icon={TrendingDownRoundedIcon}
						tone="danger"
						subtitle="Đơn bị hủy"
					/>
					<OwnerDashboardKpiCardV2
						title="Khung giờ cao điểm"
						value={`${peakStart} - ${peakEnd}`}
						icon={AccessTimeRoundedIcon}
						tone="muted"
						subtitle={`${Number(dashboardData.peakTime?.bookingCount || 0).toLocaleString('vi-VN')} lượt đặt`}
					/>
				</Box>

				<Card className="od2-chart-card" elevation={0}>
					<CardContent>
						<Box className="od2-chart-head">
							<Box>
								<Typography className="od2-chart-title">Xu hướng hiệu suất</Typography>
							</Box>
							<ToggleButtonGroup
								color="primary"
								exclusive
								size="small"
								value={trendMode}
								onChange={(_, value) => value && setTrendMode(value)}
							>
								<ToggleButton value="revenue">Doanh thu</ToggleButton>
								<ToggleButton value="bookings">Lượt đặt</ToggleButton>
							</ToggleButtonGroup>
						</Box>

						<Box className="od2-trend-chart-wrap">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 18 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e1e3e4" vertical={false} />
									<XAxis
										dataKey="date"
										tick={{ fill: '#6b7280', fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										interval={Math.max(Math.floor(trendData.length / 7), 0)}
									/>
									<YAxis
										tick={{ fill: '#6b7280', fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										tickFormatter={(value) => (
											trendMode === 'revenue'
												? formatCompactVND(value)
												: Number(value || 0).toLocaleString('vi-VN')
										)}
									/>
									<Tooltip
										cursor={{ fill: 'rgba(124,58,237,0.08)' }}
										contentStyle={{
											borderRadius: 12,
											border: '1px solid #d8c7f8',
											boxShadow: '0 10px 20px rgba(65, 23, 120, 0.08)',
										}}
										formatter={(value) => (
											trendMode === 'revenue'
												? formatVND(Number(value || 0))
												: `${Number(value || 0).toLocaleString('vi-VN')} lượt`
										)}
										labelFormatter={(label) => `Ngày: ${label}`}
									/>
									<Line
										type="monotone"
										dataKey="value"
										name={trendMode === 'revenue' ? 'Doanh thu' : 'Lượt đặt'}
										stroke={trendMode === 'revenue' ? '#7c3aed' : '#007650'}
										strokeWidth={3}
										dot={false}
										activeDot={{ r: 5 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						</Box>
					</CardContent>
				</Card>

				<Card className="od2-chart-card" elevation={0}>
					<CardContent>
						<Box className="od2-chart-head">
							<Box>
								<Typography className="od2-chart-title">Phân bổ theo cơ sở</Typography>
							</Box>
							<ToggleButtonGroup
								color="primary"
								exclusive
								size="small"
								value={distributionMode}
								onChange={(_, value) => value && setDistributionMode(value)}
							>
								<ToggleButton value="bookings">Lượt đặt</ToggleButton>
								<ToggleButton value="revenue">Doanh thu</ToggleButton>
							</ToggleButtonGroup>
						</Box>

						<Box className="od2-distribution-grid">
							<Box className="od2-donut-wrap">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart rootTabIndex={-1}>
										<Pie
											data={displayDistributionData}
											dataKey="value"
											nameKey="name"
											rootTabIndex={-1}
											innerRadius={78}
											outerRadius={118}
											paddingAngle={2}
											strokeWidth={0}
										>
											{displayDistributionData.map((item, idx) => (
												<Cell
													key={`${item.name}-${idx}`}
													fill={CHART_COLORS[idx % CHART_COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip
											formatter={(value) => (
												distributionMode === 'revenue'
													? formatVND(Number(value || 0))
													: Number(value || 0).toLocaleString('vi-VN')
											)}
											labelFormatter={(label) => `Sân: ${label}`}
										/>
									</PieChart>
								</ResponsiveContainer>

								<Box className="od2-donut-center">
									<Typography className="od2-total-value">
										{distributionMode === 'revenue'
											? formatCompactVND(distributionTotal)
											: Number(distributionTotal || 0).toLocaleString('vi-VN')}
									</Typography>
									<Typography className="od2-total-label">
										{distributionMode === 'revenue' ? 'Tổng doanh thu' : 'Tổng lượt đặt'}
									</Typography>
								</Box>
							</Box>

							<Box className="od2-legend-wrap">
								{displayDistributionData.map((item, idx) => {
									const percent = distributionTotal > 0
										? Math.round((Number(item.value || 0) / distributionTotal) * 100)
										: 0;
									const displayValue = distributionMode === 'revenue'
										? formatVND(Number(item.value || 0))
										: `${Number(item.value || 0).toLocaleString('vi-VN')} lượt`;

									return (
										<Box className="od2-legend-item" key={`${item.name}-${idx}`}>
											<Box className="od2-legend-row">
												<Box className="od2-legend-left">
													<span
														className="od2-color-dot"
														style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
													/>
													<Box>
														<Typography className="od2-legend-name" title={item.name}>{item.name}</Typography>
														<Typography className="od2-legend-value" title={displayValue}>{displayValue}</Typography>
													</Box>
												</Box>
												<Typography className="od2-legend-percent">{percent}%</Typography>
											</Box>
											<LinearProgress
												variant="determinate"
												value={percent}
												className="od2-progress"
												sx={{
													'& .MuiLinearProgress-bar': {
														backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
													},
												}}
											/>
										</Box>
									);
								})}
							</Box>
						</Box>
					</CardContent>
				</Card>

				{isLoading && <Typography className="od2-loading">Đang tải dữ liệu bảng điều khiển...</Typography>}
				{!isLoading && !displayDistributionData.length && (
					<Box className="od2-empty">
						<StadiumRoundedIcon fontSize="small" />
						<Typography>Chưa có dữ liệu phân bổ sân trong khoảng thời gian này.</Typography>
					</Box>
				)}
			</Box>
		</Box>
	);
}
