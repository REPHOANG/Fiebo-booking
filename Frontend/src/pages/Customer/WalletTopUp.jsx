import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Plus, Copy, Check } from "lucide-react";
import { toast } from "react-toastify";
import { getWalletBalance, topUpWallet } from "../../services/walletService";
import "./WalletTopUp.css";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];
const formatPrice = (price) =>
  price > 0 ? `${Number(price).toLocaleString("vi-VN")} đ` : "0 đ";

const copyToClipboard = (text, label) => {
  if (!text) return;
  navigator.clipboard.writeText(String(text)).then(
    () => toast.success(`Đã sao chép ${label}`),
    () => toast.error("Không thể sao chép")
  );
};

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
  /** Sau khi xác nhận nạp tiền: { qrImageUrl, bankName, accountNumber, accountName, amount, transferContent } */
  const [paymentInfo, setPaymentInfo] = useState(null);

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
      const info = await topUpWallet({ amount });
      setPaymentInfo(info);
      toast.success("Vui lòng chuyển khoản theo thông tin bên dưới.");
      // Nếu backend trả về url chuyển hướng (ví dụ cổng thanh toán), điều hướng trình duyệt tới đó.
      // Nếu không có, mặc định điều hướng tới endpoint webhook để backend xử lý luồng thanh toán.
      try {
        if (info && info.redirectUrl) {
          window.location.href = info.redirectUrl;
        } else {
          // Gửi POST tới endpoint webhook để backend xử lý luồng thanh toán (ví dụ cho môi trường dev/test).
          // Xây payload mẫu dựa trên dữ liệu trả về từ topUpWallet.
          const payload = {
            transactionDate: new Date().toISOString(),
            accountNumber: info.accountNumber || "",
            code: info.code || "",
            content: info.transferContent || "",
            transferType: "bank",
            transferAmount: Number(info.amount || amount || 0),
            accumulated: 0,
            subAccount: info.subAccount || "",
            referenceCode: info.referenceCode || info.transferContent || "",
            description: info.description || `Top-up request ${Number(info.amount || amount || 0)}`,
          };
          try {
            const resp = await fetch('/api/webhook/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (resp.ok) {
              toast.success('Yêu cầu webhook đã gửi. Cập nhật số dư nếu thành công.');
              // Cập nhật số dư và điều hướng phù hợp
              await handleDoneTransfer();
              return;
            }
            // Nếu webhook trả lỗi, giữ lại paymentInfo để người dùng có thể làm chuyển khoản thủ công
            const txt = await resp.text().catch(() => null);
            console.warn('Webhook response not ok', resp.status, txt);
            toast.error('Gửi webhook thất bại — vui lòng làm theo hướng dẫn chuyển khoản.');
          } catch (webErr) {
            console.warn('Failed to call webhook', webErr);
            toast.error('Không thể gửi webhook. Vui lòng làm theo hướng dẫn chuyển khoản.');
          }
        }
      } catch (e) {
        // Nếu không thể điều hướng hoặc gọi webhook, giữ lại paymentInfo để hiển thị hướng dẫn chuyển khoản
      }
    } catch (err) {
      toast.error(err?.message || "Tạo yêu cầu nạp tiền thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setPaymentInfo(null);
  };

  const handleDoneTransfer = async () => {
    try {
      const res = await getWalletBalance();
      setBalance(res.balance ?? 0);
      toast.success("Số dư đã được cập nhật. Nếu đã chuyển khoản, tiền sẽ vào ví trong giây lát.");
    } catch (_) {}
    if (returnPath) {
      navigate(returnPath, { state: returnState, replace: true });
    } else if (fromPayment) {
      navigate(-1);
    } else {
      setPaymentInfo(null);
    }
  };

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
            Quét mã QR hoặc chuyển khoản theo thông tin bên dưới. Nhớ ghi đúng nội dung chuyển khoản.
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
              <span className="wtu-info-value">{paymentInfo.bankName || "—"}</span>
            </div>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Số tài khoản</span>
              <div className="wtu-info-value-with-copy">
                <span className="wtu-info-value">{paymentInfo.accountNumber || "—"}</span>
                {paymentInfo.accountNumber && (
                  <button
                    type="button"
                    className="wtu-copy-btn"
                    onClick={() => copyToClipboard(paymentInfo.accountNumber, "số tài khoản")}
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
                <span className="wtu-info-value">{paymentInfo.accountName || "—"}</span>
                {paymentInfo.accountName && (
                  <button
                    type="button"
                    className="wtu-copy-btn"
                    onClick={() => copyToClipboard(paymentInfo.accountName, "tên chủ tài khoản")}
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
              <strong className="wtu-info-value wtu-amount">{formatPrice(paymentInfo.amount)}</strong>
            </div>
            <div className="wtu-info-row">
              <span className="wtu-info-label">Nội dung chuyển khoản</span>
              <div className="wtu-info-value-with-copy">
                <span className="wtu-info-value wtu-transfer-content">{paymentInfo.transferContent || "—"}</span>
                {paymentInfo.transferContent && (
                  <button
                    type="button"
                    className="wtu-copy-btn"
                    onClick={() => copyToClipboard(paymentInfo.transferContent, "nội dung chuyển khoản")}
                    aria-label="Sao chép nội dung"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="wtu-payment-actions">
            <button type="button" className="wtu-btn-secondary" onClick={handleBackToForm}>
              Nạp thêm yêu cầu khác
            </button>
            <button type="button" className="wtu-submit" onClick={handleDoneTransfer}>
              <Check size={18} />
              Đã chuyển khoản
            </button>
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

