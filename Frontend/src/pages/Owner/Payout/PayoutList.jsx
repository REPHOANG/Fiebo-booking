'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { Box, Typography, Container, Pagination, Stack } from '@mui/material';
import { BalanceCard } from './BalanceCard';
import { FilterBar } from './FilterBar';
import { TransactionItem } from './TransactionItem';
import { getOwnerPayouts } from '../../../services/ownerService';
import LoadingPage from '../../../components/ui/Loading/LoadingPage';
import ErrorPage from '../../../components/ui/Error/ErrorPage';

const normalizeStatus = (rawStatus) => {
  const status = String(rawStatus || '').toLowerCase().trim();

  if (!status) return 'Pending';
  if (status === 'completed' || status === 'paid' || status === 'success') return 'Completed';
  if (status === 'processing' || status === 'in_progress' || status === 'in-progress') return 'Processing';
  if (status === 'failed' || status === 'rejected' || status === 'error') return 'Failed';
  return 'Pending';
};

const parseDateSafe = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateLabel = (value) => {
  const date = parseDateSafe(value);
  if (!date) return '--/--/----';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
};

const mapPayoutItem = (item, index) => {
  const startDate = parseDateSafe(item?.fromDate);
  const endDate = parseDateSafe(item?.toDate);
  const referenceDate = endDate || startDate;

  return {
    id: String(item?.id || `payout-${index}`),
    payoutId: item?.id ? String(item.id) : null,
    title: `Chi trả #${item?.id || index + 1}`,
    amount: Number(item?.amount || 0),
    dateRange: `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`,
    status: normalizeStatus(item?.status),
    referenceDate,
  };
};

export default function PayoutList() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const payoutQueryParams = useMemo(() => {
    const params = {
      page,
      pageSize,
    };

    if (selectedYear) {
      params.year = Number(selectedYear);
    }

    if (selectedYear && selectedMonth) {
      params.month = Number(selectedMonth);
    }

    return params;
  }, [selectedYear, selectedMonth, page, pageSize]);

  const {
    data: payoutData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ownerPayouts', payoutQueryParams],
    queryFn: () => getOwnerPayouts(payoutQueryParams),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const transactions = useMemo(
    () => (Array.isArray(payoutData?.payouts?.items)
      ? payoutData.payouts.items.map(mapPayoutItem)
      : []),
    [payoutData]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => activeFilter === 'All' || tx.status === activeFilter);
  }, [transactions, activeFilter]);

  const statusMap = {
  Pending: 'Đang chờ',
  Processing: 'Đang xử lý',
  Failed: 'Thất bại',
  Completed: 'Đã nhận',
};

  const pendingBalanceFromApi = Number(payoutData?.pendingPayout);
  const pendingBalance = Number.isFinite(pendingBalanceFromApi)
    ? pendingBalanceFromApi
    : transactions
      .filter((tx) => tx.status === 'Pending' || tx.status === 'Processing')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const nextPayoutFromApi = parseDateSafe(payoutData?.nextPayout);

  const nextPendingPayout = nextPayoutFromApi
    ? { referenceDate: nextPayoutFromApi }
    : transactions
      .filter((tx) => (tx.status === 'Pending' || tx.status === 'Processing') && tx.referenceDate)
      .sort((a, b) => a.referenceDate - b.referenceDate)[0];

  const nextPayoutLabel = nextPendingPayout
    ? `Lịch chi trả tiếp theo: ${formatDateLabel(nextPendingPayout.referenceDate)}`
    : 'Chưa có lịch chi trả tiếp theo';

  const apiPage = Number(payoutData?.payouts?.page || page || 1);
  const totalPages = Number(payoutData?.payouts?.totalPages || 1);

  if (isLoading) return <LoadingPage />;
  if (isError) return <ErrorPage />;

  return (
    <>
      <CssBaseline />
      <Box sx={{ backgroundColor: '#f7f9fb', minHeight: '100dvh', pb: 12 }}>
        
        <Container sx={{ px: 2, pt: 2, width:"85%" }}>
          {/* Balance Card */}
          <Box sx={{ mb: 3 }}>
            <BalanceCard pendingBalance={pendingBalance} nextPayoutLabel={nextPayoutLabel} />
          </Box>

          {/* Filter Bar */}
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={(value) => {
              setActiveFilter(value);
              setPage(1);
            }}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={(month) => {
              setSelectedMonth(month);
              setPage(1);
            }}
            onYearChange={(year) => {
              setSelectedYear(year);
              if (!year) {
                setSelectedMonth('');
              }
              setPage(1);
            }}
          />

          {/* Transactions List */}
          <Box sx={{ space: 3, pb: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, mb: 2 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                }}
              >
                Giao dịch gần đây
              </Typography>
            </Box>

            {/* Transaction Items */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filteredTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  title={transaction.title}
                  amount={transaction.amount}
                  dateRange={transaction.dateRange}
                  status={statusMap[transaction.status] || transaction.status}
                  statusKey={transaction.status}
                  onClick={
                    transaction.payoutId
                      ? () => navigate(`/owner/payout/${transaction.payoutId}/details`)
                      : undefined
                  }
                />
              ))}

              {filteredTransactions.length === 0 && (
                <Typography sx={{ fontSize: '0.875rem', color: '#76777d', fontFamily: 'inherit', px: 1, py: 2 }}>
                  Không có giao dịch phù hợp với bộ lọc đã chọn.
                </Typography>
              )}

              <Stack justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
                <Pagination
                  page={parseInt(apiPage, 10)}
                  count={totalPages}
                  onChange={(e, v) => setPage(v)}
                  color="success"
                />
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
