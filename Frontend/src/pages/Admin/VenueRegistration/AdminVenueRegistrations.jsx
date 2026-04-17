// pages/admin/AdminVenueRegistrations.jsx

import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Pagination,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { getPendingVenues } from "../../../services/adminService";

export const AdminVenueRegistrations = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["pending-venues", page, pageSize],
    queryFn: () => getPendingVenues({ page, pageSize }),
  });

  return (
    <Box sx={{ p: 4, minHeight: "100vh", background: "#f5f7fb" }}>
      <Typography sx={{ fontSize: 26, fontWeight: 700, mb: 3 }}>
        Cơ sở chờ duyệt
      </Typography>

      <Paper
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : data?.items?.length === 0 ? (
          <Box py={6} textAlign="center">
            <Typography color="text.secondary">
              Không có dữ liệu
            </Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ background: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tên cơ sở</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Chủ sở hữu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày gửi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.items.map((venue) => (
                  <TableRow
                    key={venue.venueId}
                    hover
                    onClick={() =>
                      navigate(`/admin/venue/${venue.venueId}`)
                    }
                    sx={{
                      cursor: "pointer",
                      transition: "0.2s",
                      "&:hover": {
                        backgroundColor: "#f6faff",
                      },
                    }}
                  >
                    <TableCell>{venue.venueId}</TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {venue.venueName}
                    </TableCell>

                    <TableCell>{venue.ownerName}</TableCell>

                    <TableCell>
                      {dayjs(venue.submittedDate).format(
                        "DD/MM/YYYY HH:mm"
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label="Chờ duyệt"
                        sx={{
                          backgroundColor: "#fff7e6",
                          color: "#d48806",
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box display="flex" justifyContent="flex-end" p={2}>
              <Pagination
                count={data.totalPages || 1}
                page={page}
                onChange={(_, v) => setPage(v)}
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};