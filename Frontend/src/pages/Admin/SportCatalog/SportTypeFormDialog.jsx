import React, { useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SportsSoccerRoundedIcon from "@mui/icons-material/SportsSoccerRounded";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Vui lòng nhập tên môn thể thao")
    .min(2, "Tên môn thể thao phải có ít nhất 2 ký tự")
    .max(60, "Tên môn thể thao tối đa 60 ký tự"),
});

const SportTypeFormDialog = ({
  open = false,
  mode = "create",
  initialValue = "",
  loading = false,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: initialValue || "" });
    }
  }, [initialValue, open, reset]);

  const submitHandler = (values) => {
    onSubmit?.({ name: values.name.trim() });
  };

  const closeHandler = () => {
    if (loading) return;
    onClose?.();
  };

  const isEdit = mode === "edit";

  return (
    <Dialog
      open={open}
      onClose={closeHandler}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          fontFamily: "Be Vietnam Pro, sans-serif !important",
          "&, & *": {
            fontFamily: "Be Vietnam Pro, sans-serif !important",
          },
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#191c1d" }}>
              {isEdit ? "Cập nhật môn thể thao" : "Thêm môn thể thao"}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit(submitHandler)}>
            <Stack spacing={2.5}>
              <TextField
                label="Tên môn thể thao"
                placeholder="Ví dụ: Bóng rổ"
                fullWidth
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SportsSoccerRoundedIcon sx={{ color: "#5f5c7f" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#eef0f6",
                  },
                }}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button
                  type="submit"
                  disabled={!isValid || loading}
                  variant="contained"
                  fullWidth
                  sx={{
                    borderRadius: 999,
                    py: 1.2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 15,
                    background: "linear-gradient(120deg, #0049e6 0%, #6a89ff 100%)",
                  }}
                >
                  {loading ? "Đang xử lý..." : isEdit ? "Lưu cập nhật" : "Thêm mới"}
                </Button>
                <Button
                  type="button"
                  onClick={closeHandler}
                  disabled={loading}
                  fullWidth
                  sx={{
                    borderRadius: 999,
                    py: 1.2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#4a4455",
                    backgroundColor: "#f1f2f6",
                  }}
                >
                  Hủy
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default SportTypeFormDialog;
