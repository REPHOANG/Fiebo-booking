import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import {
  createAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
  getAdminSubscriptionPlans,
  updateAdminSubscriptionPlan,
} from "../../../services/adminService";
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

const planSchema = yup.object({
  name: yup.string().trim().max(100, "Tối đa 100 ký tự").required("Vui lòng nhập tên gói"),
  durationDays: yup
    .number()
    .typeError("Phải là số")
    .integer("Phải là số nguyên")
    .min(1, "Số ngày phải lớn hơn 0")
    .required("Vui lòng nhập số ngày"),
  price: yup
    .number()
    .typeError("Phải là số")
    .positive("Giá phải lớn hơn 0")
    .required("Vui lòng nhập giá"),
});

const PlanFormDialog = ({ open, onClose, onSubmit, loading, editPlan }) => {
  const isEdit = Boolean(editPlan);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(planSchema),
    mode: "onChange",
    values: editPlan
      ? { name: editPlan.name, durationDays: editPlan.durationDays, price: editPlan.price }
      : { name: "", durationDays: "", price: "" },
  });

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
        {isEdit ? "Chỉnh sửa gói đăng ký" : "Tạo gói đăng ký mới"}
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={loading}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Tên gói"
            fullWidth
            {...register("name")}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
          />
          <TextField
            label="Số ngày hiệu lực"
            fullWidth
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
            }}
            {...register("durationDays")}
            error={Boolean(errors.durationDays)}
            helperText={errors.durationDays?.message}
          />
          <TextField
            label="Giá"
            fullWidth
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
            }}
            {...register("price")}
            error={Boolean(errors.price)}
            helperText={errors.price?.message}
          />
          <Button
            variant="contained"
            disabled={!isValid || loading}
            onClick={handleSubmit(onSubmit)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(135deg, #630ed4 0%, #7c3aed 100%)",
            }}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : isEdit ? "Lưu thay đổi" : "Tạo gói"}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

const AdminSubscriptionPlans = () => {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: plans = [], isLoading, isError, error } = useQuery({
    queryKey: ["adminSubscriptionPlans"],
    queryFn: getAdminSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: createAdminSubscriptionPlan,
    onSuccess: () => {
      toast.success("Tạo gói thành công!");
      setOpenForm(false);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptionPlans"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Tạo gói thất bại.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminSubscriptionPlan,
    onSuccess: () => {
      toast.success("Cập nhật gói thành công!");
      setEditPlan(null);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptionPlans"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Cập nhật gói thất bại.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSubscriptionPlan,
    onSuccess: () => {
      toast.success("Xóa gói thành công!");
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptionPlans"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Xóa gói thất bại.");
    },
  });

  const handleFormSubmit = (values) => {
    const payload = {
      name: values.name.trim(),
      durationDays: Number(values.durationDays),
      price: Number(values.price),
    };
    if (editPlan) {
      updateMutation.mutate({ id: editPlan.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const formLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Box
      className="finance-admin-page"
      sx={{
        px: { xs: 2, md: 3 },
        pb: 12,
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
            {plans.length} gói
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
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 10 }}>
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      fontWeight: 800,
                      color: palette.color,
                      backgroundColor: palette.bg,
                      fontSize: 18,
                    }}
                  >
                    {String(plan.name || "").charAt(0).toUpperCase() || "G"}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: "#191c1d", fontSize: 18 }}>
                      {plan.name}
                    </Typography>
                    <Typography sx={{ color: "#7b7487", fontSize: 12 }}>ID: {plan.id}</Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ position: "absolute", top: 14, right: 14 }}>
                  <Tooltip title="Chỉnh sửa">
                    <IconButton size="small" onClick={() => setEditPlan(plan)} sx={{ color: "#630ed4" }}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xóa gói">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteConfirm(plan)}
                      sx={{ color: "#dc2626" }}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
              <Typography sx={{ color: "#4a4455" }}>Chưa có gói đăng ký nào.</Typography>
            </Card>
          )}
        </Stack>
      )}

      {/* FAB */}
      <Button
        variant="contained"
        onClick={() => setOpenForm(true)}
        startIcon={<AddRoundedIcon />}
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
          background: "linear-gradient(135deg, #630ed4 0%, #7c3aed 100%)",
          boxShadow: "0 14px 30px rgba(99,14,212,0.3)",
          zIndex: 20,
        }}
      >
        Thêm gói
      </Button>

      {/* Create form */}
      <PlanFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        editPlan={null}
      />

      {/* Edit form */}
      <PlanFormDialog
        open={Boolean(editPlan)}
        onClose={() => setEditPlan(null)}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        editPlan={editPlan}
      />

      {/* Delete confirm dialog */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => !deleteMutation.isPending && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận xóa gói</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: "#4a4455" }}>
            Bạn có chắc muốn xóa gói{" "}
            <strong>{deleteConfirm?.name}</strong>? Gói sẽ không hiển thị cho chủ sân nhưng vẫn được lưu lại vì lý do lịch sử.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              fullWidth
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteConfirm(null)}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="error"
              fullWidth
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              {deleteMutation.isPending ? <CircularProgress size={18} color="inherit" /> : "Xóa gói"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminSubscriptionPlans;
