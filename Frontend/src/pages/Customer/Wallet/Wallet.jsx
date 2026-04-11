import { Box, Container, Stack } from "@mui/material";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import {
  getWalletBalance,
  walletHistoryApi,
} from "../../../services/walletService";
import WalletBalance from "./WalletBalance";
import WalletTransactionHistory from "./WalletTransactionHistory";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
const Wallet = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Lấy giá trị tham số từ URL
  const page = searchParams.get("page") || 1;
  const size = searchParams.get("size") || 5;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const transactionRef = useRef(null);

  useEffect(() => {
  const today = dayjs();
  const oneMonthAgo = dayjs().subtract(1, "month");
  const todayStr = today.format("YYYY-MM-DD");
  const oneMonthAgoStr = oneMonthAgo.format("YYYY-MM-DD");

  const parsedFrom = dayjs(from, "YYYY-MM-DD", true);
  const parsedTo = dayjs(to, "YYYY-MM-DD", true);

  const isValidFrom =
    !!from &&
    parsedFrom.isValid() &&
    parsedFrom.isSameOrAfter(oneMonthAgo, "day") &&
    parsedFrom.isSameOrBefore(today, "day");

  const isValidTo =
    !!to &&
    parsedTo.isValid() &&
    parsedTo.isSameOrAfter(oneMonthAgo, "day") &&
    parsedTo.isSameOrBefore(today, "day");

  if (!isValidFrom || !isValidTo) {
    setSearchParams(
  {
    page: 1,
    size,
    from: isValidFrom ? from : oneMonthAgoStr,
    to: isValidTo ? to : todayStr,
  },
  { replace: true }
);
  }
}, [from, setSearchParams, size, to]);

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
                searchParams={searchParams}
              />
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Wallet;
