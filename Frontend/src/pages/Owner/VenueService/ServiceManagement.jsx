import { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Pagination,
  InputAdornment,
  Paper,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SportsIcon from "@mui/icons-material/Sports";
import ServiceFormDialog from "./ServiceFormDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { formatVND } from "../../../utils/helperFunction";
// Service Types
const SERVICE_TYPES = [
  { value: "food", label: "Đồ ăn" },
  { value: "drink", label: "Đồ uống" },
  { value: "equipment", label: "Thiết bị thể thao" },
  { value: "rental", label: "Cho thuê" },
  { value: "other", label: "Khác" },
];

// Mock initial services data
const initialServices = [
  {
    id: "1",
    name: "Nước suối",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=200&fit=crop",
    type: "drink",
    price: 10000,
  },
  {
    id: "2",
    name: "Nước tăng lực Redbull",
    image:
      "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop",
    type: "drink",
    price: 25000,
  },
  {
    id: "3",
    name: "Bánh mì thịt nướng",
    image:
      "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=300&h=200&fit=crop",
    type: "food",
    price: 30000,
  },
  {
    id: "4",
    name: "Thuê vợt cầu lông",
    image:
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&h=200&fit=crop",
    type: "equipment",
    price: 50000,
  },
  {
    id: "5",
    name: "Thuê giày bóng đá",
    image:
      "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&h=200&fit=crop",
    type: "rental",
    price: 40000,
  },
  {
    id: "6",
    name: "Coca Cola",
    image:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=200&fit=crop",
    type: "drink",
    price: 15000,
  },
  {
    id: "7",
    name: "Mì gói ăn liền",
    image:
      "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&h=200&fit=crop",
    type: "food",
    price: 20000,
  },
  {
    id: "8",
    name: "Thuê bóng đá",
    image:
      "https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=300&h=200&fit=crop",
    type: "rental",
    price: 30000,
  },
];

const ITEMS_PER_PAGE = 8;

// Type color mapping
const TYPE_COLORS = {
  food: { bg: "#fef3c7", text: "#b45309", label: "Đồ ăn" },
  drink: { bg: "#dbeafe", text: "#1d4ed8", label: "Đồ uống" },
  equipment: { bg: "#f3e8ff", text: "#7c3aed", label: "Thiết bị" },
  rental: { bg: "#d1fae5", text: "#059669", label: "Cho thuê" },
  other: { bg: "#f1f5f9", text: "#475569", label: "Khác" },
};

export default function ServiceManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [services, setServices] = useState(initialServices);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formMode, setFormMode] = useState("add");

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || service.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [services, searchTerm, filterType]);

  // Paginated services
  const paginatedServices = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredServices, page]);

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);

  // Handlers
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
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data) => {
    if (formMode === "add") {
      setServices((prev) => [data, ...prev]);
    } else {
      setServices((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    }
    setFormDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    setServices((prev) => prev.filter((s) => s.id !== selectedService?.id));
    setDeleteDialogOpen(false);
    setSelectedService(null);
    if (paginatedServices.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  // Count by type
  const typeCounts = useMemo(() => {
    const counts = { all: services.length };
    SERVICE_TYPES.forEach((type) => {
      counts[type.value] = services.filter((s) => s.type === type.value).length;
    });
    return counts;
  }, [services]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
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
              <Box>
                <Typography variant="h5" fontWeight={700} fontFamily={"inherit"}>
                  Quản lý dịch vụ
                </Typography>
              </Box>
            </Box>
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
          </Box>
        </Paper>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Search and Select Filter */}
          <TextField
            variant="outlined"
            label="Tìm kiếm"
            size="small"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "40px",
              },
              "& .MuiInputLabel-root": {
                color: "gray",
              },
              mb: 2,
              borderColor: "#0ff007",
              
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Type Chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Tất cả (${typeCounts.all})`}
              size="small"
              onClick={() => {
                setFilterType("all");
                setPage(1);
              }}
              sx={{
                fontWeight: 500,
                backgroundColor: filterType === "all" ? "#16a34a" : "#f1f5f9",
                color: filterType === "all" ? "white" : "#475569",
                "&:hover": {
                  backgroundColor: filterType === "all" ? "#15803d" : "#e2e8f0",
                },
              }}
            />
            {SERVICE_TYPES.map((type) => (
              <Chip
                key={type.value}
                label={`${type.label} (${typeCounts[type.value] || 0})`}
                size="small"
                onClick={() => {
                  setFilterType(type.value);
                  setPage(1);
                }}
                sx={{
                  fontWeight: 500,
                  backgroundColor:
                    filterType === type.value ? "#16a34a" : "#f1f5f9",
                  color: filterType === type.value ? "white" : "#475569",
                  "&:hover": {
                    backgroundColor:
                      filterType === type.value ? "#15803d" : "#e2e8f0",
                  },
                }}
              />
            ))}
          </Stack>
        </Paper>

        {/* Table */}
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
                  <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                    Loại
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: "#475569" }}
                    align="right"
                  >
                    Giá
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: "#475569", width: 100 }}
                    align="center"
                  >
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedServices.length > 0 ? (
                  paginatedServices.map((service) => (
                    <TableRow
                      key={service.id}
                      sx={{
                        "&:hover": { backgroundColor: "#f8fafc" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <Avatar
                            src={service.image}
                            variant="rounded"
                            sx={{
                              width: 48,
                              height: 48,
                              border: "1px solid #e2e8f0",
                            }}
                          />
                          <Typography fontWeight={500} color="#1e293b">
                            {service.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            TYPE_COLORS[service.type]?.label || service.type
                          }
                          size="small"
                          sx={{
                            backgroundColor:
                              TYPE_COLORS[service.type]?.bg || "#f1f5f9",
                            color: TYPE_COLORS[service.type]?.text || "#475569",
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="#16a34a">
                          {formatVND(service.price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4}>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <Typography variant="body2" color="#64748b">
                Hiển thị {paginatedServices.length} / {filteredServices.length}{" "}
                dịch vụ
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                size={isMobile ? "small" : "medium"}
                sx={{
                  "& .Mui-selected": {
                    backgroundColor: "#16a34a !important",
                    color: "white",
                  },
                }}
              />
            </Box>
          )}
        </Paper>

        {/* Dialogs */}
        <ServiceFormDialog
          open={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={selectedService}
          mode={formMode}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          serviceName={selectedService?.name}
        />
      </Container>
    </Box>
  );
}
