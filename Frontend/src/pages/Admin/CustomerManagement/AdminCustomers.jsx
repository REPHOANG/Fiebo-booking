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
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { getCustomers } from "../../../services/adminService";
import "../FinanceAdminManagement/FinanceAdminManagement.css";

const STATUS_OPTIONS = [
  { value: "", label: "Trạng thái: Tất cả" },
  { value: "1", label: "Trạng thái: Đang hoạt động" },
  { value: "0", label: "Trạng thái: Không hoạt động" },
  { value: "-1", label: "Trạng thái: Bị cấm" },
];

const statusStyle = {
  1: { label: "Đang hoạt động", bg: "#dcfce7", color: "#166534" },
  0: { label: "Không hoạt động", bg: "#fef9c3", color: "#854d0e" },
  "-1": { label: "Bị cấm", bg: "#fee2e2", color: "#991b1b" },
};

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const PAGE_SIZE = 10;

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 2000);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    searchTerm: debouncedSearch.trim() || undefined,
    status: statusFilter !== "" ? Number(statusFilter) : undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  };

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["adminCustomers", queryParams],
    queryFn: () => getCustomers(queryParams),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const customers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
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
          Quản lý khách hàng
        </Typography>
        {!isLoading && (
          <Typography sx={{ color: "#7b7487", fontSize: 14 }}>
            {totalItems} khách hàng
          </Typography>
        )}
      </Box>

      <Stack spacing={1.75} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Tìm theo tên, email, số điện thoại hoặc tên đăng nhập..."
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
            value={statusFilter}
            onChange={handleStatusChange}
            style={{ width: "100%" }}
            options={STATUS_OPTIONS}
          />
        </Stack>
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || error?.message || "Không thể tải danh sách khách hàng."}
        </Alert>
      )}

      {isLoading ? (
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={18} />
            <Typography sx={{ color: "#4a4455" }}>Đang tải danh sách khách hàng...</Typography>
          </Stack>
        </Card>
      ) : (
        <>
          <Stack spacing={2}>
            {customers.map((item) => {
              const st = statusStyle[String(item.status)] || statusStyle[0];
              return (
                <Card
                  key={item.id}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    position: "relative",
                    overflow: "visible",
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

                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 11 }}>
                    <Avatar
                      sx={{
                        width: 46,
                        height: 46,
                        fontWeight: 800,
                        color: "#0369a1",
                        backgroundColor: "#e0f2fe",
                      }}
                    >
                      {getInitials(item.fullName)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#191c1d", fontSize: 18 }}>
                        {item.fullName || "Chưa có tên"}
                      </Typography>
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
                          {item.phoneNumber || "-"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}

            {customers.length === 0 && (
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Typography sx={{ color: "#4a4455" }}>
                  Không tìm thấy khách hàng phù hợp bộ lọc đã chọn.
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

export default AdminCustomers;

