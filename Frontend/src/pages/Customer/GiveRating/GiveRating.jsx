import {
  Modal,
  Box,
  Typography,
  Backdrop,
  Container,
  Rating,
  TextField,
  Stack,
  Button,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { giveRatingApi } from "../../../services/reviewService";

const style = {
  position: "absolute",
  top: "20%",
  left: "50%",
  transform: "translate(-50%, -20%)",
  width: "40vw",
  bgcolor: "background.paper",
  borderRadius: "5px",
  boxShadow: 24,
  px: 2.5,
  py: 5,
};
export default function GiveRating({ open = true, handleClose, bookingId = 1 }) {
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: giveRatingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookingHistory"] });
      toast.success("Gửi đánh giá thành công!");
      setRating(0);
      setImages([]);
      setComment(null);
      handleClose();
    },
  });
  const handleSubmit = () => {
    if (rating < 1) {
      setError("Vui lòng chọn số sao để đánh giá sân trước khi gửi phản hồi.");
      return;
    }
    mutation.mutate({ bookingId, rating, comment, images });
  };

  const handleClickUpload = () => {
    fileInputRef.current.click();
  };
  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };
  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];

    let newImages = [...images];

    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error("Chỉ chấp nhận jpg, jpeg, png, webp, svg");
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ảnh không được vượt quá 5MB");
        continue;
      }

      if (newImages.length >= 5) {
        toast.error("Bạn chỉ có thể tải lên tối đa 5 ảnh");
        break;
      }

      newImages.push(file);
    }

    setImages(newImages);
    e.target.value = "";
  };

  return (
    <div>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Box sx={style}>
          <IconButton
            onClick={handleClose}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Container sx={{ width: "100%" }}>
            <Typography
              id="modal-modal-title"
              variant="h6"
              sx={{ fontSize: "1.6rem", fontFamily: "Be Vietnam Pro" }}
            >
              Đánh giá
            </Typography>
            <Typography
              id="modal-modal-description"
              sx={{
                pt: 2,
                fontWeight: 400,
                fontFamily: "Be Vietnam Pro",
                fontSize: "0.9rem",
              }}
            >
              Bạn có hài lòng với trải nghiệm đặt sân? Hãy cho chúng tôi biết
              cảm nhận của bạn để cải thiện dịch vụ.
            </Typography>
            <Stack direction={"row"} sx={{ justifyContent: "center", py: 1 }}>
              <Rating
                precision={0.5}
                sx={{ fontSize: 45 }}
                value={rating}
                onChange={(_event, newValue) => {
                  setRating(newValue);
                  setError(null);
                }}
              />
            </Stack>
            {error && (
              <Typography
                variant="span"
                sx={{ fontSize: "0.8rem", fontWeight: 400, color: "red" }}
              >
                {error}
              </Typography>
            )}
            {/* IMAGE UPLOAD */}
            <Stack direction="row" sx={{ py: 1, gap: 1 }}>
              {/* ⭐ PREVIEW IMAGES */}
              {images.map((img, index) => (
                <Box
                  key={index}
                  sx={{
                    position: "relative",
                    width: 55,
                    height: 55,
                  }}
                >
                  <img
                    src={URL.createObjectURL(img)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 5,
                      border: "1px solid #ccc",
                    }}
                  />

                  <DeleteIcon
                    sx={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      fontSize: "18px",
                      "&:hover": {
                        color: "#e41a1a",
                      },
                      cursor: "pointer",
                    }}
                    onClick={() => handleRemoveImage(index)}
                  />
                </Box>
              ))}

              {/* ⭐ ADD BUTTON LUÔN BÊN PHẢI */}
              {images.length < 5 && (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 55,
                    aspectRatio: "1/1",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: "#888",
                    },
                  }}
                  onClick={handleClickUpload}
                >
                  <AddIcon
                    sx={{
                      fontSize: 30,
                      color: "#ccc",
                      "&:hover": {
                        color: "#888",
                      },
                    }}
                  />
                </Stack>
              )}
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept=".jpg,.jpeg,.png,.webp,.svg"
              onChange={handleAddImages}
            />

            <TextField
              fullWidth
              multiline
              rows={5}
              variant="outlined"
              placeholder="Viết phản hồi của bạn tại đây..."
              onChange={(e) => setComment(e.target.value)}
              inputProps={{ maxLength: 250 }}
            />
            <Stack direction={"row"} sx={{ gap: 1, pt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={mutation.isPending}
                sx={{
                  width: "50%",
                  borderWidth: 1.5,
                  fontSize: "0.95rem",
                  fontFamily: "Be Vietnam Pro",
                }}
                size="large"
              >
                Huỷ
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                sx={{
                  width: "50%",
                  fontSize: "0.95rem",
                  fontFamily: "Be Vietnam Pro",
                }}
              >
                {mutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            </Stack>
          </Container>
        </Box>
      </Modal>
    </div>
  );
}
