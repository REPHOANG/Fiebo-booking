import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Wallet, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { getWalletBalance } from "../../services/walletService";
import { getOwnerSubscriptionPlans, subscribeOwnerToPlan } from "../../services/subscriptionService";
import "./OwnerProfile.css";

const formatMoney = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n) || 0);

const errMessage = (e) =>
  e?.response?.data?.message ??
  e?.response?.data?.Message ??
  e?.message ??
  "Có lỗi xảy ra. Vui lòng thử lại.";

const MSG_SUCCESS = "Đăng ký gói thành công. Gói của bạn đã được kích hoạt.";

/** 1 component dùng cho cả trang riêng và nhúng trong profile */
const OwnerSubscription = ({ embedded = false, showWalletCard = true, showPageHeader = !embedded }) => {
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

  const balance = Number(walletInfo?.balance ?? 0);
  const selectedPlan = useMemo(
    () => plans.find((p) => Number(p.id) === Number(selectedPlanId)) ?? null,
    [plans, selectedPlanId],
  );

  const planPrice = selectedPlan ? Number(selectedPlan.price || 0) : 0;
  const shortfall = Math.max(0, planPrice - balance);
  const sufficient = selectedPlan && balance >= planPrice;

  const handleSubscribe = async () => {
    if (!selectedPlan || !sufficient) return;
    setSubscribing(true);
    try {
      const { message } = await subscribeOwnerToPlan(selectedPlan.id);
      toast.success(message?.trim() ? message : MSG_SUCCESS);
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      setSelectedPlanId(null);
    } catch (error) {
      toast.error(errMessage(error));
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className={`op-subscription ${embedded ? "op-subscription--embedded" : ""}`}>
      {showPageHeader ? (
        <header className="op-header">
          <div>
            <h1>Gói dịch vụ</h1>
            <p className="op-sub">Danh sách gói, chi tiết và thanh toán qua ví</p>
          </div>
          <Link to="/owner/profile" className="op-btn op-btn--ghost">
            Hồ sơ chủ sân
          </Link>
        </header>
      ) : null}

      {!embedded ? (
        <header className="op-subscription-intro">
          <h2 className="op-subscription-title">Đăng ký gói dịch vụ</h2>
          <p className="op-subscription-desc">
            Chọn một gói để xem chi tiết và tóm tắt thanh toán. Phí sẽ được trừ từ ví sau khi bạn xác nhận{" "}
            <strong>Đăng ký</strong>.
          </p>
        </header>
      ) : null}

      {showWalletCard ? (
        <section className="op-card op-sub-wallet-card">
          <div className="op-card-title" style={{ marginBottom: 10 }}>
            <Wallet size={18} aria-hidden />
            Số dư ví
          </div>
          {walletLoading && walletInfo == null ? (
            <p className="op-muted">Đang tải số dư…</p>
          ) : (
            <div className="op-sub-wallet-inner">
              <div className="op-sub-wallet-balance">{formatMoney(balance)}</div>
              <Link to="/wallet/top-up" className="op-btn op-btn--secondary op-btn--sm">
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
            Chọn một dòng để xem chi tiết và thanh toán bên cột bên phải.
          </p>
          {plansLoading ? (
            <p className="op-muted">Đang tải danh sách gói…</p>
          ) : plans.length === 0 ? (
            <p className="op-muted">Chưa có gói đăng ký nào được cấu hình.</p>
          ) : (
            <ul className="op-sub-plan-pick-list">
              {plans.map((p) => {
                const active = Number(selectedPlanId) === Number(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`op-sub-plan-pick ${active ? "is-selected" : ""}`}
                      onClick={() => setSelectedPlanId(p.id)}
                    >
                      <div className="op-sub-plan-pick-main">
                        <span className="op-sub-plan-pick-name">{p.name || `Gói #${p.id}`}</span>
                        <span className="op-sub-plan-pick-meta">
                          Thời hạn: <strong>{p.durationDays ? `${p.durationDays} ngày` : "—"}</strong>
                        </span>
                      </div>
                      <div className="op-sub-plan-pick-price">{formatMoney(p.price)}</div>
                      {active ? <CheckCircle2 size={18} className="op-sub-plan-pick-check" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="op-card op-sub-checkout">
          <h3 className="op-subsection-title">Chi tiết &amp; thanh toán</h3>
          {!selectedPlan ? (
            <p className="op-muted">Chọn một gói bên trái để xem tóm tắt.</p>
          ) : (
            <>
              <div className="op-sub-detail-block">
                <div className="op-sub-detail-row">
                  <span>Tên gói</span>
                  <strong>{selectedPlan.name}</strong>
                </div>
                <div className="op-sub-detail-row">
                  <span>Thời hạn</span>
                  <strong>{selectedPlan.durationDays ? `${selectedPlan.durationDays} ngày` : "—"}</strong>
                </div>
                <div className="op-sub-detail-row op-sub-detail-row--emphasis">
                  <span>Phí gói</span>
                  <strong>{formatMoney(planPrice)}</strong>
                </div>
              </div>

              <div className="op-sub-summary">
                <p className="op-sub-summary-title">Tóm tắt thanh toán</p>
                <div className="op-sub-detail-row">
                  <span>Số dư ví hiện tại</span>
                  <strong>{formatMoney(balance)}</strong>
                </div>
                <div className="op-sub-detail-row">
                  <span>Phí đăng ký</span>
                  <strong>{formatMoney(planPrice)}</strong>
                </div>
                <div className="op-sub-detail-divider" />
                {shortfall > 0 ? (
                  <div className="op-sub-detail-row op-sub-detail-row--warn">
                    <span>
                      <AlertCircle size={16} className="op-sub-inline-icon" aria-hidden />
                      Còn thiếu
                    </span>
                    <strong>{formatMoney(shortfall)}</strong>
                  </div>
                ) : (
                  <div className="op-sub-detail-row op-sub-detail-row--ok">
                    <span>Sau khi trừ (dự kiến)</span>
                    <strong>{formatMoney(balance - planPrice)}</strong>
                  </div>
                )}
              </div>

              {shortfall > 0 ? (
                <p className="op-sub-warn-text">
                  Số dư không đủ (E1). Vui lòng <Link to="/wallet/top-up">nạp thêm ví</Link> trước khi đăng ký.
                </p>
              ) : null}

              <button
                type="button"
                className="op-btn op-btn--primary op-subscribe-cta"
                disabled={subscribing || !sufficient}
                onClick={handleSubscribe}
              >
                {subscribing ? "Đang xử lý…" : "Đăng ký"}
              </button>
              <p className="op-muted op-sub-footnote">
                Sau khi bấm Đăng ký, hệ thống kiểm tra số dư, trừ ví, ghi nhận giao dịch và kích hoạt gói
                (OwnerPlan).
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default OwnerSubscription;
