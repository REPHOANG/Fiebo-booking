import { Box, Container, Stack } from "@mui/material";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import dayjs from "dayjs";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import {
  getWalletBalance,
  walletHistoryApi,
} from "../../../services/walletService";
import WalletBalance from "./WalletBalance";
import WalletTransactionHistory from "./WalletTransactionHistory";

const Wallet = () => {
  const today = dayjs();
  const oneMonthAgo = dayjs().subtract(1, "month");
  const [page, setPage] = useState(1);
  const [size] = useState(5);
  const [from, setFrom] = useState(oneMonthAgo.format("YYYY-MM-DD"));
  const [to, setTo] = useState(today.format("YYYY-MM-DD"));
  const transactionRef = useRef(null);

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


  if (isLoading || historyLoading) {
    return <LoadingPage />;
  }

  return (
    <Box sx={{ mb: 5}}>
      <Container
        style={{
          width: "70%",
          margin: "0 auto",
        }}
      >
        <Box>
          <Stack direction={"column"} spacing={2}>
            <Box>
              <WalletBalance data={data} />
            </Box>
            <Box ref={transactionRef}>
              <WalletTransactionHistory
                page={page}
                size={size}
                from={from}
                to={to}
                totalPages={history.totalPages}
                transactions={history.items}
                onFilterChange={handleFilterChange}
                onPageChange={handlePageChange}
              />
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Wallet;
