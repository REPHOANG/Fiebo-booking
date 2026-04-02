import {
  Box,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatDateTime } from "../../../utils/helperFunction";

export default function StaffVenueGroup({
  venue,
  onToggleStatus,
  isToggling = false,
  togglingStaffId = null,
}) {
  const activeCount = venue.staffs.filter((staff) => staff.status === "Active").length;
  const getStatusLabel = (status) => (status === "Active" ? "Đang hoạt động" : "Đã vô hiệu hóa");

  return (
    <Paper elevation={0} className="staff-venue-card">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1}
        className="staff-venue-head"
      >
        <Box>
          <Typography variant="h6" className="staff-venue-title">
            {venue.venueName}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={`Nhân viên: ${venue.staffs.length}`} size="small" variant="outlined" />
          <Chip label={`Đang hoạt động: ${activeCount}`} size="small" color="success" />
        </Stack>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell>Tài khoản</TableCell>
              <TableCell>Ngày tạo</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {venue.staffs.map((staff) => {
              const isActive = staff.status === "Active";
              return (
                <TableRow key={staff.staffId} hover>
                  <TableCell>{staff.fullName}</TableCell>
                  <TableCell>{staff.username}</TableCell>
                  <TableCell>{formatDateTime(staff.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getStatusLabel(staff.status)}
                      color={isActive ? "success" : "default"}
                      variant={isActive ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isActive}
                          color="success"
                          disabled={isToggling && togglingStaffId === staff.staffId}
                          onChange={() => onToggleStatus(venue.venueId, staff.staffId)}
                        />
                      }
                      
                      sx={{ mr: 0 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}