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
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import AlternateEmailOutlinedIcon from "@mui/icons-material/AlternateEmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

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
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          background: "#ffffff",
          fontFamily: "Be Vietnam Pro, sans-serif",
          "&, & *": {
            fontFamily: "Be Vietnam Pro, sans-serif",
          },
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: -80,
            right: -100,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,14,212,0.16) 0%, rgba(99,14,212,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={4}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#191c1d",
                fontFamily: "Be Vietnam Pro, sans-serif",
              }}
            >
              Thêm nhân viên
            </Typography>
          </Box>

          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              background: "#eaddff",
              display: "grid",
              placeItems: "center",
              color: "#630ed4",
              flexShrink: 0,
            }}
          >
            <PersonAddAlt1RoundedIcon />
          </Box>
        </Stack>

        <Box component="form" onSubmit={handleSubmit(onValidSubmit)}>
          <Stack spacing={3}>
            <TextField
              label="Họ và tên"
              placeholder="Nhập họ và tên nhân viên"
              {...register("fullName")}
              fullWidth
              error={!!errors.fullName}
              helperText={errors.fullName?.message || " "}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeOutlinedIcon sx={{ color: "#7b7487" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "#e7e8e9",
                },
              }}
            />

            <Box>
              <TextField
                label="Tên đăng nhập"
                placeholder="Nhập tên đăng nhập"
                {...register("username")}
                fullWidth
                error={!!errors.username}
                helperText={errors.username?.message || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AlternateEmailOutlinedIcon sx={{ color: "#7b7487" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#e7e8e9",
                  },
                }}
              />
            </Box>

            <Box>
              <TextField
                label="Mật khẩu"
                placeholder="Nhập mật khẩu an toàn"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: "#7b7487" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label="hiện hoặc ẩn mật khẩu"
                      >
                        {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#e7e8e9",
                  },
                }}
              />
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
              <Button
                type="submit"
                disabled={!isValid || loading}
                variant="contained"
                fullWidth
                sx={{
                  py: 1.4,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: "Be Vietnam Pro, sans-serif",
                  background: "linear-gradient(90deg, #630ed4 0%, #7c3aed 100%)",
                  boxShadow: "0 10px 24px rgba(99,14,212,0.24)",
                }}
              >
                {loading ? "Đang tạo..." : "Tạo tài khoản"}
              </Button>

              <Button
                type="button"
                onClick={handleClose}
                disabled={loading}
                fullWidth
                sx={{
                  py: 1.4,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#4a4455",
                  fontFamily: "Be Vietnam Pro, sans-serif",
                  backgroundColor: "#f3f4f5",
                }}
              >
                Hủy
              </Button>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFinanceAdminForm;
