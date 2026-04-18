import React, { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Select as AntdSelect } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import SortRoundedIcon from "@mui/icons-material/SortRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CreateFinanceAdminForm from "./CreateFinanceAdminForm";
import { createFinanceAdmin, getFinanceAdmins, resetFinanceAdminPassword } from "../../../services/adminService";
import { formatDateTime } from "../../../utils/helperFunction";
import "./FinanceAdminManagement.css";

const statusStyle = {
  active: { label: "Đang hoạt động", bg: "#dcfce7", color: "#166534" },
  inactive: { label: "Vô hiệu hóa", bg: "#fee2e2", color: "#991b1b" },
};



const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const FinanceAdminManagement = () => {
  const queryClient = useQueryClient();
  const [statusOverrides, setStatusOverrides] = useState({});
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdDesc");
  const [openCreate, setOpenCreate] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState(null);

  const {
    data: apiAccounts = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["financeAdmins"],
    queryFn: getFinanceAdmins,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (list) => {
      const createdAt = new Date().toISOString();
      return (Array.isArray(list) ? list : []).map((item) => ({
        id: item?.id ?? item?.Id ?? "",
        name: item?.fullName || item?.FullName || "Chưa có tên",
        email: item?.username || item?.Username || "-",
        phone: "-",
        createdAt,
        status:
          String(item?.status || item?.Status || "")
            .trim()
            .toLowerCase() === "active"
            ? "active"
            : "inactive",
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: createFinanceAdmin,
    onSuccess: async () => {
      toast.success("Tạo tài khoản Finance Admin thành công!");
      setOpenCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["financeAdmins"] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => resetFinanceAdminPassword(id),
    onSuccess: (data) => {
      setResetPasswordResult(data?.TempPassword ?? data?.tempPassword ?? "");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Reset mật khẩu thất bại."
      );
    },
  });

  const accounts = useMemo(() => {
    return apiAccounts.map((item) => {
      const overriddenStatus = statusOverrides[item.id];
      return overriddenStatus ? { ...item, status: overriddenStatus } : item;
    });
  }, [apiAccounts, statusOverrides]);

  const filteredAccounts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    let next = accounts.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      const createdTime = toDate(item.createdAt).getTime();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const matchesDate =
        dateFilter === "all"
          ? true
          : dateFilter === "30d"
            ? now - createdTime <= 30 * day
            : now - createdTime <= 90 * day;

      return matchesSearch && matchesStatus && matchesDate;
    });

    next = [...next].sort((a, b) => {
      if (sortBy === "nameAsc") return a.name.localeCompare(b.name);
      if (sortBy === "nameDesc") return b.name.localeCompare(a.name);
      if (sortBy === "createdAsc")
        return toDate(a.createdAt) - toDate(b.createdAt);
      return toDate(b.createdAt) - toDate(a.createdAt);
    });

    return next;
  }, [accounts, dateFilter, deferredSearch, sortBy, statusFilter]);

  const toggleAccountStatus = (id) => {
    setStatusOverrides((prev) => {
      const target = accounts.find((item) => item.id === id);
      if (!target) return prev;

      const currentStatus = prev[id] || target.status;
      const nextStatus = currentStatus === "active" ? "inactive" : "active";
      return { ...prev, [id]: nextStatus };
    });
  };

  const handleCreate = (payload) => {
    createMutation.mutate(payload);
  };

  return (
    <Box
      className="finance-admin-page"
      sx={{
        px: { xs: 2, md: 3 },
        pb: 12,
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily: "Be Vietnam Pro, sans-serif",
        "&, & *": {
          fontFamily: "Be Vietnam Pro, sans-serif",
        },
      }}
    >
      <Box>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              fontSize: { xs: 26, md: 34 },
              fontWeight: 800,
              color: "#191c1d",
              letterSpacing: -0.6,
            }}
          >
            Quản lý nhân viên tài chính
          </Typography>
        </Box>

        <Stack spacing={1.75} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%" }}
            >
              <FilterListRoundedIcon sx={{ color: "#7b7487" }} />
              <AntdSelect
                className="finance-admin-select"
                popupClassName="finance-admin-select-dropdown"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: "100%" }}
                options={[
                  { value: "all", label: "Trạng thái: Tất cả" },
                  { value: "active", label: "Trạng thái: Đang hoạt động" },
                  { value: "inactive", label: "Trạng thái: Ngừng hoạt động" },
                ]}
              />
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%" }}
            >
              <CalendarTodayRoundedIcon sx={{ color: "#7b7487" }} />
              <AntdSelect
                className="finance-admin-select"
                popupClassName="finance-admin-select-dropdown"
                value={dateFilter}
                onChange={setDateFilter}
                style={{ width: "100%" }}
                options={[
                  { value: "all", label: "Ngày tạo: Tất cả" },
                  { value: "30d", label: "Ngày tạo: 30 ngày gần đây" },
                  { value: "90d", label: "Ngày tạo: 90 ngày gần đây" },
                ]}
              />
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%" }}
            >
              <SortRoundedIcon sx={{ color: "#7b7487" }} />
              <AntdSelect
                className="finance-admin-select"
                popupClassName="finance-admin-select-dropdown"
                value={sortBy}
                onChange={setSortBy}
                style={{ width: "100%" }}
                options={[
                  { value: "createdDesc", label: "Sắp xếp: Mới nhất" },
                  { value: "createdAsc", label: "Sắp xếp: Cũ nhất" },
                  { value: "nameAsc", label: "Sắp xếp: Tên A-Z" },
                  { value: "nameDesc", label: "Sắp xếp: Tên Z-A" },
                ]}
              />
            </Stack>
          </Stack>
        </Stack>

        {isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {queryError?.response?.data?.message ||
              queryError?.message ||
              "Không thể tải danh sách Finance Admin. Vui lòng thử lại sau."}
          </Alert>
        ) : null}

        {createMutation.isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {createMutation.error?.response?.data?.message ||
              createMutation.error?.message ||
              "Không thể tạo Finance Admin. Vui lòng kiểm tra dữ liệu và thử lại."}
          </Alert>
        ) : null}

        {loading ? (
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <CircularProgress size={18} />
              <Typography sx={{ color: "#4a4455" }}>
                Đang tải danh sách Finance Admin...
              </Typography>
            </Stack>
          </Card>
        ) : (
        <Stack spacing={2}>
          {filteredAccounts.map((item) => {
            const style = statusStyle[item.status] || statusStyle.inactive;
            const muted = item.status === "inactive";

            return (
              <Card
                key={item.id}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                  opacity: muted ? 0.75 : 1,
                  position: "relative",
                  overflow: "visible",
                }}
              >
                <Chip
                  label={style.label}
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    fontWeight: 700,
                    color: style.color,
                    backgroundColor: style.bg,
                  }}
                />

                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ pr: 11 }}
                >
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      fontWeight: 800,
                      color: "#630ed4",
                      backgroundColor: "#ede0ff",
                    }}
                  >
                    {getInitials(item.name)}
                  </Avatar>
                  <Box>
                    <Typography
                      sx={{ fontWeight: 800, color: "#191c1d", fontSize: 18 }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  spacing={1.15}
                  sx={{ mt: 2.2, pt: 1.4, borderTop: "1px solid #e1e3e4" }}
                >
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <MailOutlineRoundedIcon
                      sx={{ color: "#7b7487", fontSize: 18 }}
                    />
                    <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                      {item.email}
                    </Typography>
                  </Stack>

                  <Stack
                    direction={"row"}
                    sx={{
                      width: "100%",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Stack direction="row" spacing={1.1} alignItems="center">
                      <HistoryRoundedIcon
                        sx={{ color: "#7b7487", fontSize: 18 }}
                      />
                      <Typography sx={{ color: "#4a4455", fontSize: 12 }}>
                        Tạo lúc: {formatDateTime(item.createdAt)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Tooltip title="Reset mật khẩu">
                        <span>
                          <IconButton
                            size="small"
                            disabled={resetPasswordMutation.isPending}
                            onClick={() => resetPasswordMutation.mutate(item.id)}
                            sx={{ color: "#7b7487" }}
                          >
                            <LockResetRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Switch
                        checked={item.status === "active"}
                        onChange={() => toggleAccountStatus(item.id)}
                        color="success"
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </Card>
            );
          })}

          {filteredAccounts.length === 0 ? (
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography sx={{ color: "#4a4455" }}>
                Không tìm thấy tài khoản phù hợp bộ lọc đã chọn.
              </Typography>
            </Card>
          ) : null}
        </Stack>
        )}
      </Box>

      <Button
        variant="contained"
        onClick={() => setOpenCreate(true)}
        startIcon={<PersonAddAlt1RoundedIcon />}
        sx={{
          position: "fixed",
          right: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          borderRadius: 999,
          px: 2.4,
          py: 1.25,
          textTransform: "none",
          fontWeight: 700,
          fontSize: 15,
          fontFamily: "Be Vietnam Pro, sans-serif",
          background: "linear-gradient(135deg, #630ed4 0%, #7c3aed 100%)",
          boxShadow: "0 14px 30px rgba(99,14,212,0.3)",
          zIndex: 20,
        }}
      >
        Thêm mới
      </Button>

      <CreateFinanceAdminForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
      />

      <Dialog
        open={resetPasswordResult !== null}
        onClose={() => setResetPasswordResult(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
          Mật khẩu mới
          <IconButton
            size="small"
            onClick={() => setResetPasswordResult(null)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5, color: "#4a4455" }}>
            Mật khẩu tạm thời đã được tạo. Vui lòng gửi cho nhân viên và yêu cầu đổi mật khẩu sau khi đăng nhập.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center"
            sx={{ backgroundColor: "#f3f4f6", borderRadius: 2, px: 2, py: 1.5 }}
          >
            <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, flex: 1 }}>
              {resetPasswordResult}
            </Typography>
            <Tooltip title="Sao chép">
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordResult ?? "");
                  toast.success("Đã sao chép mật khẩu!");
                }}
              >
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FinanceAdminManagement;
