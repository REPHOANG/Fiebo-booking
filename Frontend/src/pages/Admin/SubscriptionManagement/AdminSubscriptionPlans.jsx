import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import { getOwnerSubscriptionPlans } from "../../../services/subscriptionService";
import "../FinanceAdminManagement/FinanceAdminManagement.css";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

const PLAN_COLORS = [
  { bg: "#ede0ff", color: "#630ed4" },
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#fef9c3", color: "#854d0e" },
  { bg: "#fee2e2", color: "#991b1b" },
];

const AdminSubscriptionPlans = () => {
  const { data: plans = [], isLoading, isError, error } = useQuery({
    queryKey: ["adminSubscriptionPlans"],
    queryFn: getOwnerSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <Box
      className="finance-admin-page"
      sx={{
        px: { xs: 2, md: 3 },
        pb: 6,
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily: "Be Vietnam Pro, sans-serif",
        "&, & *": { fontFamily: "Be Vietnam Pro, sans-serif" },
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: { xs: 26, md: 34 },
            fontWeight: 800,
            color: "#191c1d",
            letterSpacing: -0.6,
          }}
        >
          Quản lý gói đăng ký
        </Typography>
        {!isLoading && (
          <Typography sx={{ color: "#7b7487", fontSize: 14 }}>
            {plans.length} gói hiện có
          </Typography>
        )}
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || error?.message || "Không thể tải danh sách gói."}
        </Alert>
      )}

      {isLoading ? (
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={18} />
            <Typography sx={{ color: "#4a4455" }}>Đang tải danh sách gói...</Typography>
          </Stack>
        </Card>
      ) : (
        <Stack spacing={2}>
          {plans.map((plan, index) => {
            const palette = PLAN_COLORS[index % PLAN_COLORS.length];
            return (
              <Card
                key={plan.id}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                  position: "relative",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      fontWeight: 800,
                      color: palette.color,
                      backgroundColor: palette.bg,
                      fontSize: 16,
                    }}
                  >
                    {String(plan.name || "").charAt(0).toUpperCase() || "G"}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: "#191c1d", fontSize: 18 }}>
                      {plan.name}
                    </Typography>
                    <Typography sx={{ color: "#7b7487", fontSize: 12 }}>
                      ID: {plan.id}
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 0.8, sm: 3 }}
                  sx={{ mt: 2.2, pt: 1.4, borderTop: "1px solid #e1e3e4" }}
                >
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <PaidRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                    <Typography sx={{ color: "#4a4455", fontSize: 14, fontWeight: 600 }}>
                      {formatPrice(plan.price)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <CalendarMonthRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                    <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                      {plan.durationDays} ngày
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            );
          })}

          {plans.length === 0 && (
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography sx={{ color: "#4a4455" }}>
                Chưa có gói đăng ký nào trong hệ thống.
              </Typography>
            </Card>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default AdminSubscriptionPlans;
