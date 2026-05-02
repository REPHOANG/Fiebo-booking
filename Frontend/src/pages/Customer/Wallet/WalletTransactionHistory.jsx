import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import "./WalletTransactionHistory.css";
import { formatDateToTime, formatVND } from "../../../utils/helperFunction";
import { useEffect, useState } from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
export default function WalletTransactionHistory({
  transactions = [],
  totalPages,
  page,
  from,
  to,
  onFilterChange,
  onPageChange,
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const minDate = dayjs().subtract(1, "month").format("YYYY-MM-DD");

  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setStart(from);
    setEnd(to);
  }, [from, to]);

  const changePage = (v) => {
    onPageChange?.(v);
  };

  const handleSearch = () => {
    if (!start || !end || dayjs(start).isAfter(dayjs(end))) {
      setErr(true);
      return;
    }

    setErr(false);

    onFilterChange?.({
      from: dayjs(start).format("YYYY-MM-DD"),
      to: dayjs(end).format("YYYY-MM-DD"),
    });
  };

  // Map loại giao dịch
  const getTransactionTypeLabel = (type) => {
    const typeMap = {
      Booking: "Đặt sân",
      EventBooking: "Sự kiện",
      Refund: "Hoàn tiền",
      TopUp: "Nạp tiền",
      WithDraw: "Rút tiền",
    };
    return typeMap[type] || type;
  };

  const getTransactionStatusLabel = (status) => {
    const statusMap = {
      Completed: "Hoàn thành",
      Pending: "Đang xử lý",
      Failed: "Thất bại",
      Cancelled: "Đã hủy",
      Success: "Thành công"
    };
    return statusMap[status] || status;
  };

  // Nhóm giao dịch theo ngày
  const groupedByDate = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.createdAt);
    const dateKey = date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(transaction);
    return acc;
  }, {});

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-history">
        <div className="transaction-header">
          <h2>Lịch sử giao dịch</h2>
          <p className="transaction-subtitle">Các giao dịch gần đây của bạn</p>
        </div>
        <div className="transaction-empty">
          <p>Chưa có giao dịch nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <div className="transaction-header">
        <h2>Lịch sử giao dịch</h2>
        <Box sx={{ mt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <DatePicker
                label="Ngày bắt đầu"
                format="DD/MM/YYYY"
                value={start ? dayjs(start) : null}
                minDate={dayjs(minDate)}
                maxDate={dayjs(today)}
                onChange={(v) => setStart(v ? dayjs(v).format("YYYY-MM-DD") : "")}
                renderInput={(params) => <TextField size="small" {...params} />}
              />

              <DatePicker
                label="Ngày kết thúc"
                format="DD/MM/YYYY"
                value={end ? dayjs(end) : null}
                minDate={start ? dayjs(start) : dayjs(minDate)}
                maxDate={dayjs(today)}
                onChange={(v) => setEnd(v ? dayjs(v).format("YYYY-MM-DD") : "")}
                renderInput={(params) => <TextField {...params} />}
              />
              <Button variant="contained" onClick={handleSearch}>
                Tìm kiếm
              </Button>
            </Stack>
          </LocalizationProvider>
          {err && (
            <Typography
              sx={{
                color: "error.main",
                textAlign: "center",
                mt: 1,
                fontSize: 14,
              }}
            >
              Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc
            </Typography>
          )}
        </Box>
      </div>

      <div className="transaction-list">
        {Object.entries(groupedByDate).map(([dateKey, dateTransactions]) => (
          <div key={dateKey} className="transaction-date-group">
            <div className="date-label">{dateKey}</div>
            <div className="transaction-items">
              {dateTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon-wrapper">
                    <div
                      className={`transaction-icon ${transaction.direction.toLowerCase()}`}
                    >
                      {transaction.direction === "Credit" ? (
                        <ArrowUpRight size={20} />
                      ) : (
                        <ArrowDownLeft size={20} />
                      )}
                    </div>
                  </div>

                  <div className="transaction-info">
                    <div className="transaction-type">
                      {getTransactionTypeLabel(transaction.transactionType)}
                    </div>

                    <div className="transaction-id">
                      ID: {transaction.id}
                      {transaction.referenceId &&
                        ` • Ref: ${transaction.referenceId}`}
                    </div>
                    <div className="transaction-id">
                      Thời gian: {formatDateToTime(transaction.createdAt)}
                    </div>
                    {transaction.description && (
                      <div className="transaction-description">
                        {transaction.description}
                      </div>
                    )}
                  </div>

                  <div className="transaction-amount-wrapper">
                    <div
                      className={`transaction-amount ${transaction.direction.toLowerCase()}`}
                    >
                      {transaction.direction === "Credit" ? "+" : "-"}{" "}
                      {formatVND(transaction.amount)}
                    </div>
                    <div className="transaction-status-row">
                      <div
                        className={`transaction-badge ${transaction.direction.toLowerCase()}`}
                      >
                        {transaction.direction === "Credit" ? "Tiền vào" : "Tiền ra"}
                      </div>
                      {transaction.status && (
                        <div className={`transaction-status status-${transaction.status.toLowerCase()}`}>
                          {getTransactionStatusLabel(transaction.status)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Stack justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
          <Pagination
            page={parseInt(page)}
            count={totalPages}
            onChange={(e, v) => changePage(v)}
            color="success"
          />
        </Stack>
      </div>
      
    </div>
  );
}
