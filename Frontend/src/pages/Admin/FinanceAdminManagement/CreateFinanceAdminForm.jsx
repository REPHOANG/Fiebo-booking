import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  X 
} from "lucide-react";

const createFinanceAdminSchema = yup.object({
  fullName: yup.string().trim().required("Vui lòng nhập họ và tên"),
  username: yup.string().trim().required("Vui lòng nhập tên đăng nhập"),
  password: yup
    .string()
    .required("Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

const CreateFinanceAdminForm = ({
  open = false,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(createFinanceAdminSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ fullName: "", username: "", password: "" });
      setShowPassword(false);
    }
  }, [open, reset]);

  const onValidSubmit = (values) => {
    onSubmit?.({
      fullName: values.fullName.trim(),
      username: values.username.trim(),
      password: values.password,
    });
  };

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 1,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b" }}>
              Thêm nhân viên mới
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Tạo tài khoản quản lý tài chính cho nhân viên
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ backgroundColor: '#f1f5f9' }}>
            <X size={20} />
          </IconButton>
        </Stack>

        <form onSubmit={handleSubmit(onValidSubmit)}>
          <Stack spacing={2.5}>
            <TextField
              label="Họ và tên"
              placeholder="Nhập họ và tên đầy đủ"
              {...register("fullName")}
              fullWidth
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <User size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 }
              }}
            />

            <TextField
              label="Tên đăng nhập (Email)"
              placeholder="example@finadmin.com"
              {...register("username")}
              fullWidth
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 }
              }}
            />

            <TextField
              label="Mật khẩu"
              placeholder="Tối thiểu 6 ký tự"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword((prev) => !prev)}
                      size="small"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 }
              }}
            />

            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
              <Button
                onClick={handleClose}
                fullWidth
                variant="outlined"
                sx={{ 
                  borderRadius: 3, 
                  py: 1.2, 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderColor: '#e2e8f0',
                  color: '#64748b'
                }}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={!isValid || loading}
                variant="contained"
                fullWidth
                sx={{ 
                  borderRadius: 3, 
                  py: 1.2, 
                  textTransform: 'none', 
                  fontWeight: 600,
                  backgroundColor: '#1e56d9',
                  '&:hover': { backgroundColor: '#1a4bc4' }
                }}
              >
                {loading ? "Đang tạo..." : "Xác nhận tạo"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFinanceAdminForm;
