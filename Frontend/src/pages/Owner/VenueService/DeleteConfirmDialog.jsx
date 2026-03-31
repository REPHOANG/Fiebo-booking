'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  serviceName,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 3 }}>
        <WarningAmberIcon sx={{ fontSize: 40, color: '#ef4444', mb: 1 }} />
        <Typography variant="h6" fontWeight={600}>
          Xác nhận xóa
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography color="#64748b" textAlign="center">
          Bạn có chắc muốn xóa{' '}
          <Box component="span" fontWeight={600} color="#1e293b">
            {serviceName}
          </Box>
          ?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: '#e2e8f0',
            color: '#64748b',
            '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
          }}
        >
          Hủy
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            backgroundColor: '#ef4444',
            '&:hover': { backgroundColor: '#dc2626' },
          }}
        >
          Xóa
        </Button>
      </DialogActions>
    </Dialog>
  );
}
