import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Wallet, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { getWalletBalance } from "../../../services/walletService";
import {
  getOwnerSubscriptionOverview,
  getOwnerSubscriptionPlans,
  subscribeOwnerToPlan,
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

const errMessage = (e) =>
  e?.response?.data?.message ??
  e?.response?.data?.Message ??
  e?.message ??
  "Có lỗi xảy ra. Vui lòng thử lại.";

const MSG_SUCCESS = "Đăng ký gói thành công. Gói của bạn đã được kích hoạt.";

const OwnerSubscription = ({
  embedded = false,
  showWalletCard = true,
  showPageHeader = !embedded,
}) => {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  const { data: walletInfo, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: getWalletBalance,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["owner-subscription-plans"],
    queryFn: getOwnerSubscriptionPlans,
  });

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
  const historyCount = purchaseHistory.length;
  const historyPreview = useMemo(
    () => purchaseHistory.slice(0, 4),
    [purchaseHistory],
  );

  const balance = Number(walletInfo?.balance ?? 0);
  const selectedPlan = useMemo(
    () => plans.find((p) => Number(p.id) === Number(selectedPlanId)) ?? null,
    [plans, selectedPlanId],
  );

  const planPrice = selectedPlan ? Number(selectedPlan.price || 0) : 0;
  const shortfall = Math.max(0, planPrice - balance);
  const sufficient = selectedPlan && balance >= planPrice;

  const planVariant = (plan, idx) => {
    const name = String(plan?.name || "").toLowerCase();
    if (name.includes("vip")) return "vip";
    if (
      name.includes("chuy") ||
      name.includes("pro") ||
      name.includes("chuyên")
    )
      return "pro";
    if (name.includes("basic") || name.includes("cơ bản")) return "basic";
    if (idx === 0) return "basic";
    if (idx === 1) return "pro";
    return "vip";
  };

  const planPillLabel = (variant) => {
    if (variant === "vip") return "Gói VIP";
    if (variant === "pro") return "Gói Chuyên nghiệp";
    return "Gói cơ bản";
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !sufficient) return;
    setSubscribing(true);
    try {
      const { message } = await subscribeOwnerToPlan(selectedPlan.id);
      toast.success(message?.trim() ? message : MSG_SUCCESS);
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      queryClient.invalidateQueries({ queryKey: ["owner-subscription-overview"] });
      setSelectedPlanId(null);
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div
      className={`op-subscription ${embedded ? "op-subscription--embedded" : ""}`}
    >
      {showPageHeader ? (
        <header className="op-header">
          <div>
            <h1>Gói dịch vụ</h1>
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
                      <strong>{formatDate(currentPlan?.endDate)}</strong>
                    </div>
                    <div className="op-sub-header-metric">
                      <span>Lịch sử mua</span>
                      <strong>{historyCount} lần</strong>
                    </div>
                  </div>

                  {historyPreview.length > 0 ? (
                    <ul className="op-sub-history-preview">
                      {historyPreview.map((item) => (
                        <li key={item.ownerPlanId} className="op-sub-history-item">
                          <div className="op-sub-history-main">
                            <p className="op-sub-history-name">{item.planName}</p>
                            <p className="op-sub-history-meta">
                              Mua lúc: {formatDateTime(item.paidAt)}
                            </p>
                          </div>
                          <div className="op-sub-history-right">
                            <strong>{formatMoney(item.amountPaid)}</strong>
                            <span
                              className={`op-sub-history-badge ${
                                item.isExpired
                                  ? "op-sub-history-badge--expired"
                                  : "op-sub-history-badge--active"
                              }`}
                            >
                              {item.isExpired
                                ? "Đã hết hạn"
                                : `Còn ${Math.max(0, Number(item.remainingDays) || 0)} ngày`}
                            </span>
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
          <Link to="/owner/profile" className="op-btn op-btn--ghost">
            Hồ sơ chủ sân
          </Link>
        </header>
      ) : null}

      {!embedded ? (
        <header className="op-subscription-intro">
          <h2 className="op-subscription-title">Đăng ký gói dịch vụ</h2>
        </header>
      ) : null}

      {showWalletCard && embedded ? (
        <section className="op-card op-sub-wallet-card">
          <div className="op-card-title" style={{ marginBottom: 10 }}>
            <Wallet size={18} aria-hidden />
            Số dư ví
          </div>
          {walletLoading && walletInfo == null ? (
            <p className="op-muted">Đang tải số dư…</p>
          ) : (
            <div className="op-sub-wallet-inner">
              <div className="op-sub-wallet-balance">
                {formatMoney(balance)}
              </div>
              <Link
                to="/wallet/top-up"
                className="op-btn op-btn--secondary op-btn--sm"
              >
                Nạp tiền
              </Link>
            </div>
          )}
        </section>
      ) : null}

      <div className="op-subscription-grid">
        <section className="op-card op-sub-plans">
          <h3 className="op-subsection-title">
            <CreditCard size={17} aria-hidden />
            Gói có sẵn
          </h3>
          <p className="op-muted op-subsection-hint">
            Chọn một gói để xem tóm tắt và thanh toán.
          </p>
          {plansLoading ? (
            <p className="op-muted">Đang tải danh sách gói…</p>
          ) : plans.length === 0 ? (
            <p className="op-muted">Chưa có gói đăng ký nào được cấu hình.</p>
          ) : (
            <ul className="op-sub-plan-card-grid">
              {plans.map((p, idx) => {
                const active = Number(selectedPlanId) === Number(p.id);
                const variant = planVariant(p, idx);
                const pill = planPillLabel(variant);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`op-sub-plan-card op-sub-plan-card--${variant} ${
                        active ? "is-selected" : ""
                      }`}
                      onClick={() => setSelectedPlanId(p.id)}
                    >
                      <div className="op-sub-plan-card-top">
                        <span className="op-sub-plan-pill">{pill}</span>
                        {active ? (
                          <CheckCircle2
                            size={18}
                            className="op-sub-plan-check"
                            aria-hidden
                          />
                        ) : null}
                      </div>

                      <div className="op-sub-plan-card-body">
                        <div className="op-sub-plan-name">
                          {p.name || `Gói #${p.id}`}
                        </div>
                        <div className="op-sub-plan-meta">
                          Thời hạn:{" "}
                          <strong>
                            {p.durationDays ? `${p.durationDays} ngày` : "—"}
                          </strong>
                        </div>
                        <div className="op-sub-plan-price">
                          {formatMoney(p.price)}
                        </div>
                      </div>

                      <div className="op-sub-plan-card-footer">
                        <span className="op-sub-plan-cta">
                          {active ? "Đang chọn" : "Chọn gói"}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="op-card op-sub-checkout">
          <h3 className="op-subsection-title">Tóm tắt đăng ký</h3>
          {!selectedPlan ? (
            <div className="op-sub-empty-state">
              <div className="op-sub-empty-title">
                Bạn chưa chọn gói dịch vụ nào
              </div>
              <div className="op-sub-empty-desc">
                Hãy chọn một gói dịch vụ để đăng ký.
              </div>
              <div className="op-sub-empty-wallet">
                <div className="op-sub-empty-wallet-row">
                  <span>Số dư ví</span>
                  <strong>
                    {walletLoading && walletInfo == null
                      ? "Đang tải…"
                      : formatMoney(balance)}
                  </strong>
                </div>
                <Link
                  to="/wallet/top-up"
                  className="op-btn op-btn--secondary op-btn--sm"
                >
                  Nạp tiền
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="op-sub-checkout-hero">
                <div className="op-sub-checkout-hero-title">
                  <CreditCard size={16} aria-hidden /> {selectedPlan.name}
                </div>
                <div className="op-sub-checkout-hero-meta">
                  Thời hạn:{" "}
                  <strong>
                    {selectedPlan.durationDays
                      ? `${selectedPlan.durationDays} ngày`
                      : "—"}
                  </strong>
                </div>
              </div>

              <div className="op-sub-summary-card">
                <div className="op-sub-summary-row">
                  <span>Số dư ví</span>
                  <strong>{formatMoney(balance)}</strong>
                </div>
                <div className="op-sub-summary-row">
                  <span>Phí đăng ký</span>
                  <strong>{formatMoney(planPrice)}</strong>
                </div>

                <div className="op-sub-summary-divider" />

                {shortfall > 0 ? (
                  <div className="op-sub-summary-row op-sub-summary-row--warn">
                    <span>
                      <AlertCircle
                        size={16}
                        className="op-sub-inline-icon"
                        aria-hidden
                      />
                      Còn thiếu
                    </span>
                    <strong>{formatMoney(shortfall)}</strong>
                  </div>
                ) : (
                  <div className="op-sub-summary-row op-sub-summary-row--ok">
                    <span>Sau khi trừ (dự kiến)</span>
                    <strong>{formatMoney(balance - planPrice)}</strong>
                  </div>
                )}
              </div>

              {shortfall > 0 ? (
                <p className="op-sub-warn-text">
                  Số dư không đủ. Vui lòng{" "}
                  <Link to="/wallet/top-up">nạp thêm ví</Link> trước khi đăng
                  ký.
                </p>
              ) : null}

              <button
                type="button"
                className="op-btn op-btn--primary op-subscribe-cta"
                disabled={subscribing || !sufficient}
                onClick={handleSubscribe}
              >
                {subscribing ? "Đang xử lý…" : "Đăng ký & Thanh toán"}
              </button>
              <p className="op-muted op-sub-footnote">
                Sau khi bấm Đăng ký, hệ thống kiểm tra số dư, trừ ví, ghi nhận
                giao dịch và kích hoạt gói (OwnerPlan).
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default OwnerSubscription;
