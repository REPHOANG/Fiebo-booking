/* eslint-disable react/prop-types */
import { Box, Button, Stack, Typography } from "@mui/material";
import svg from "../../../assets/images/mastercard.svg";
import { Container } from "react-bootstrap";
import { formatVND } from "../../../utils/helperFunction";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SouthWestIcon from "@mui/icons-material/SouthWest";
const WalletBalance = ({ data, onWithdrawClick }) => {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  return (
    <Box sx={{ mt: 5 }}>
      <Stack
        sx={{ width: "100%" }}
        direction={"row"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <Box
          sx={{
            width: "45%",
            height: "240px",
            background: "linear-gradient(to bottom, #8e2de2, #4a00e0)",
            borderRadius: "35px",
            position: "relative",
          }}
        >
          <Container style={{ width: "90%" }}>
            <Stack
              direction={"row"}
              justifyContent={"space-between"}
              alignItems={"start"}
              sx={{ mt: 3 }}
            >
              <Box
                sx={{
                  pl: 2.5,
                }}
              >
                <Typography
                  variant="h6"
                  fontSize={"15px"}
                  fontWeight={400}
                  color="#ccc"
                >
                  Số dư
                </Typography>
                <Typography
                  variant="h6"
                  fontSize={"30px"}
                  fontWeight={400}
                  color="white"
                  sx={{
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {formatVND(data.balance || 0)}
                </Typography>
              </Box>
              <Stack
                direction={"column"}
                justifyContent={"center"}
                alignItems={"center"}
              >
                <img width={40} src={svg} alt="" />
                <Typography
                  variant="h6"
                  fontSize={"15px"}
                  fontWeight={400}
                  color="#ccc"
                >
                  Fiebo
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ position: "absolute", bottom: "20px", pl: 2.5 }}>
              <Typography variant="body1" color="#ccc">
                {user.name}
              </Typography>
            </Box>
          </Container>
        </Box>
      </Stack>
      <Stack
        direction={"row"}
        justifyContent={"center"}
        sx={{ mt: 2 }}
        spacing={2}
      >
        <Button
          variant="contained"
          startIcon={<AccountBalanceWalletIcon />}
          onClick={() => navigate("/wallet/top-up")}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            px: 3,
            py: 1.2,
            fontWeight: 500,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
              boxShadow: "0 6px 16px rgba(16, 185, 129, 0.4)",
            },
          }}
        >
          Nạp tiền
        </Button>

        {/* Rút tiền */}
        <Button
          variant="contained"
          startIcon={<SouthWestIcon />}
          onClick={onWithdrawClick}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            px: 3,
            py: 1.2,
            fontWeight: 500,
            background: "linear-gradient(45deg, #f44336, #c62828)",
            boxShadow: "0 4px 12px rgba(244, 67, 54, 0.3)",
            "&:hover": {
              background: "linear-gradient(45deg, #e53935, #b71c1c)",
              boxShadow: "0 6px 16px rgba(244, 67, 54, 0.4)",
            },
          }}
        >
          Rút tiền
        </Button>
      </Stack>
    </Box>
  );
};

export default WalletBalance;
