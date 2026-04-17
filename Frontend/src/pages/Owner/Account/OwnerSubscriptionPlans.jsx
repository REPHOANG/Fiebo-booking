import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { getWalletBalance } from "../../../services/walletService";
import { getHasSubscription, isFieldOwnerUser } from "../../../utils/ownerSubscription";
import { getProfile } from "../../../services/authService";
import { setCredentials } from "../../../store/authSlice";
import {
  getOwnerSubscriptionPlans,
  subscribeOwnerToPlan,
} from "../../../services/subscriptionService";
import "./OwnerProfile.css";

const formatMoney = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(n) || 0,
  );

const errMessage = (e) =>
  e?.response?.data?.message ??
  e?.response?.data?.Message ??
  e?.message ??
  "Có lỗi xảy ra. Vui lòng thử lại.";

const MSG_SUCCESS = "Đăng ký gói thành công. Gói của bạn đã được kích hoạt.";

const OwnerSubscriptionPlans = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth?.user);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  const hasSubscription = getHasSubscription(user);
  const shouldShowSubscriptionMessage = isFieldOwnerUser(user) && hasSubscription === false;

  const { data: walletInfo, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: getWalletBalance,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["owner-subscription-plans"],
    queryFn: getOwnerSubscriptionPlans,
  });

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
      name.includes("chuyên") ||
      name.includes("chuyen")
    )
      return "pro";
    if (name.includes("basic") || name.includes("cơ bản") || name.includes("co ban")) return "basic";
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

      // Unlock owner area immediately to avoid waiting for eventual profile consistency.
      dispatch(
        setCredentials({
          user: {
            ...(user || {}),
            hasSubscription: true,
          },
        }),
      );

      const profile = await getProfile();
      if (profile) {
        dispatch(setCredentials({ user: profile }));
      }

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
    <div className="op-subscription">
      <header className="op-subscription-intro">
        <h2 className="op-subscription-title">Đăng ký gói dịch vụ chủ sân</h2>
        {shouldShowSubscriptionMessage ? (
          <div className="op-subscription-alert" role="status" aria-live="polite">
            <AlertCircle size={16} aria-hidden />
            <span>Vui lòng đăng ký gói dịch vụ chủ sân để mở khóa và quản lý sân của bạn.</span>
          </div>
        ) : null}
      </header>

      <div className="op-subscription-grid">
        <section className="op-card op-sub-plans">
          <h3 className="op-subsection-title">
            <CreditCard size={17} aria-hidden />
            Gói có sẵn
          </h3>
          {plansLoading ? (
            <p className="op-muted">Đang tải danh sách gói...</p>
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
                            {p.durationDays ? `${p.durationDays} ngày` : "-"}
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
                Hãy chọn một gói dịch vụ để đăng ký.
              </div>
              <div className="op-sub-empty-wallet">
                <div className="op-sub-empty-wallet-row">
                  <span>Số dư ví</span>
                  <strong>
                    {walletLoading && walletInfo == null
                      ? "Đang tải..."
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
                      : "-"}
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
                    <span>Số dư còn lại</span>
                    <strong>{formatMoney(balance - planPrice)}</strong>
                  </div>
                )}
              </div>

              {shortfall > 0 ? (
                <p className="op-sub-warn-text">
                  Số dư không đủ. Vui lòng{" "}
                  <Link to="/wallet/top-up">nạp thêm tiền</Link> để đăng
                  ký.
                </p>
              ) : null}

              <button
                type="button"
                className="op-btn op-btn--primary op-subscribe-cta"
                disabled={subscribing || !sufficient}
                onClick={handleSubscribe}
              >
                {subscribing ? "Đang xử lý..." : "Đăng ký & Thanh toán"}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default OwnerSubscriptionPlans;
