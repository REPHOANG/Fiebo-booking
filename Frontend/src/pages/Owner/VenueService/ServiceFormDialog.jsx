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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  FormHelperText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
const SERVICE_TYPES = [
  { value: "food", label: "Đồ ăn" },
  { value: "drink", label: "Đồ uống" },
  { value: "equipment", label: "Thiết bị thể thao" },
  { value: "rental", label: "Cho thuê" },
  { value: "other", label: "Khác" },
];

// Mock initial services data
const initialServices = [
  {
    id: "1",
    name: "Nước suối",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=200&fit=crop",
    type: "drink",
    price: 10000,
  },
  {
    id: "2",
    name: "Nước tăng lực Redbull",
    image:
      "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop",
    type: "drink",
    price: 25000,
  },
  {
    id: "3",
    name: "Bánh mì thịt nướng",
    image:
      "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=300&h=200&fit=crop",
    type: "food",
    price: 30000,
  },
  {
    id: "4",
    name: "Thuê vợt cầu lông",
    image:
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&h=200&fit=crop",
    type: "equipment",
    price: 50000,
  },
  {
    id: "5",
    name: "Thuê giày bóng đá",
    image:
      "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&h=200&fit=crop",
    type: "rental",
    price: 40000,
  },
  {
    id: "6",
    name: "Coca Cola",
    image:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=200&fit=crop",
    type: "drink",
    price: 15000,
  },
  {
    id: "7",
    name: "Mì gói ăn liền",
    image:
      "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&h=200&fit=crop",
    type: "food",
    price: 20000,
  },
  {
    id: "8",
    name: "Thuê bóng đá",
    image:
      "https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=300&h=200&fit=crop",
    type: "rental",
    price: 30000,
  },
];
// Validation schema
const serviceSchema = yup.object().shape({
  name: yup
    .string()
    .required('Vui lòng nhập tên dịch vụ')
    .min(2, 'Tối thiểu 2 ký tự')
    .max(100, 'Tối đa 100 ký tự'),
  type: yup.string().required('Vui lòng chọn loại'),
  price: yup
    .number()
    .typeError('Giá phải là số')
    .required('Vui lòng nhập giá')
    .min(0, 'Giá không được âm')
    .max(100000000, 'Tối đa 100 triệu'),
  image: yup.string().required('Vui lòng thêm ảnh'),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(serviceSchema),
    defaultValues: { name: '', type: '', price: '', image: '' },
  });

  const watchedImage = watch('image');

  useEffect(() => {
    if (initialData && mode === 'edit') {
      reset({
        name: initialData.name,
        type: initialData.type,
        price: initialData.price,
        image: initialData.image,
      });
      setImagePreview(initialData.image);
    } else {
      reset({ name: '', type: '', price: '', image: '' });
      setImagePreview('');
    }
  }, [initialData, mode, reset, open]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setValue('image', reader.result, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (data) => {
    onSubmit({ ...data, id: initialData?.id || Date.now().toString() });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#16a34a',
          color: 'white',
          py: 2,
        }}
      >
        <Box component="span" sx={{ fontWeight: 600 }}>
          {mode === 'edit' ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'}
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Image Upload */}
            <Box>
              <Typography variant="body2" color="#64748b" sx={{ mb: 1 }}>
                Ảnh dịch vụ *
              </Typography>
              <Box
                sx={{
                  height: 140,
                  borderRadius: 2,
                  border: errors.image ? '2px dashed #ef4444' : '2px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
                }}
                component="label"
              >
                {imagePreview || watchedImage ? (
                  <Box
                    component="img"
                    src={imagePreview || watchedImage}
                    alt="Preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <CloudUploadIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                    <Typography variant="body2" color="#94a3b8">
                      Chọn ảnh
                    </Typography>
                  </Box>
                )}
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              </Box>
              {errors.image && (
                <FormHelperText error>{errors.image.message}</FormHelperText>
              )}
            </Box>

            {/* Service Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tên dịch vụ"
                  size="small"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            {/* Service Type */}
            <FormControl fullWidth size="small" error={!!errors.type}>
              <InputLabel>Loại dịch vụ</InputLabel>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Loại dịch vụ">
                    {SERVICE_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
            </FormControl>

            {/* Price */}
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Giá dịch vụ"
                  type="number"
                  size="small"
                  fullWidth
                  error={!!errors.price}
                  helperText={errors.price?.message}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#e2e8f0',
              color: '#64748b',
              '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
            }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isSubmitting}
            sx={{
              backgroundColor: '#16a34a',
              '&:hover': { backgroundColor: '#15803d' },
            }}
          >
            {mode === 'edit' ? 'Cập nhật' : 'Thêm'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
