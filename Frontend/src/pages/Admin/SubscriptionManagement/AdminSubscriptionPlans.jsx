import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Send, 
  Sparkles, 
  Diamond, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Settings,
  DollarSign,
  Calendar,
  Package
} from "lucide-react";
import {
  createAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
  getAdminSubscriptionPlans,
  updateAdminSubscriptionPlan,
} from "../../../services/adminService";
import "./AdminSubscriptionPlans.css";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN").format(price) + " đ";

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
      maxWidth="xs"
      PaperProps={{ 
        sx: { 
          borderRadius: 4,
          "&, & *": { fontFamily: "'Be Vietnam Pro', sans-serif !important" }
        } 
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', px: 3, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
          {isEdit ? "Chỉnh sửa gói đăng ký" : "Tạo gói đăng ký mới"}
        </Typography>
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={loading}
          sx={{ position: "absolute", right: 16, top: 16, color: '#94a3b8' }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 0 }}>
        <Stack spacing={3} sx={{ pt: "25px" }}>
          <TextField
            label="Tên gói dịch vụ"
            fullWidth
            placeholder="Ví dụ: Gói Cơ Bản (1 Tháng)"
            {...register("name")}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Package size={18} color="#94a3b8" /></InputAdornment>,
            }}
            sx={{ 
              "& .MuiOutlinedInput-root": { borderRadius: 3 } 
            }}
          />
          <TextField
            label="Số ngày hiệu lực"
            fullWidth
            type="number"
            placeholder="30"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Calendar size={18} color="#94a3b8" /></InputAdornment>,
              endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
            }}
            {...register("durationDays")}
            error={Boolean(errors.durationDays)}
            helperText={errors.durationDays?.message}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
          <TextField
            label="Giá niêm yết"
            fullWidth
            type="number"
            placeholder="200000"
            InputProps={{
              startAdornment: <InputAdornment position="start"><DollarSign size={18} color="#94a3b8" /></InputAdornment>,
              endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
            }}
            {...register("price")}
            error={Boolean(errors.price)}
            helperText={errors.price?.message}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
          <Button
            variant="contained"
            disabled={!isValid || loading}
            onClick={handleSubmit(onSubmit)}
            fullWidth
            sx={{
              borderRadius: 3,
              py: 1.5,
              textTransform: "none",
              fontWeight: 700,
              backgroundColor: "#1e56d9",
              boxShadow: "0 10px 20px rgba(30,86,217,0.2)",
              "&:hover": { backgroundColor: "#1a4bc4" }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : isEdit ? "Lưu thay đổi" : "Tạo gói ngay"}
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
  });

  const createMutation = useMutation({
    mutationFn: createAdminSubscriptionPlan,
    onSuccess: () => {
      toast.success("Tạo gói thành công!");
      setOpenForm(false);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptionPlans"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminSubscriptionPlan,
    onSuccess: () => {
      toast.success("Cập nhật gói thành công!");
      setEditPlan(null);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptionPlans"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSubscriptionPlan,
    onSuccess: () => {
      toast.success("Xóa gói thành công!");
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["adminSubscriptionPlans"] });
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

  const totalPlans = plans.length;
  const avgPrice = totalPlans > 0 ? plans.reduce((acc, p) => acc + p.price, 0) / totalPlans : 0;
  const maxPrice = totalPlans > 0 ? Math.max(...plans.map(p => p.price)) : 0;
  const maxDuration = totalPlans > 0 ? Math.max(...plans.map(p => p.durationDays)) : 0;

  return (
    <div className="subs-container">
      {/* Header */}
      <div className="subs-header">
        <div className="subs-title">
          <h2>Quản lý gói đăng ký</h2>
          <p>Hệ thống hiện có <span>{totalPlans} gói</span> dịch vụ đang hoạt động.</p>
        </div>
        <button className="btn-add-plan" onClick={() => setOpenForm(true)}>
          <Plus size={20} />
          Thêm gói dịch vụ
        </button>
      </div>

      {/* Plans Grid */}
      <div className="plans-grid">
        {isLoading ? (
          <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 8 }}>
            <CircularProgress size={40} thickness={4} />
          </Box>
        ) : (
          <>
            {plans.map((plan, index) => {
              const types = ['basic', 'popular', 'premium'];
              const type = types[index % 3];
              const Icons = [Send, Sparkles, Diamond];
              const PlanIcon = Icons[index % 3];

              return (
                <div key={plan.id} className={`plan-card ${type}`}>
                  <div className="plan-card__header">
                    <div className="plan-icon-wrapper">
                      <PlanIcon size={24} />
                    </div>
                    <div className="plan-actions">
                      <button className="btn-plan-action" onClick={() => setEditPlan(plan)}>
                        <Pencil size={18} />
                      </button>
                      <button className="btn-plan-action" onClick={() => setDeleteConfirm(plan)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {type === 'popular' && <div className="plan-popular-badge">PHỔ BIẾN</div>}
                  <div className="plan-id-label">ID: {plan.id}</div>
                  <h3>{plan.name}</h3>

                  <div className="plan-metric">
                    <label>Giá niêm yết</label>
                    <span className="price">{formatPrice(plan.price)}</span>
                  </div>
                  <div className="plan-metric">
                    <label>Thời hạn</label>
                    <span className="duration">{plan.durationDays} ngày</span>
                  </div>
                </div>
              );
            })}

            {totalPlans === 0 && (
              <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 8, background: 'white', borderRadius: 5, border: '2px dashed #e2e8f0' }}>
                <Typography sx={{ color: '#64748b' }}>Chưa có gói đăng ký nào. Hãy thêm gói đầu tiên!</Typography>
              </Box>
            )}
          </>
        )}
      </div>

      {/* Statistics Section */}
      {/* <div className="stats-container">
        <div className="stats-header">
          <div className="stats-icon-wrapper">
            <BarChart3 size={20} />
          </div>
          <h3>Thống kê cấu hình gói</h3>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <label>SỐ GÓI ĐANG CHẠY</label>
            <div className="stat-value">{totalPlans}</div>
            <div className="stat-subtext">Gói dịch vụ khả dụng</div>
          </div>
          <div className="stat-box">
            <label>GIÁ TRUNG BÌNH</label>
            <div className="stat-value">{formatPrice(avgPrice)}</div>
            <div className="stat-subtext">Trên toàn bộ hệ thống</div>
          </div>
          <div className="stat-box">
            <label>GÓI CAO NHẤT</label>
            <div className="stat-value">{formatPrice(maxPrice)}</div>
            <div className="stat-subtext">Giá trị gói Premium</div>
          </div>
          <div className="stat-box">
            <label>THỜI HẠN TỐI ĐA</label>
            <div className="stat-value">{maxDuration} Ngày</div>
            <div className="stat-subtext">Thời gian đăng ký dài nhất</div>
          </div>
        </div>
      </div> */}

      {/* Dialogs */}
      <PlanFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        editPlan={null}
      />

      <PlanFormDialog
        open={Boolean(editPlan)}
        onClose={() => setEditPlan(null)}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        editPlan={editPlan}
      />

      <Dialog
        open={Boolean(deleteConfirm)}
        onClose={() => !deleteMutation.isPending && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 4,
            "&, & *": { fontFamily: "'Be Vietnam Pro', sans-serif !important" }
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận xóa gói</DialogTitle>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <Typography sx={{ mb: 3, color: "#64748b" }}>
            Bạn có chắc muốn xóa gói <strong>{deleteConfirm?.name}</strong>? Hành động này không thể hoàn tác.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteConfirm(null)}
              sx={{ borderRadius: 3, textTransform: "none", fontWeight: 600, py: 1.2 }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="error"
              fullWidth
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              sx={{ borderRadius: 3, textTransform: "none", fontWeight: 700, py: 1.2 }}
            >
              {deleteMutation.isPending ? <CircularProgress size={20} color="inherit" /> : "Xác nhận xóa"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionPlans;
