import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CircularProgress,
  Pagination,
  Stack,  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { getOwners } from "../../../services/adminService";
import "../FinanceAdminManagement/FinanceAdminManagement.css";
import StadiumIcon from '@mui/icons-material/Stadium';



const getInitials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const PAGE_SIZE = 10;

const AdminOwners = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 2000);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    searchTerm: debouncedSearch.trim() || undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminOwners", queryParams],
    queryFn: () => getOwners(queryParams),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const owners = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;



  return (
    <Box
      className="finance-admin-page"
      sx={{
        px: { xs: 2, md: 3 },
        pb: 6,
        minHeight: "100vh",
        fontFamily: "Be Vietnam Pro, sans-serif",
        "&, & *": { fontFamily: "Be Vietnam Pro, sans-serif" },
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: { xs: 26, md: 34 },
            fontWeight: 800,
            color: "#191c1d",
            letterSpacing: -0.6,
          }}
        >
          Hồ sơ chủ sân
        </Typography>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || error?.message || "Không thể tải danh sách chủ sân."}
        </Alert>
      )}

      {isLoading ? (
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={18} />
            <Typography sx={{ color: "#4a4455" }}>Đang tải danh sách chủ sân...</Typography>
          </Stack>
        </Card>
      ) : (
        <>
          <Stack spacing={2}>
            {owners.map((item) => {
              const name = item.fullName ?? item.name ?? item.ownerName ?? "";
              const venueCount = item.totalVenues ?? 0;
              const fieldCount = item.totalFields ?? 0;

              return (
                <Card
                  key={item.id ?? item.ownerId}
                  onClick={() => navigate(`/admin/owners/${item.id ?? item.ownerId}`)}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    position: "relative",
                    overflow: "visible",
                    cursor: "pointer",
                    transition: "box-shadow 0.18s ease, transform 0.18s ease",
                    "&:hover": {
                      boxShadow: "0 12px 32px rgba(59,130,246,0.14)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 14 }}>
                    <Avatar
                      sx={{
                        width: 46,
                        height: 46,
                        fontWeight: 800,
                        color: "#0f5132",
                        backgroundColor: "#d1fae5",
                      }}
                    >
                      {getInitials(name)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#191c1d", fontSize: 18 }}>
                        {name || "Chưa có tên"}
                      </Typography>
                      {(item.id ?? item.ownerId) && (
                        <Typography sx={{ fontSize: 12, color: "#7b7487" }}>
                          {item.id ?? item.ownerId}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  <Stack spacing={1.15} sx={{ mt: 2.2, pt: 1.4, borderTop: "1px solid #e1e3e4" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.8, sm: 3 }}>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <MailOutlineRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {item.email || "-"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <PhoneRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {item.phoneNumber ?? item.phone ?? "-"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <StorefrontRoundedIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {venueCount} cơ sở
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <StadiumIcon sx={{ color: "#7b7487", fontSize: 18 }} />
                        <Typography sx={{ color: "#4a4455", fontSize: 14 }}>
                          {fieldCount} sân 
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}

            {owners.length === 0 && (
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Typography sx={{ color: "#4a4455" }}>
                  Không tìm thấy chủ sân phù hợp bộ lọc đã chọn.
                </Typography>
              </Card>
            )}
          </Stack>

          {totalPages > 1 && (
            <Stack alignItems="center" sx={{ mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

export default AdminOwners;
