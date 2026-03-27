import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import StaffVenueGroup from "./StaffVenueGroup";
import CreateStaffDialog from "./CreateStaffDialog";
import "./StaffList.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOwnerStaff,
  getOwnerStaffList,
  toggleStaffStatus,
} from "../../../services/ownerService";
import LoadingPage from "../../../components/ui/Loading/LoadingPage";
import ErrorPage from "../../../components/ui/Error/ErrorPage";

export default function StaffList() {
  const queryClient = useQueryClient();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ownerStaffList"],
    queryFn: getOwnerStaffList,
    staleTime: 5 * 60 * 1000, // 5 phút
  });

  const toggleMutation = useMutation({
    mutationFn: (staffId) => toggleStaffStatus(staffId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ownerStaffList"] });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload) => createOwnerStaff(payload),
    onSuccess: async () => {
      setOpenCreateDialog(false);
      await queryClient.invalidateQueries({ queryKey: ["ownerStaffList"] });
    },
  });

  const venueGroups = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const totals = useMemo(() => {
    const staffCount = venueGroups.reduce(
      (sum, venue) => sum + (venue.staffs?.length || 0),
      0
    );
    const activeCount = venueGroups.reduce(
      (sum, venue) =>
        sum +
        (venue.staffs?.filter((staff) => staff.status === "Active").length ||
          0),
      0
    );
    return {
      venueCount: venueGroups.length,
      staffCount,
      activeCount,
    };
  }, [venueGroups]);

  const handleToggleStatus = (_venueId, staffId) => {
    toggleMutation.mutate(staffId);
  };

  const venueOptions = useMemo(
    () => venueGroups.map((venue) => ({ venueId: venue.venueId, venueName: venue.venueName })),
    [venueGroups]
  );

  const handleCreateStaff = (payload) => {
    createStaffMutation.mutate(payload);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError) {
    return (
      <ErrorPage/>  
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Paper elevation={0} className="staff-page-shell">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" className="staff-page-title">
              Quản lý nhân viên
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddCircleOutlineRoundedIcon />}
            className="staff-create-btn"
            onClick={() => setOpenCreateDialog(true)}
          >
            Tạo nhân viên mới
          </Button>
        </Stack>

        {createStaffMutation.isError && (
          <Alert severity="error">
            {createStaffMutation.error?.response?.data?.message ||
              createStaffMutation.error?.message ||
              "Không thể tạo nhân viên mới."}
          </Alert>
        )}

        <Stack
          direction="row"
          spacing={1}
          className="staff-summary-row"
          flexWrap="wrap"
        >
          <Chip label={`Cơ sở: ${totals.venueCount}`} color="default" />
          <Chip
            label={`Tổng nhân viên: ${totals.staffCount}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Đang hoạt động: ${totals.activeCount}`}
            color="success"
          />
        </Stack>

        <Stack spacing={2.5}>
          {venueGroups.map((venue) => (
            <StaffVenueGroup
              key={venue.venueId}
              venue={venue}
              onToggleStatus={handleToggleStatus}
              togglingStaffId={toggleMutation.variables}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </Stack>

        <CreateStaffDialog
          open={openCreateDialog}
          venues={venueOptions}
          isSubmitting={createStaffMutation.isPending}
          onClose={() => setOpenCreateDialog(false)}
          onSubmit={handleCreateStaff}
        />
      </Paper>
    </Container>
  );
}
