import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Button as AntButton, DatePicker, message } from "antd";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import StadiumRoundedIcon from "@mui/icons-material/StadiumRounded";
import dayjs from "dayjs";
import "./adminDashboard.scss";

import { getAdminDashboard } from "../../../services/adminService";
import OwnerDashboardKpiCardV2 from "./../../Owner/Dashboard/components/OwnerDashboardKpiCardV2";

const COLORS = ["#7c3aed", "#fea619", "#007650", "#ef4444", "#06b6d4"];
const MAX_ITEMS = 6;

export default function AdminDashboard() {
  const [mode, setMode] = useState("booking");

  // ===== FILTER =====
  const [filters, setFilters] = useState({ fromDate: "", toDate: "" });
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  const queryParams = useMemo(
    () => ({
      fromDate: appliedFilters.fromDate || undefined,
      toDate: appliedFilters.toDate || undefined,
    }),
    [appliedFilters],
  );

  const handleDateChange = (field) => (dateValue) => {
    setFilters((prev) => ({
      ...prev,
      [field]: dateValue ? dateValue.format("YYYY-MM-DD") : "",
    }));
  };

  const isInvalidDateRange = useMemo(() => {
    if (!filters.fromDate || !filters.toDate) return false;
    return dayjs(filters.toDate).isBefore(dayjs(filters.fromDate), "day");
  }, [filters]);

  const applyFilters = () => {
    if (isInvalidDateRange) {
      message.error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
      return;
    }
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const empty = { fromDate: "", toDate: "" };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  // ===== QUERY =====
  const { data: dashboard = {}, isLoading } = useQuery({
    queryKey: ["admin-dashboard", queryParams],
    queryFn: () => getAdminDashboard(queryParams),
  });

  // ===== KPI =====
  const totalRevenue = dashboard.totalRevenue?.value || 0;
  const totalBookings = dashboard.totalBookings?.value || 0;
  const newOwners = dashboard.newFieldOwners?.value || 0;
  const activeVenues = dashboard.activeVenues?.value || 0;
  const totalVenues = dashboard?.totalRegisteredVenues || 0;

  // ===== LINE =====
  const lineData = useMemo(() => {
    return (dashboard.dailyPerformance || []).map((item) => ({
      date: dayjs(item.date).format("DD/MM"),
      booking: item.bookingCount,
      user: item.newUserCount,
    }));
  }, [dashboard]);

  // ===== PIE RAW =====
  const planData = useMemo(
    () =>
      (dashboard.planDistribution || []).map((i) => ({
        name: i.planName,
        value: i.count,
      })),
    [dashboard],
  );

  const fieldData = useMemo(
    () =>
      (dashboard.fieldDistribution || []).map((i) => ({
        name: i.sportTypeName,
        value: i.fieldCount,
      })),
    [dashboard],
  );

  // ===== HELPERS =====
  const aggregate = (data) => {
    if (data.length <= MAX_ITEMS) return data;
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const main = sorted.slice(0, MAX_ITEMS);
    const rest = sorted.slice(MAX_ITEMS);
    const other = rest.reduce((sum, i) => sum + i.value, 0);
    return [...main, { name: "Khác", value: other }];
  };

  const getTotal = (data) =>
    data.reduce((sum, i) => sum + Number(i.value || 0), 0);

  const displayPlan = aggregate(planData);
  const displayField = aggregate(fieldData);

  const planTotal = getTotal(displayPlan);
  const fieldTotal = getTotal(displayField);

  return (
    <Box className="admin-dashboard">
      <Box className="od2-content">
        <Card className="od2-filter-card" elevation={0}>
          <CardContent>
            <Box className="od2-filter-head">
              <Typography className="od2-filter-title">
                Bộ lọc dữ liệu
              </Typography>
            </Box>

            <Box className="od2-filter-grid">
              <Box className="od2-filter-field">
                <Typography className="od2-filter-label">Từ ngày</Typography>
                <DatePicker
                  className="od2-ant-control"
                  value={
                    filters.fromDate
                      ? dayjs(filters.fromDate, "YYYY-MM-DD")
                      : null
                  }
                  onChange={handleDateChange("fromDate")}
                  format="DD/MM/YYYY"
                  allowClear
                />
              </Box>
              <Box className="od2-filter-field">
                <Typography className="od2-filter-label">Đến ngày</Typography>
                <DatePicker
                  className="od2-ant-control"
                  value={
                    filters.toDate ? dayjs(filters.toDate, "YYYY-MM-DD") : null
                  }
                  onChange={handleDateChange("toDate")}
                  disabledDate={(current) =>
                    !!filters.fromDate &&
                    !!current &&
                    current.isBefore(
                      dayjs(filters.fromDate, "YYYY-MM-DD"),
                      "day",
                    )
                  }
                  format="DD/MM/YYYY"
                  allowClear
                />
              </Box>
              <Box className="od2-filter-actions">
                <Typography className="od2-filter-label od2-filter-label-hidden">
                  Thao tác
                </Typography>
                <Box className="od2-filter-actions-row">
                  <AntButton
                    className="od2-btn-apply"
                    type="primary"
                    onClick={applyFilters}
                    disabled={isInvalidDateRange}
                  >
                    Áp dụng
                  </AntButton>
                  <AntButton className="od2-btn-clear" onClick={clearFilters}>
                    Xóa lọc
                  </AntButton>
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

        {/* KPI */}
        <Box className="od2-kpi-grid">
          <OwnerDashboardKpiCardV2
            title="Tổng doanh thu"
            value={totalRevenue.toLocaleString("vi-VN") + "đ"}
            icon={PaymentsRoundedIcon}
            tone="secondary"
          />
          <OwnerDashboardKpiCardV2
            title="Tổng lượt đặt"
            value={totalBookings.toLocaleString("vi-VN")}
            icon={CalendarMonthRoundedIcon}
            tone="primary"
          />
          <OwnerDashboardKpiCardV2
            title="Chủ sân mới"
            value={newOwners}
            icon={GroupAddRoundedIcon}
            tone="success"
          />
          <OwnerDashboardKpiCardV2
            title="Cơ sở đang hoạt động"
            value={activeVenues}
            icon={StadiumRoundedIcon}
            tone="success"
          />
          <OwnerDashboardKpiCardV2
            title="Tổng số cơ sở"
            value={totalVenues}
            icon={StadiumRoundedIcon}
            tone="primary"
          />
        </Box>

        {/* LINE */}
        <Card className="od2-chart-card">
          <CardContent>
            <Box className="od2-chart-head">
              <Typography className="od2-chart-title">
                Hiệu suất theo ngày
              </Typography>

              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, v) => v && setMode(v)}
                size="small"
              >
                <ToggleButton value="booking">Lượt đặt</ToggleButton>
                <ToggleButton value="user">Người dùng mới</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <div className="od2-trend-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey={mode} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PLAN PIE */}
        <Card className="od2-chart-card">
          <CardContent>
            <Typography className="od2-chart-title">Phân bổ gói</Typography>

            <Box className="od2-distribution-grid">
              <Box className="od2-donut-wrap">
                <ResponsiveContainer height={250}>
                  <PieChart>
                    <Pie
                      data={displayPlan}
                      dataKey="value"
                      innerRadius={70}
                      outerRadius={110}
                    >
                      {displayPlan.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <Box className="od2-donut-center">
                  <Typography className="od2-total-value">
                    {planTotal.toLocaleString("vi-VN")}
                  </Typography>
                  <Typography className="od2-total-label">Tổng</Typography>
                </Box>
              </Box>

              <Box className="od2-legend-wrap">
                {displayPlan.map((item, i) => {
                  const percent = planTotal
                    ? Math.round((item.value / planTotal) * 100)
                    : 0;
                  return (
                    <Box key={i} className="od2-legend-item">
                      <Box className="od2-legend-row">
                        <Box className="od2-legend-left">
                          <span
                            className="od2-color-dot"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <Box>
                            <Typography>{item.name}</Typography>
                            <Typography>
                              {item.value.toLocaleString("vi-VN")}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography>{percent}%</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* FIELD PIE */}
        <Card className="od2-chart-card">
          <CardContent>
            <Typography className="od2-chart-title">
              Phân bổ loại sân
            </Typography>

            <Box className="od2-distribution-grid">
              <Box className="od2-donut-wrap">
                <ResponsiveContainer height={250}>
                  <PieChart>
                    <Pie
                      data={displayField}
                      dataKey="value"
                      innerRadius={70}
                      outerRadius={110}
                    >
                      {displayField.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <Box className="od2-donut-center">
                  <Typography className="od2-total-value">
                    {fieldTotal.toLocaleString("vi-VN")}
                  </Typography>
                  <Typography className="od2-total-label">Tổng</Typography>
                </Box>
              </Box>

              <Box className="od2-legend-wrap">
                {displayField.map((item, i) => {
                  const percent = fieldTotal
                    ? Math.round((item.value / fieldTotal) * 100)
                    : 0;
                  return (
                    <Box key={i} className="od2-legend-item">
                      <Box className="od2-legend-row">
                        <Box className="od2-legend-left">
                          <span
                            className="od2-color-dot"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <Box>
                            <Typography>{item.name}</Typography>
                            <Typography>
                              {item.value.toLocaleString("vi-VN")}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography>{percent}%</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {isLoading && (
          <Typography className="od2-loading">Đang tải dữ liệu...</Typography>
        )}
      </Box>
    </Box>
  );
}
