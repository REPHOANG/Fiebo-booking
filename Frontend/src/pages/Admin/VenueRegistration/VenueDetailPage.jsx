import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import {
  ADMIN_PENDING_VENUES_QUERY_KEY,
  approveVenue,
  getVenueDetail,
  rejectVenue,
} from "../../../services/adminService";
import { toast } from "react-toastify";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";

// ================= UI =================
const Section = ({ title, children }) => (
  <Box mb={3}>
    <Typography fontWeight={600} mb={1}>
      {title}
    </Typography>
    <Paper sx={{ p: 2, borderRadius: 3 }}>{children}</Paper>
  </Box>
);

export const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => approveVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_VENUES_QUERY_KEY });
      toast.success("Duyệt cơ sở thành công");
      navigate("/admin/venue-registrations");
    },
    onError: () => {
      toast.error("Duyệt cơ sở thất bại");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectVenue({ id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_VENUES_QUERY_KEY });
      toast.success("Từ chối cơ sở thành công");
      navigate("/admin/venue-registrations");
    },
    onError: () => {
      toast.error("Từ chối cơ sở thất bại");
    }
  });

  const [openReject, setOpenReject] = useState(false);
  const [reason, setReason] = useState("");

  // ===== Query =====
  const { data, isLoading } = useQuery({
    queryKey: [...ADMIN_PENDING_VENUES_QUERY_KEY, "detail", id],
    queryFn: () => getVenueDetail(id),
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  const businessLicenseImages = data?.businessLicense?.images ?? [];
  const landUseDocumentImages = data?.landUseDocument?.images ?? [];

  return (
    <Box sx={{ p: 4, background: "#f5f7fb", minHeight: "100vh" }}>
      <Box display="flex" justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} gap={2} mb={3} flexWrap="wrap">
        <Box>
          <Typography fontSize={26} fontWeight={700} mb={1}>
            Chi tiết hồ sơ đăng ký sân
          </Typography>
          <Chip label={`Mã hồ sơ: #${data?.venueId ?? id}`} color="warning" variant="outlined" />
        </Box>
        <Button variant="text" onClick={() => navigate("/admin/venue-registrations")}>Quay lại danh sách</Button>
      </Box>

      {/* Info */}
      <Section title="Thông tin cơ sở">
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography><b>Tên:</b> {data?.venueName || "-"}</Typography>
            <Typography><b>Địa chỉ:</b> {data?.address || "-"}</Typography>
            <Typography><b>Mô tả:</b> {data?.description || "-"}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography>
              <b>Giờ:</b> {data?.openTime || "-"} - {data?.closeTime || "-"}
            </Typography>
          </Grid>
        </Grid>
      </Section>

      {/* Owner */}
      <Section title="Chủ sở hữu">
        <Typography><b>Tên:</b> {data?.ownerName || "-"}</Typography>
        <Typography><b>Email:</b> {data?.ownerEmail || "-"}</Typography>
        <Typography><b>Phone:</b> {data?.ownerPhone || "-"}</Typography>
      </Section>

      <Section title="Thông tin tài khoản nhận tiền">
        <Typography><b>Ngân hàng:</b> {data?.ownerBankName || "-"}</Typography>
        <Typography><b>Số tài khoản:</b> {data?.ownerBankAccountNumber || "-"}</Typography>
        <Typography><b>Chủ tài khoản:</b> {data?.ownerAccountHolderName || "-"}</Typography>
      </Section>

      {/* Business License */}
      <Section title="Giấy phép kinh doanh">
        <Typography>
          Ngày cấp: {data?.businessLicense?.issueDate ? dayjs(data.businessLicense.issueDate).format("DD/MM/YYYY") : "-"}
        </Typography>
        <Typography>
          Hết hạn: {data?.businessLicense?.expiryDate ? dayjs(data.businessLicense.expiryDate).format("DD/MM/YYYY") : "-"}
        </Typography>

        <Box mt={2} display="flex" gap={2} flexWrap="wrap">
          {businessLicenseImages.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              style={{
                width: 160,
                height: 110,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          ))}
          {!businessLicenseImages.length && <Typography color="text.secondary">Chưa có ảnh giấy phép kinh doanh.</Typography>}
        </Box>
      </Section>

      {/* Land Doc */}
      <Section title="Giấy tờ đất">
        <Typography>
          Ngày cấp: {data?.landUseDocument?.issueDate ? dayjs(data.landUseDocument.issueDate).format("DD/MM/YYYY") : "-"}
        </Typography>
        <Typography>
          Hết hạn: {data?.landUseDocument?.expiryDate ? dayjs(data.landUseDocument.expiryDate).format("DD/MM/YYYY") : "-"}
        </Typography>

        <Box mt={2} display="flex" gap={2} flexWrap="wrap">
          {landUseDocumentImages.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              style={{
                width: 160,
                height: 110,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          ))}
          {!landUseDocumentImages.length && <Typography color="text.secondary">Chưa có ảnh giấy tờ đất.</Typography>}
        </Box>
      </Section>

      <Divider sx={{ my: 3 }} />

      {/* Actions */}
      <Box display="flex" gap={2}>
        <Button
          variant="contained"
          color="success"
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
        >
          {approveMutation.isPending ? "Đang duyệt..." : "Duyệt"}
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={() => setOpenReject(true)}
        >
          Từ chối
        </Button>
      </Box>

      {/* Reject Dialog */}
      <Dialog open={openReject} onClose={() => setOpenReject(false)}>
        <DialogTitle>Từ chối cơ sở</DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lý do từ chối"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReject(false)}>Huỷ</Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => rejectMutation.mutate()}
            disabled={!reason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? "Đang gửi..." : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};