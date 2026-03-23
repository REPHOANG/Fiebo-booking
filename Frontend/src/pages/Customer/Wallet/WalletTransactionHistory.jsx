import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import "./WalletTransactionHistory.css";
import { formatDateToTime, formatVND } from "../../../utils/helperFunction";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const minDate = dayjs().subtract(1, "month").format("YYYY-MM-DD");

  // eslint-disable-next-line no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setStart(from);
    setEnd(to);
  }, [from, to]);
  const changeQuery = (list) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      list.forEach((e) => params.set(e.key, e.value));
      return params;
    });
  };

  const changePage = (v) => {
    changeQuery([
      { key: "page", value: v },
      { key: "transaction", value: true },
    ]);
  };

  const handleSearch = () => {
    if (!start || !end || dayjs(start).isAfter(dayjs(end))) {
      setErr(true);
      return;
    }

    setErr(false);

    changeQuery([
      { key: "page", value: 1 },
      { key: "from", value: dayjs(start).format("YYYY-MM-DD") },
      { key: "to", value: dayjs(end).format("YYYY-MM-DD") },
    ]);
  };

  const currentTransactions = transactions;
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

  // Nhóm giao dịch theo ngày
  const groupedByDate = currentTransactions.reduce((acc, transaction) => {
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
                value={dayjs(start)}
                minDate={dayjs(minDate)}
                maxDate={dayjs(today)}
                onChange={(v) => setStart(dayjs(v).format("YYYY-MM-DD"))}
                renderInput={(params) => <TextField size="small" {...params} />}
              />

              <DatePicker
                label="Ngày kết thúc"
                format="DD/MM/YYYY"
                value={dayjs(end)}
                minDate={dayjs(start)}
                maxDate={dayjs(today)}
                onChange={(v) => setEnd(dayjs(v).format("YYYY-MM-DD"))}
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
                  </div>

                  <div className="transaction-amount-wrapper">
                    <div
                      className={`transaction-amount ${transaction.direction.toLowerCase()}`}
                    >
                      {transaction.direction === "Credit" ? "+" : "-"}{" "}
                      {formatVND(transaction.amount)}
                    </div>
                    <div
                      className={`transaction-badge ${transaction.direction.toLowerCase()}`}
                    >
                      {transaction.direction}
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
            color="primary"
          />
        </Stack>
      </div>
      
    </div>
  );
}
