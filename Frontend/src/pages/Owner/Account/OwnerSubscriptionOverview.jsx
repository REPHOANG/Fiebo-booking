import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getOwnerSubscriptionOverview,
} from "../../../services/subscriptionService";
import "./OwnerProfile.css";

const formatMoney = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(n) || 0,
  );

const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
};

const formatDateTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const statusLabelMap = {
  1: "Đang hoạt động",
  0: "Đã hết hạn",
};

const getStatusChipClass = (status) => {
  const normalized = Number(status);
  if (normalized === 1) return "op-status-chip op-status-chip--active";
  if (normalized === 0) return "op-status-chip op-status-chip--expired";
  return "op-status-chip op-status-chip--unknown";
};

const OwnerSubscriptionOverview = () => {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["owner-subscription-overview"],
    queryFn: getOwnerSubscriptionOverview,
  });

  const currentPlan = overview?.currentPlan ?? null;
  const purchaseHistory = useMemo(
    () =>
      Array.isArray(overview?.purchaseHistory) ? overview.purchaseHistory : [],
    [overview?.purchaseHistory],
  );
  const historyPreview = useMemo(
    () => purchaseHistory.slice(0, 4),
    [purchaseHistory],
  );

  return (
    <div className="op-subscription">
      <header className="op-header">
        <div>
          <h1>Thông tin gói dịch vụ</h1>
          <div className="op-sub-header-overview">
            {overviewLoading ? (
              <p className="op-sub">Đang tải thông tin gói hiện tại...</p>
            ) : (
              <>
                <div className="op-sub-header-metrics">
                  <div className="op-sub-header-metric">
                    <span>Gói hiện tại</span>
                    <strong>{currentPlan?.planName || "Chưa có"}</strong>
                  </div>
                  <div className="op-sub-header-metric">
                    <span>Còn lại</span>
                    <strong>
                      {currentPlan
                        ? `${Math.max(0, Number(currentPlan.remainingDays) || 0)} ngày`
                        : "-"}
                    </strong>
                  </div>
                  <div className="op-sub-header-metric">
                    <span>Hết hạn</span>
                    <strong>{formatDateTime(currentPlan?.endDate)}</strong>
                  </div>
                  <div className="op-sub-header-metric">
                    <span>Trạng thái</span>
                    <strong>
                      {currentPlan
                        ? (
                          <span className={getStatusChipClass(currentPlan.status)}>
                            {statusLabelMap[currentPlan.status] ?? "Không xác định"}
                          </span>
                        )
                        : "-"}
                    </strong>
                  </div>
                  
                </div>

                {historyPreview.length > 0 ? (
                  <ul className="op-sub-history-preview">
                    {historyPreview.map((item) => (
                      <li key={`${item.planId}-${item.createdAt}`} className="op-sub-history-item">
                        <div className="op-sub-history-main">
                          <p className="op-sub-history-name">{item.planName}</p>
                          <p className="op-sub-history-meta">
                            Plan ID: {item.planId} · Mua lúc: {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        <div className="op-sub-history-right">
                          <strong>{formatMoney(item.price)}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="op-sub">Chưa có lịch sử mua gói.</p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="op-actions-row" style={{ display: "flex", gap: 10 }}>
          <Link to="/owner/subscription/plans" className="op-btn op-btn--primary">
            Mua gói
          </Link>
        </div>
      </header>
    </div>
  );
};

export default OwnerSubscriptionOverview;
