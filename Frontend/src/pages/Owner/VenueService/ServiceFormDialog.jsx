'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  FormHelperText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// ================= VALIDATION =================
const serviceSchema = yup.object().shape({
  serviceName: yup
    .string()
    .required('Vui lòng nhập tên dịch vụ')
    .min(2, 'Tối thiểu 2 ký tự')
    .max(100, 'Tối đa 100 ký tự'),

  description: yup
    .string()
    .max(500, 'Tối đa 500 ký tự')
    .nullable(),

  price: yup
    .number()
    .typeError('Giá phải là số')
    .required('Vui lòng nhập giá')
    .min(0, 'Giá không được âm')
    .max(100000000, 'Tối đa 100 triệu'),
  imageFile: yup.mixed().nullable(),
});

export default function ServiceFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  mode,
}) {
  const [imagePreview, setImagePreview] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(serviceSchema),
    defaultValues: {
      serviceName: '',
      description: '',
      price: '',
      imageFile: null,
    },
  });

  // ================= INIT DATA =================
  useEffect(() => {
    if (initialData && mode === 'edit') {
      reset({
        serviceName: initialData.serviceName,
        description: initialData.description || '',
        price: initialData.price,
        imageFile: null, 
      });
      setImagePreview(initialData.imageUrl);
    } else {
      reset({
        serviceName: '',
        description: '',
        price: '',
        imageFile: null,
      });
      setImagePreview('');
    }
  }, [initialData, mode, reset, open]);

  // ================= HANDLE IMAGE =================
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImagePreview(reader.result);

        // ❗ FIX QUAN TRỌNG
        setValue('imageFile', file, { shouldValidate: true });
      };

      reader.readAsDataURL(file);
    }
  };

  // ================= SUBMIT =================
  const handleFormSubmit = (data) => {
    const payload = {
      serviceName: data.serviceName,
      description: data.description,
      price: Number(data.price),
      imageFile: data.imageFile, 
    };

    if (mode === 'edit') {
      onSubmit({ ...payload, id: initialData.id });
    } else {
      onSubmit(payload);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: '#16a34a',
          color: 'white',
        }}
      >
        {mode === 'edit' ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'}
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>

            {/* IMAGE */}
            <Box>
              <Typography mb={1}>Ảnh dịch vụ</Typography>

              <Box
                component="label"
                sx={{
                  height: 140,
                  border: '2px dashed #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box textAlign="center">
                    <CloudUploadIcon />
                    <Typography>Chọn ảnh</Typography>
                  </Box>
                )}

                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Box>

              {errors.imageFile && (
                <FormHelperText error>
                  {errors.imageFile.message}
                </FormHelperText>
              )}
            </Box>

            {/* NAME */}
            <Controller
              name="serviceName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tên dịch vụ"
                  error={!!errors.serviceName}
                  helperText={errors.serviceName?.message}
                />
              )}
            />

            {/* DESCRIPTION */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Mô tả"
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            {/* PRICE */}
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Giá"
                  type="number"
                  error={!!errors.price}
                  helperText={errors.price?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">VNĐ</InputAdornment>
                    ),
                  }}
                />
              )}
            />

          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {mode === 'edit' ? 'Cập nhật' : 'Thêm'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}