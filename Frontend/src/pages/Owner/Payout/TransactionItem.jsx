"use client";

import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Avatar,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { formatVND } from './../../../utils/helperFunction';

const statusKeyMap = {
  "Đang chờ": "Pending",
  "Đang xử lý": "Processing",
  "Thất bại": "Failed",
  "Đã nhận": "Completed",
};

export const TransactionItem = ({ title, amount, dateRange, status, statusKey: statusKeyProp, icon }) => {
  const statusKey = statusKeyProp || statusKeyMap[status] || status;
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return { bg: "#009668", text: "#ffffff" };
      case "Pending":
        return { bg: "#d5e3fc", text: "#57657a" };
      case "Processing":
        return { bg: "#e8def8", text: "#6750a4" };
      case "Failed":
        return { bg: "#ffdad6", text: "#93000a" };
      default:
        return { bg: "#e0e3e5", text: "#45464d" };
    }
  };
  const getIconColor = (status) => {
    switch (status) {
      case "Completed":
        return { bg: "rgba(79, 222, 163, 0.2)", text: "#005236" };
      case "Pending":
        return { bg: "rgba(213, 227, 252, 0.5)", text: "#57657a" };
      case "Processing":
        return { bg: "rgba(232, 222, 248, 0.5)", text: "#6750a4" };
      case "Failed":
        return { bg: "rgba(255, 218, 214, 0.4)", text: "#93000a" };
      default:
        return { bg: "#e0e3e5", text: "#45464d" };
    }
  };
  const statusColor = getStatusColor(statusKey);
  const iconColor = getIconColor(statusKey);

  const defaultIconMap = {
    Completed: <AccountBalanceWalletIcon sx={{ fontSize: "1.5rem" }} />,
    Pending: <ScheduleIcon sx={{ fontSize: "1.5rem" }} />,
    Processing: <ScheduleIcon sx={{ fontSize: "1.5rem" }} />,
    Failed: <ErrorOutlineIcon sx={{ fontSize: "1.5rem" }} />,
  };

  const defaultIcon = defaultIconMap[statusKey?.trim()] || (
    <AccountBalanceWalletIcon sx={{ fontSize: "1.5rem" }} />
  );

  return (
    <Card
      sx={{
        borderRadius: 3,
        p: 2,
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:active": {
          transform: "scale(0.98)",
        },
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 0,
          "&:last-child": {
            pb: 0,
          },
        }}
      >
        {/* Icon Avatar */}
        <Avatar
          sx={{
            width: 48,
            height: 48,
            backgroundColor: iconColor.bg,
            color: iconColor.text,
          }}
        >
          {icon || defaultIcon}
        </Avatar>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "1rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: "inherit",
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1rem",
                color: statusKey === "Failed" ? "#ba1a1a" : "#000",
                fontFamily: "inherit",
              }}
            >
              {formatVND(amount)}
            </Typography>
          </Box>

          {/* Date Range and Status */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.75rem",
                color: "#45464d",
                fontFamily: "inherit",
              }}
            >
              {dateRange}
            </Typography>
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: "#76777d",
              }}
            />
            <Chip
              label={status}
              size="small"
              sx={{
                height: "20px",
                fontSize: "0.625rem",
                fontWeight: 700,
                backgroundColor: statusColor.bg,
                color: statusColor.text,
                textTransform: "none",
                letterSpacing: "0.5px",
              }}
            />
          </Box>
        </Box>

        {/* Chevron */}
        <ChevronRightIcon sx={{ color: "#76777d" }} />
      </CardContent>
    </Card>
  );
};
