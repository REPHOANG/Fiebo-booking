import { useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as yup from "yup";

const initialFormValues = {
  fullName: "",
  password: "",
  username: "",
  venueId: 0,
};

const schema = yup.object({
  fullName: yup
    .string()
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .required("Vui lòng nhập họ và tên")
    .min(1, "Họ và tên phải có ít nhất 1 ký tự")
    .max(50, "Họ và tên tối đa 50 ký tự"),
  username: yup
    .string()
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .required("Vui lòng nhập tài khoản"),
  password: yup
    .string()
    .required("Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  venueId: yup
    .number()
    .typeError("Vui lòng chọn cơ sở")
    .integer("Cơ sở không hợp lệ")
    .min(1, "Vui lòng chọn cơ sở")
    .required("Vui lòng chọn cơ sở"),
});

export default function CreateStaffDialog({
  open,
  venues,
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: initialFormValues,
  });

  useEffect(() => {
    if (!open) {
      reset(initialFormValues);
      return;
    }

    if (venues?.length > 0) {
      const currentVenueId = watch("venueId");
      if (!currentVenueId) {
        setValue("venueId", Number(venues[0].venueId), {
          shouldValidate: true,
        });
      }
    }
  }, [open, venues, reset, setValue, watch]);

  const handleFormSubmit = handleSubmit((values) => {
    if (isSubmitting) return;

    onSubmit({
      fullName: values.fullName.trim(),
      username: values.username.trim(),
      password: values.password,
      venueId: Number(values.venueId),
    });
  });

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Tạo nhân viên mới</DialogTitle>
      <DialogContent>
        <Stack component="form" onSubmit={handleFormSubmit} spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Cơ sở"
            {...register("venueId", { valueAsNumber: true })}
            required
            fullWidth
            error={Boolean(errors.venueId)}
            helperText={errors.venueId?.message}
          >
            {venues.map((venue) => (
              <MenuItem key={venue.venueId} value={Number(venue.venueId)}>
                {venue.venueName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Họ và tên"
            {...register("fullName")}
            required
            fullWidth
            error={Boolean(errors.fullName)}
            helperText={errors.fullName?.message}
          />

          <TextField
            label="Tài khoản"
            {...register("username")}
            required
            fullWidth
            error={Boolean(errors.username)}
            helperText={errors.username?.message || "Ví dụ: staff2"}
          />

          <TextField
            label="Mật khẩu"
            type="password"
            {...register("password")}
            required
            fullWidth
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={handleFormSubmit} variant="contained" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Tạo nhân viên"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

