import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Plus, Copy } from "lucide-react";
import { toast } from "react-toastify";
import { getWalletBalance, topUpWallet } from "../../services/walletService";
import "./WalletTopUp.css";
import Swal from "sweetalert2";
import useWalletStream from "../../hooks/useWalletHook";
import { useSelector } from "react-redux";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];
const formatPrice = (price) =>
  price > 0 ? `${Number(price).toLocaleString("vi-VN")} đ` : "0 đ";

const topUpSchema = yup.object({
  amount: yup
    .number()
    .transform((v, o) => (o === "" || o == null || Number.isNaN(v) ? undefined : v))
    .typeError("Chọn hoặc nhập số tiền")
    .required("Chọn hoặc nhập số tiền")
    .min(10000, "Số tiền nạp tối thiểu 10.000 đ")
    .max(10000000, "Số tiền nạp tối đa 10.000.000 đ"),
});

const copyToClipboard = (text, label) => {
  if (!text) return;
  navigator.clipboard.writeText(String(text)).then(
    () => toast.success(`Đã sao chép ${label}`),
    () => toast.error("Không thể sao chép"),
  );
};

const WalletTopUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.returnPath ?? location.state?.returnTo;
  const returnState = location.state?.returnState;

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [customDisplay, setCustomDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

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
      const info = await topUpWallet({ amount: amt });
      setPaymentInfo(info);
    } catch (err) {
      toast.error(err?.message || "Tạo yêu cầu nạp tiền thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setPaymentInfo(null);
  };

  const { user } = useSelector((state) => state.auth);
  const handleTopup = async () => {
    Swal.fire({
      icon: "success",
      title: "Nạp tiền thành công",
      confirmButtonText: "OK",
    }).then(() => {
      if (returnPath) {
        navigate(returnPath, { state: returnState, replace: true });
      } else {
        setPaymentInfo(null);
        setCustomDisplay("");
        setValue("amount", undefined);
      }
    });
  };
  useWalletStream(user.id, handleTopup);

  const showPaymentInstructions = paymentInfo != null;

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
            if (showPaymentInstructions) handleBackToForm();
            else if (returnPath) navigate(returnPath);
            else navigate(-1);
          }}
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="wtu-header-title">
          {showPaymentInstructions ? "Chuyển khoản nạp ví" : "Nạp tiền vào ví"}
        </h1>
        <div className="wtu-header-spacer" />
      </div>

      {showPaymentInstructions ? (
        <div className="wtu-card wtu-payment-card">
          <p className="wtu-payment-intro">
            Quét mã QR hoặc chuyển khoản theo thông tin bên dưới.
          </p>

          {paymentInfo.qrImageUrl && (
            <div className="wtu-qr-wrap">
              <img
                src={paymentInfo.qrImageUrl}
                alt="QR chuyển khoản"
                className="wtu-qr-img"
              />
            </div>
          )}

          <div className="wtu-bank-block">
            <h3 className="wtu-block-title">Thông tin tài khoản nhận</h3>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Ngân hàng</span>
              <span className="wtu-info-value">
                {paymentInfo.bankName || "—"}
              </span>
            </div>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Số tài khoản</span>
              <div className="wtu-info-value-with-copy">
                <span className="wtu-info-value">
                  {paymentInfo.accountNumber || "—"}
                </span>
                {paymentInfo.accountNumber && (
                  <button
                    type="button"
                    className="wtu-copy-btn"
                    onClick={() =>
                      copyToClipboard(paymentInfo.accountNumber, "số tài khoản")
                    }
                    aria-label="Sao chép số tài khoản"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Chủ tài khoản</span>
              <div className="wtu-info-value-with-copy">
                <span className="wtu-info-value">
                  {paymentInfo.accountName || "—"}
                </span>
                {paymentInfo.accountName && (
                  <button
                    type="button"
                    className="wtu-copy-btn"
                    onClick={() =>
                      copyToClipboard(
                        paymentInfo.accountName,
                        "tên chủ tài khoản",
                      )
                    }
                    aria-label="Sao chép tên chủ tài khoản"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="wtu-bank-block">
            <h3 className="wtu-block-title">Thông tin giao dịch</h3>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Số tiền</span>
              <strong className="wtu-info-value wtu-amount">
                {formatPrice(paymentInfo.amount)}
              </strong>
            </div>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Nội dung chuyển khoản</span>
              <div className="wtu-info-value-with-copy">
                <span className="wtu-info-value wtu-transfer-content">
                  {paymentInfo.transferContent || "—"}
                </span>
                {paymentInfo.transferContent && (
                  <button
                    type="button"
                    className="wtu-copy-btn"
                    onClick={() =>
                      copyToClipboard(
                        paymentInfo.transferContent,
                        "nội dung chuyển khoản",
                      )
                    }
                    aria-label="Sao chép nội dung"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="wtu-card">
          <div className="wtu-card-icon">
            <Wallet size={32} />
          </div>
          <div className="wtu-balance">
            <span className="wtu-balance-label">Số dư hiện tại</span>
            <span className="wtu-balance-value">
              {loadingBalance ? "..." : formatPrice(balance)}
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
                  {formatPrice(a)}
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
                <strong>{formatPrice(amount)}</strong>
              </div>
            )}

            <button type="submit" className="wtu-submit" disabled={loading}>
              <Plus size={18} />
              {loading ? "Đang xử lý..." : "Xác nhận nạp tiền"}
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default WalletTopUp;
