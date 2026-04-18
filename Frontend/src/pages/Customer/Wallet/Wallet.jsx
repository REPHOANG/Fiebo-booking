import { Box, Container, Stack } from "@mui/material";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import {
  BANK_ACCOUNTS_QUERY_KEY,
  getBankAccounts,
  getWalletBalance,
  withdrawWallet,
  walletHistoryApi,
} from "../../../services/walletService";
import WalletBalance from "./WalletBalance";
import WalletTransactionHistory from "./WalletTransactionHistory";
import WalletWithdrawDialog from "./WalletWithdrawDialog";
import { hasRole } from "../../../utils/roleUtils";

const Wallet = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const today = dayjs();
  const oneMonthAgo = dayjs().subtract(1, "month");
  const [page, setPage] = useState(1);
  const [size] = useState(5);
  const [from, setFrom] = useState(oneMonthAgo.format("YYYY-MM-DD"));
  const [to, setTo] = useState(today.format("YYYY-MM-DD"));
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const transactionRef = useRef(null);
  const profilePath = hasRole(user, "FieldOwner") ? "/owner/profile" : "/profile";
  const isOwnerLayout = location.pathname.startsWith("/owner/");

  const readErrorMessage = (error, fallback) =>
    error?.response?.data?.message ??
    error?.response?.data?.Message ??
    error?.message ??
    fallback;

  const handleFilterChange = ({ from: nextFrom, to: nextTo }) => {
    setPage(1);
    setFrom(nextFrom);
    setTo(nextTo);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const {
    data: history,
    isLoading: historyLoading,

  } = useQuery({
    queryKey: ["wallet-history", page, size, from, to],
    queryFn: () => walletHistoryApi(page, size, from, to),
    keepPreviousData: true,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["balance"],
    queryFn: getWalletBalance,
    staleTime:0,
    retry: 0,
  });
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery({
    queryKey: BANK_ACCOUNTS_QUERY_KEY,
    queryFn: getBankAccounts,
  });

  const handleWithdraw = async ({ amount, bankAccountId }) => {
    setSubmittingWithdraw(true);
    try {
      const result = await withdrawWallet({ amount, bankAccountId });
      toast.success(result.message || "Tạo yêu cầu rút tiền thành công.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["balance"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-history"] }),
      ]);
      setWithdrawOpen(false);
    } catch (error) {
      toast.error(readErrorMessage(error, "Rút tiền thất bại."));
    } finally {
      setSubmittingWithdraw(false);
    }
  };


  if (isLoading || historyLoading) {
    return <LoadingPage />;
  }

  return (
    <Box sx={{ mb: 5, pt: isOwnerLayout ? 2 : 0 }}>
      <Container
        sx={{
          width: isOwnerLayout ? "85%" : "70%",
          maxWidth: isOwnerLayout ? "1160px" : "none",
          margin: "0 auto",
          px: isOwnerLayout ? 0 : undefined,
        }}
      >
        <Box>
          <Stack direction={"column"} spacing={2}>
            <Box>
              <WalletBalance data={data} onWithdrawClick={() => setWithdrawOpen(true)} />
            </Box>
            <Box ref={transactionRef}>
              <WalletTransactionHistory
                page={page}
                size={size}
                from={from}
                to={to}
                totalPages={history?.totalPages ?? 0}
                transactions={history?.items ?? []}
                onFilterChange={handleFilterChange}
                onPageChange={handlePageChange}
              />
            </Box>
          </Stack>
        </Box>
      </Container>

      <WalletWithdrawDialog
        open={withdrawOpen}
        onClose={() => {
          if (submittingWithdraw) return;
          setWithdrawOpen(false);
        }}
        balance={Number(data?.balance ?? 0)}
        bankAccounts={bankAccounts}
        loadingBankAccounts={bankAccountsLoading}
        submitting={submittingWithdraw}
        onWithdraw={handleWithdraw}
        onNavigateToProfile={() => {
          setWithdrawOpen(false);
          navigate(profilePath);
        }}
      />
    </Box>
  );
};

export default Wallet;
