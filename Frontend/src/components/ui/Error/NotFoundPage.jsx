import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage({
  title = "Bạn đang lạc đường?",
  description = "Trang bạn tìm có thể đã bị xóa, đổi tên, hoặc tạm thời không khả dụng.",
}) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        px: 3,
        py: 6,
        fontFamily: '"Be Vietnam Pro", "Plus Jakarta Sans", sans-serif',
        color: "#2b3437",
        backgroundColor: "#ffffff",
        backgroundImage: "radial-gradient(#e2e9ed 0.6px, transparent 0.6px)",
        backgroundSize: "24px 24px",
        '&, & *': {
          fontFamily: '"Be Vietnam Pro", sans-serif !important',
        },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Box sx={{ position: "relative", mb: 8 }}>
          <Typography
            sx={{
              fontSize: { xs: 100, sm: 120 },
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "#0060ad",
              opacity: 0.06,
              userSelect: "none",
            }}
          >
            404
          </Typography>

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 26, sm: 30 },
                fontWeight: 800,
                mb: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 500,
                color: "#586064",
                lineHeight: 1.6,
                maxWidth: 270,
              }}
            >
              {description}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={2}>
          <Button
            onClick={() => navigate("/", { replace: true })}
            sx={{
              height: 58,
              borderRadius: "16px",
              bgcolor: "#0060ad",
              color: "#f8f8ff",
              fontWeight: 800,
              fontSize: 16,
              textTransform: "none",
              boxShadow: "0 10px 24px rgba(0, 96, 173, 0.2)",
              '&:hover': {
                bgcolor: "#005498",
              },
            }}
          >
            Về trang chủ
          </Button>

          <Button
            onClick={() => navigate(-1)}
            sx={{
              height: 58,
              borderRadius: "16px",
              bgcolor: "#f8fafc",
              border: "1px solid rgba(170, 179, 183, 0.6)",
              color: "#2b3437",
              fontWeight: 700,
              fontSize: 16,
              textTransform: "none",
              '&:hover': {
                bgcolor: "#eef3f6",
              },
            }}
          >
            Quay lại
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
