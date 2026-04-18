import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Select as AntdSelect } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { getOwners } from "../../../services/adminService";
import "../FinanceAdminManagement/FinanceAdminManagement.css";

const KYC_STATUS_OPTIONS = [
  { value: "", label: "Trạng thái KYC: Tất cả" },
  { value: "Verified", label: "Đã xác minh" },
  { value: "PendingKYC", label: "Chờ xác minh KYC" },
  { value: "Rejected", label: "Bị từ chối" },
];

const kycStyle = {
  Verified: { label: "Đã xác minh", bg: "#dcfce7", color: "#166534" },
  PendingKYC: { label: "Chờ xác minh KYC", bg: "#fef9c3", color: "#854d0e" },
  "Pending KYC": { label: "Chờ xác minh KYC", bg: "#fef9c3", color: "#854d0e" },
  Rejected: { label: "Bị từ chối", bg: "#fee2e2", color: "#991b1b" },
};

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const PAGE_SIZE = 10;

const AdminOwners = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 2000);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    searchTerm: debouncedSearch.trim() || undefined,
    kycStatus: kycFilter || undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminOwners", queryParams],
    queryFn: () => getOwners(queryParams),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const owners = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleKycChange = (value) => {
    setKycFilter(value);
    setPage(1);
  };

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
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: { xs: 26, md: 34 },
            fontWeight: 800,
            color: "#191c1d",
            letterSpacing: -0.6,
          }}
        >
          Hồ sơ chủ sân
        </Typography>
        {!isLoading && (
          <Typography sx={{ color: "#7b7487", fontSize: 14 }}>
            {totalItems} chủ sân
          </Typography>
        )}
      </Box>

      <Stack spacing={1.75} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: "#7b7487" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "#e1e3e4",
            },
          }}
        />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ maxWidth: 360 }}>
          <FilterListRoundedIcon sx={{ color: "#7b7487" }} />
          <AntdSelect
            className="finance-admin-select"
            popupClassName="finance-admin-select-dropdown"
            value={kycFilter}
            onChange={handleKycChange}
            style={{ width: "100%" }}
            options={KYC_STATUS_OPTIONS}
          />
        </Stack>
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || error?.message || "Không thể tải danh sách chủ sân."}
        </Alert>
      )}

      {isLoading ? (
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={18} />
            <Typography sx={{ color: "#4a4455" }}>Đang tải danh sách chủ sân...</Typography>
          </Stack>
        </Card>
      ) : (
        <>
          <Stack spacing={2}>
            {owners.map((item) => {
              const rawStatus = item.kycStatus ?? item.status ?? "";
              const st = kycStyle[rawStatus] ?? { label: rawStatus || "Không rõ", bg: "#f1f5f9", color: "#475569" };
              const name = item.fullName ?? item.name ?? item.ownerName ?? "";
              const venueCount = item.venueCount ?? item.soVenue ?? item.numberOfVenues ?? item.venues ?? 0;

              return (
                <Card
                  key={item.id ?? item.ownerId}
                  onClick={() => navigate(`/admin/owners/${item.id ?? item.ownerId}`)}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    position: "relative",
                    overflow: "visible",
                    cursor: "pointer",
                    transition: "box-shadow 0.18s ease, transform 0.18s ease",
                    "&:hover": {
                      boxShadow: "0 12px 32px rgba(59,130,246,0.14)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Chip
                    label={st.label}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      fontWeight: 700,
                      color: st.color,
                      backgroundColor: st.bg,
                    }}
                  />

                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 14 }}>
                    <Avatar
                      sx={{
                        width: 46,
                        height: 46,
                        fontWeight: 800,
                        color: "#0f5132",
                        backgroundColor: "#d1fae5",
                      }}
                    >
                      {getInitials(name)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#191c1d", fontSize: 18 }}>
                        {name || "Chưa có tên"}
                      </Typography>
                      {(item.id ?? item.ownerId) && (
                        <Typography sx={{ fontSize: 12, color: "#7b7487" }}>
                          {item.id ?? item.ownerId}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  <Stack spacing={1.15} sx={{ mt: 2.2, pt: 1.4, borderTop: "1px solid #e1e3e4" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.8, sm: 3 }}>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <MailOutlineRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {item.email || "-"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <PhoneRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {item.phoneNumber ?? item.phone ?? "-"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <StorefrontRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {venueCount} sân
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}

            {owners.length === 0 && (
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Typography sx={{ color: "#4a4455" }}>
                  Không tìm thấy chủ sân phù hợp bộ lọc đã chọn.
                </Typography>
              </Card>
            )}
          </Stack>

          {totalPages > 1 && (
            <Stack alignItems="center" sx={{ mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

export default AdminOwners;
