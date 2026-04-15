import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { getWalletBalance, topUpWallet } from "../../services/walletService";
import { formatVND } from "../../utils/helperFunction";
import "./WalletTopUp.css";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

const topUpSchema = yup.object({
  amount: yup
    .number()
    .transform((v, o) => (o === "" || o == null || Number.isNaN(v) ? undefined : v))
    .typeError("Chọn hoặc nhập số tiền")
    .required("Chọn hoặc nhập số tiền")
    .min(10000, "Số tiền nạp tối thiểu 10.000 đ")
    .max(10000000, "Số tiền nạp tối đa 10.000.000 đ"),
});

const WalletTopUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.returnPath ?? location.state?.returnTo;
  const returnState = location.state?.returnState;

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [customDisplay, setCustomDisplay] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(topUpSchema),
    mode: "onSubmit",
    defaultValues: { amount: undefined },
  });

  const amount = watch("amount");

  useEffect(() => {
    let cancelled = false;
    setLoadingBalance(true);
    getWalletBalance()
      .then((res) => {
        if (!cancelled) setBalance(res.balance ?? 0);
      })
      .catch(() => {
        if (!cancelled) setBalance(0);
      })
      .finally(() => {
        if (!cancelled) setLoadingBalance(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pickPreset = (a) => {
    setCustomDisplay("");
    setValue("amount", a, { shouldValidate: true, shouldDirty: true });
  };

  const onCustomChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setCustomDisplay(raw);
    if (!raw) {
      setValue("amount", undefined, { shouldValidate: true, shouldDirty: true });
      return;
    }
    const n = parseInt(raw, 10);
    setValue("amount", Number.isFinite(n) ? n : undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async ({ amount: amt }) => {
    setLoading(true);
    try {
      const topUp = await topUpWallet({ amount: amt });
      const topUpId = topUp?.id;

      if (!topUpId) {
        throw new Error("Không nhận được mã yêu cầu nạp tiền.");
      }

      navigate(`/wallet/top-up/${topUpId}`, {
        state: {
          returnPath,
          returnState,
        },
      });
    } catch (err) {
      toast.error(err?.message || "Tạo yêu cầu nạp tiền thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="wtu-main"
    >
      <div className="wtu-header">
        <button
          type="button"
          className="wtu-back-btn"
          onClick={() => {
            if (returnPath) navigate(returnPath);
            else navigate(-1);
          }}
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="wtu-header-title">Nạp tiền vào ví</h1>
        <div className="wtu-header-spacer" />
      </div>
      <div className="wtu-card">
          <div className="wtu-card-icon">
            <Wallet size={32} />
          </div>
          <div className="wtu-balance">
            <span className="wtu-balance-label">Số dư hiện tại</span>
            <span className="wtu-balance-value">
              {loadingBalance ? "..." : formatVND(balance)}
            </span>
          </div>
          <p className="wtu-card-desc">
            Chọn số tiền cần nạp hoặc nhập số tiền tùy chọn.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="wtu-form" noValidate>
            <div className="wtu-presets">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`wtu-preset-btn${amount === a ? " active" : ""}`}
                  onClick={() => pickPreset(a)}
                >
                    {formatVND(a)}
                </button>
              ))}
            </div>

            <div className="wtu-custom">
              <label className="wtu-label" htmlFor="wtu-custom-amount">
                Hoặc nhập số tiền (đ)
              </label>
              <input
                id="wtu-custom-amount"
                type="text"
                className="wtu-input"
                placeholder="Ví dụ: 150000"
                value={customDisplay}
                onChange={onCustomChange}
                inputMode="numeric"
              />
            </div>

            {errors.amount && (
              <p className="wtu-form-error" role="alert">
                {errors.amount.message}
              </p>
            )}

            {amount > 0 && !errors.amount && (
              <div className="wtu-summary">
                <span>Số tiền nạp:</span>
                <strong>{formatVND(amount)}</strong>
              </div>
            )}

            <button type="submit" className="wtu-submit" disabled={loading}>
              <Plus size={18} />
              {loading ? "Đang xử lý..." : "Xác nhận nạp tiền"}
            </button>
          </form>
        </div>
    </motion.div>
  );
};

export default WalletTopUp;
