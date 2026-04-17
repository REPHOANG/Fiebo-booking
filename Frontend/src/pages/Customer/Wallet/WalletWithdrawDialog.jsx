import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Wallet } from "lucide-react";
import { formatVND } from "../../../utils/helperFunction";

const maskAccountNumber = (value) => {
  const digits = String(value || "").replace(/\s/g, "");
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const WalletWithdrawDialog = ({
  open,
  onClose,
  balance = 0,
  bankAccounts = [],
  loadingBankAccounts = false,
  submitting = false,
  onWithdraw,
  onNavigateToProfile,
}) => {
  const [amount, setAmount] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setErrors({});
    setSelectedBankAccountId(bankAccounts[0] ? String(bankAccounts[0].id) : "");
  }, [open, bankAccounts]);

  const amountNumber = Number(amount || 0);
  const canSubmitWithdraw = amountNumber > 0 && Number(selectedBankAccountId) > 0 && !submitting;

  const helperMessage = useMemo(() => {
    if (!amount) return `Số dư khả dụng: ${formatVND(balance)}`;
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return "Nhập số tiền rút hợp lệ.";
    if (amountNumber > balance) return "Số tiền rút không được vượt quá số dư hiện có.";
    return `Sau khi rút, số dư dự kiến còn ${formatVND(Math.max(0, balance - amountNumber))}.`;
  }, [amount, amountNumber, balance]);

  const handleWithdraw = async () => {
    const nextErrors = {};
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      nextErrors.amount = "Vui lòng nhập số tiền rút hợp lệ.";
    } else if (amountNumber > balance) {
      nextErrors.amount = "Số tiền rút vượt quá số dư hiện có.";
    }
    if (!selectedBankAccountId) {
      nextErrors.bankAccountId = "Vui lòng chọn tài khoản nhận tiền.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onWithdraw({ amount: amountNumber, bankAccountId: Number(selectedBankAccountId) });
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Rút tiền về ngân hàng</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: 2,
              borderRadius: 3,
              background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))",
              border: "1px solid rgba(148, 163, 184, 0.16)",
            }}
          >
            <Box>
              <Typography fontSize={13} fontWeight={700} color="#64748b">
                Số dư hiện có
              </Typography>
              <Typography fontSize={28} fontWeight={800} color="#0f172a">
                {formatVND(balance)}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                color: "#0f766e",
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <Wallet size={24} />
            </Box>
          </Box>

          <TextField
            label="Số tiền rút"
            placeholder="Ví dụ: 200000"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value.replace(/[^\d]/g, ""));
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            error={Boolean(errors.amount)}
            helperText={errors.amount || helperMessage}
            fullWidth
          />

          <Divider />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography fontSize={15} fontWeight={800} color="#0f172a">
                Tài khoản nhận tiền
              </Typography>
              <Typography fontSize={13} color="#64748b">
                Chọn tài khoản ngân hàng để nhận tiền rút từ ví.
              </Typography>
            </Box>
          </Stack>

          {loadingBankAccounts ? (
            <Typography fontSize={14} color="#64748b">Đang tải tài khoản ngân hàng…</Typography>
          ) : bankAccounts.length > 0 ? (
            <RadioGroup value={selectedBankAccountId} onChange={(event) => setSelectedBankAccountId(event.target.value)}>
              <Stack spacing={1.25}>
                {bankAccounts.map((account) => (
                  <Box
                    key={account.id}
                    sx={{
                      border: account.id === Number(selectedBankAccountId)
                        ? "1px solid rgba(34, 197, 94, 0.45)"
                        : "1px solid rgba(148, 163, 184, 0.22)",
                      borderRadius: 3,
                      px: 1.5,
                      py: 0.75,
                      background: account.id === Number(selectedBankAccountId)
                        ? "rgba(240, 253, 244, 0.8)"
                        : "#fff",
                    }}
                  >
                    <FormControlLabel
                      value={String(account.id)}
                      control={<Radio />}
                      label={
                        <Box sx={{ py: 0.5 }}>
                          <Typography fontWeight={800} color="#0f172a">{account.bankName}</Typography>
                          <Typography fontSize={13} color="#475569">
                            {account.accountHolderName} • STK {maskAccountNumber(account.accountNumber)}
                          </Typography>
                        </Box>
                      }
                      sx={{ width: "100%", m: 0 }}
                    />
                  </Box>
                ))}
              </Stack>
            </RadioGroup>
          ) : (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={onNavigateToProfile} sx={{ fontWeight: 700, textTransform: "none" }}>
                  Đi tới profile
                </Button>
              }
            >
              Bạn chưa có tài khoản ngân hàng. Hãy vào trang profile để thêm tài khoản trước khi rút tiền.
            </Alert>
          )}

          {errors.bankAccountId ? <Alert severity="error">{errors.bankAccountId}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={handleWithdraw}
          disabled={!canSubmitWithdraw}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {submitting ? "Đang xử lý…" : "Xác nhận rút tiền"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WalletWithdrawDialog;