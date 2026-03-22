import { Box, Container, Typography } from "@mui/material";
import image from "../../../assets/images/wifi.png";
export default function ErrorPage() {
  return (
    <Box sx={{pt: "15vh", pb: "15vh"}}>
      <Container sx={{ width: "20%",  }}>
        <img
          src={image}
          alt="anh"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </Container>
      <Typography variant="h4" align="center" sx={{ fontWeight: 600 }}>
        OOPS! Đã có lỗi xảy ra
      </Typography>
    </Box>
  );
}
