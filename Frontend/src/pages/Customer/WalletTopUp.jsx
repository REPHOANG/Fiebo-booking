import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { getWalletBalance, topUpWallet } from "../../services/walletService";
import "./WalletTopUp.css";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];
const formatPrice = (price) =>
  price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ";

const WalletTopUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPayment = location.state?.fromPayment;
  const returnPath = location.state?.returnPath ?? location.state?.returnTo;
  const returnState = location.state?.returnState;

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

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
    return () => { cancelled = true; };
  }, []);

  const amount =
    selectedAmount != null
      ? selectedAmount
      : (customAmount && parseInt(customAmount.replace(/\D/g, ""), 10)) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount < 10000 || amount > 10000000) {
      toast.warning("Số tiền nạp tối thiểu 10.000 đ và tối đa 10.000.000 đ");
      return;
    }
    setLoading(true);
    try {
      await topUpWallet({ amount });
      toast.success(`Đã nạp ${formatPrice(amount)} vào ví.`);
      const res = await getWalletBalance();
      setBalance(res.balance ?? 0);
      if (returnPath) {
        navigate(returnPath, { state: returnState, replace: true });
      } else if (fromPayment) {
        navigate(-1);
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error(err?.message || "Nạp tiền thất bại.");
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
          onClick={() => (returnPath ? navigate(returnPath) : navigate(-1))}
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
            {loadingBalance ? "..." : formatPrice(balance)}
          </span>
        </div>
        <p className="wtu-card-desc">Chọn số tiền cần nạp hoặc nhập số tiền tùy chọn.</p>

        <form onSubmit={handleSubmit} className="wtu-form">
          <div className="wtu-presets">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                className={`wtu-preset-btn${selectedAmount === a ? " active" : ""}`}
                onClick={() => {
                  setSelectedAmount(a);
                  setCustomAmount("");
                }}
              >
                {formatPrice(a)}
              </button>
            ))}
          </div>

          <div className="wtu-custom">
            <label className="wtu-label">Hoặc nhập số tiền (đ)</label>
            <input
              type="text"
              className="wtu-input"
              placeholder="Ví dụ: 150000"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value.replace(/\D/g, ""));
                setSelectedAmount(null);
              }}
              inputMode="numeric"
            />
          </div>

          {amount > 0 && (
            <div className="wtu-summary">
              <span>Số tiền nạp:</span>
              <strong>{formatPrice(amount)}</strong>
            </div>
          )}

          <button
            type="submit"
            className="wtu-submit"
            
          >
            <Plus size={18} />
            {loading ? "Đang xử lý..." : "Xác nhận nạp tiền"}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default WalletTopUp;

