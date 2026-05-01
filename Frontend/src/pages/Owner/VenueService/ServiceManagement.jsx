import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Pagination,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SportsIcon from "@mui/icons-material/Sports";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ServiceFormDialog from "./ServiceFormDialog";
import { formatVND } from "../../../utils/helperFunction";
import {
  addVenueService,
  deleteVenueService,
  getVenueServices,
  updateVenueService,
} from "../../../services/venueService";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const toastId = "service-toast";
export default function ServiceManagement({ isStaff = false }) {
  const { venueId: paramVenueId, id: paramId } = useParams();
  const vId = paramVenueId || paramId;
  const queryClient = useQueryClient();

  // ================= STATE =================
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formMode, setFormMode] = useState("add");

  // ================= DEBOUNCE =================
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1); // reset page khi tìm kiếm
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // ================= QUERY =================
  const { data, isLoading } = useQuery({
    queryKey: ["services", vId, page, pageSize, debouncedSearch],
    queryFn: () =>
      getVenueServices(Number(vId), page, pageSize, debouncedSearch),
    enabled: !!vId,
    keepPreviousData: true,
  });

  // ================= MUTATIONS =================
  const addMutation = useMutation({
    mutationFn: (data) => addVenueService(vId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", vId] });
      toast.success("Thêm dịch vụ thành công", { toastId });
      setFormDialogOpen(false);
    },
    onError: () => {
      toast.error("Thêm dịch vụ thất bại", { toastId });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateVenueService(vId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", vId] });
      toast.success("Cập nhật dịch vụ thành công", { toastId });
      setFormDialogOpen(false);
    },
    onError: () => {
      toast.error("Cập nhật dịch vụ thất bại", { toastId });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteVenueService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", vId] });
      toast.success("Xóa dịch vụ thành công", { toastId });
    },
    onError: () => {
      toast.error("Xóa dịch vụ thất bại", { toastId });
    },
  });

  // ================= HANDLERS =================
  const handleAddClick = () => {
    setSelectedService(null);
    setFormMode("add");
    setFormDialogOpen(true);
  };

  const handleEditClick = (service) => {
    setSelectedService(service);
    setFormMode("edit");
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (service) => {
    Swal.fire({
      title: "Bạn có chắc chắn muốn xóa dịch vụ này?",
      text: service.serviceName,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(service.id);
      }
    });
  };

  const handleFormSubmit = (data) => {
    if (formMode === "add") {
      addMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: data.id, data });
    }
  };

  // ================= RENDER =================
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Container maxWidth="lg">
        {/* HEADER */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
            color: "white",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SportsIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                Quản lý dịch vụ
              </Typography>
            </Box>

            {!isStaff && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
                sx={{
                  backgroundColor: "white",
                  color: "#16a34a",
                  fontWeight: 600,
                  px: 3,
                  "&:hover": {
                    backgroundColor: "#f0fdf4",
                  },
                  borderRadius: 50,
                  textTransform: "none",
                }}
              >
                Thêm dịch vụ
              </Button>
            )}
          </Box>
        </Paper>

        {/* SEARCH */}
        <TextField
          fullWidth
          label="Tìm kiếm"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "40px",
            },
            mb: 2,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* TABLE */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                    Dịch vụ
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: "#475569" }}
                    align="right"
                  >
                    Giá
                  </TableCell>
                    {!isStaff && (
                      <TableCell
                        sx={{ fontWeight: 600, color: "#475569", width: 100 }}
                        align="center"
                      >
                        Thao tác
                      </TableCell>
                    )}
                </TableRow>
              </TableHead>

              <TableBody>
                {data?.items?.length > 0 ? (
                  data?.items.map((service) => (
                    <TableRow
                      key={service.id}
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            src={service.imageUrl}
                            variant="rounded"
                            sx={{
                              width: 48,
                              height: 48,
                              border: "1px solid #e2e8f0",
                            }}
                          />
                          <Box>
                            <Typography fontWeight={500} color="#1e293b">
                              {service.serviceName}
                            </Typography>

                            {service.description && (
                              <Typography
                                variant="body2"
                                color="#64748b"
                                sx={{
                                  mt: 0.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {service.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={600} color="#16a34a">
                          {formatVND(service.price)}
                        </Typography>
                      </TableCell>

                      {!isStaff && (
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={0.5}>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(service)}
                                sx={{
                                  color: "#0ea5e9",
                                  "&:hover": { backgroundColor: "#e0f2fe" },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Xóa">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(service)}
                                sx={{
                                  color: "#ef4444",
                                  "&:hover": { backgroundColor: "#fee2e2" },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Box sx={{ py: 6, textAlign: "center" }}>
                        <SportsIcon
                          sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }}
                        />
                        <Typography color="#64748b">
                          Không tìm thấy dịch vụ
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Stack justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
                  <Pagination
                    page={parseInt(page)}
                    count={data?.totalPages}
                    onChange={(e, v) => setPage(v)}
                    color="success"
                  />
                </Stack>

        {/* DIALOG */}
        <ServiceFormDialog
          open={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={selectedService}
          mode={formMode}
          isLoading={addMutation.isPending || updateMutation.isPending}
        />
      </Container>
    </Box>
  );
}
