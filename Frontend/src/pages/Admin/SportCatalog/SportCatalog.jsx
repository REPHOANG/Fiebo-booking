import React, { memo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SportsRoundedIcon from "@mui/icons-material/SportsRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  createSportTypeAdmin,
  getSportTypesAdmin,
  updateSportTypeAdmin,
} from "../../../services/adminService";
import SportTypeFormDialog from "./SportTypeFormDialog";

const sportVisual = {
  icon: SportsRoundedIcon,
  color: "#0049e6",
  stripe: "#0049e6",
};

const SportTypeCard = memo(({ sport, onEdit }) => {
  const IconComp = sportVisual.icon;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2.5,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        transition: "all 220ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 16px 30px rgba(15, 24, 56, 0.1)",
        },
      }}
    >
      <Box sx={{ height: 8, bgcolor: sportVisual.stripe, opacity: 0.22 }} />
      <Box sx={{ p: 2.25, display: "flex", flexDirection: "column", flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              backgroundColor: `${sportVisual.color}1F`,
              color: sportVisual.color,
            }}
          >
            <IconComp sx={{ fontSize: 32 }} />
          </Box>

          <Stack direction="row" spacing={0.8}>
            <Tooltip title="Chỉnh sửa">
              <IconButton
                size="small"
                onClick={() => onEdit(sport)}
                sx={{
                  bgcolor: "#ecebfd",
                  color: "#0049e6",
                  "&:hover": {
                    bgcolor: "#0049e6",
                    color: "#ffffff",
                  },
                }}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Xóa chưa được hỗ trợ từ API">
              <span>
                <IconButton
                  size="small"
                  disabled
                  sx={{
                    bgcolor: "#fde9ef",
                    color: "#b41340",
                  }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Typography sx={{ fontWeight: 800, fontSize: 20, color: "#2a2b51", lineHeight: 1.1 }}>
          {sport.name}
        </Typography>

      </Box>
    </Card>
  );
});

const SportCatalog = () => {
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSport, setEditingSport] = useState(null);

  const {
    data: sports = [],
    isLoading,
  } = useQuery({
    queryKey: ["adminSportTypes"],
    queryFn: getSportTypesAdmin,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (rows) => {
      const list = Array.isArray(rows) ? rows : [];
      return list
        .map((item) => ({
          id: Number(item?.id ?? item?.sportTypeId ?? item?.SportTypeId),
          name: String(item?.name ?? item?.sportTypeName ?? item?.SportTypeName ?? "").trim(),
        }))
        .filter((item) => Number.isFinite(item.id) && item.name.length > 0);
    },
  });

  const createMutation = useMutation({
    mutationFn: createSportTypeAdmin,
    onSuccess: async () => {
      toast.success("Thêm môn thể thao thành công!");
      setOpenCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["adminSportTypes"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSportTypeAdmin(id, payload),
    onSuccess: async () => {
      toast.success("Cập nhật môn thể thao thành công!");
      setEditingSport(null);
      await queryClient.invalidateQueries({ queryKey: ["adminSportTypes"] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message || err?.message || "Không thể cập nhật môn thể thao.";
      toast.error(message);
    }
  });

  const updateSportHandler = (payload) => {
    if (!editingSport?.id) return;
    updateMutation.mutate({ id: editingSport.id, payload });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 4 },
        py: { xs: 2.5, md: 4 },
        fontFamily: "Be Vietnam Pro, sans-serif !important",
        "&, & *": {
          fontFamily: "Be Vietnam Pro, sans-serif !important",
        },
      }}
    >
      <Box>
        <Box
          sx={{
            mb: 4,
          }}
        >
          <Stack
            direction={"row"}
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Box>
              <Typography
                sx={{
                  color: "#22264d",
                  fontWeight: 900,
                  fontSize: 30,
                  lineHeight: 1.06,
                  letterSpacing: -0.9,
                }}
              >
                Danh mục môn thể thao
              </Typography>
            </Box>

            <Button
              onClick={() => setOpenCreate(true)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
              sx={{
                borderRadius: 999,

                textTransform: "none",
                fontWeight: 800,
                fontSize: 12,
                background: "linear-gradient(125deg, #0049e6 0%, #6a89ff 100%)",
              }}
            >
              Thêm môn thể thao
            </Button>
          </Stack>
        </Box>

        {isLoading ? (
          <Card sx={{ borderRadius: 3, p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <CircularProgress size={18} />
              <Typography>Đang tải danh sách môn thể thao...</Typography>
            </Stack>
          </Card>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2.25,
            }}
          >
            {sports.map((sport) => (
              <SportTypeCard key={sport.id} sport={sport} onEdit={setEditingSport} />
            ))}

            {sports.length === 0 ? (
              <Card sx={{ p: 3, borderRadius: 3, gridColumn: "1 / -1" }}>
                <Typography sx={{ color: "#4a4455" }}>
                  Chưa có môn thể thao nào trong hệ thống.
                </Typography>
              </Card>
            ) : null}
          </Box>
        )}
      </Box>

      <SportTypeFormDialog
        open={openCreate}
        mode="create"
        loading={createMutation.isPending}
        onClose={() => setOpenCreate(false)}
        onSubmit={createMutation.mutate}
      />

      <SportTypeFormDialog
        open={!!editingSport}
        mode="edit"
        initialValue={editingSport?.name || ""}
        loading={updateMutation.isPending}
        onClose={() => setEditingSport(null)}
        onSubmit={updateSportHandler}
      />
    </Box>
  );
};

export default SportCatalog;
