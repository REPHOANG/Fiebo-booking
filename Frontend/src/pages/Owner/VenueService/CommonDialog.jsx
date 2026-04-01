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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

// ================= CONFIG =================
const dialogConfig = {
  success: {
    icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#22c55e' }} />,
    color: '#22c55e',
    defaultTitle: 'Thành công',
  },
  error: {
    icon: <ErrorIcon sx={{ fontSize: 40, color: '#ef4444' }} />,
    color: '#ef4444',
    defaultTitle: 'Thất bại',
  },
  warning: {
    icon: <WarningAmberIcon sx={{ fontSize: 40, color: '#f59e0b' }} />,
    color: '#f59e0b',
    defaultTitle: 'Cảnh báo',
  },
  info: {
    icon: <InfoIcon sx={{ fontSize: 40, color: '#3b82f6' }} />,
    color: '#3b82f6',
    defaultTitle: 'Thông báo',
  },
};

export default function CommonDialog({
  open,
  onClose,
  onConfirm,
  type = 'info',          // success | error | warning | info
  title,
  message,
  confirmText = 'OK',
  cancelText,
  showCancel = false,
}) {
  const config = dialogConfig[type] || dialogConfig.info;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* HEADER */}
      <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 3 }}>
        {config.icon}
        <Typography variant="h6" fontWeight={600}>
          {title || config.defaultTitle}
        </Typography>
      </DialogTitle>

      {/* CONTENT */}
      <DialogContent>
        <Typography color="#64748b" textAlign="center">
          {message}
        </Typography>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          gap: 1,
          justifyContent: 'center',
        }}
      >
        {showCancel && (
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: '#e2e8f0',
              color: '#64748b',
              '&:hover': {
                borderColor: '#cbd5e1',
                backgroundColor: '#f8fafc',
              },
            }}
          >
            {cancelText || 'Hủy'}
          </Button>
        )}

        <Button
          onClick={onConfirm || onClose}
          variant="contained"
          sx={{
            backgroundColor: config.color,
            '&:hover': {
              backgroundColor: config.color,
              opacity: 0.9,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}