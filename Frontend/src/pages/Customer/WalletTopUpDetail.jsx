import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import useWalletStream from "../../hooks/useWalletHook";
import { getTopUpDetail } from "../../services/walletService";
import { formatVND } from "../../utils/helperFunction";
import ErrorPage from "../../components/ui/Error/ErrorPage";
import NotFoundPage from "../../components/ui/Error/NotFoundPage";
import "./WalletTopUp.css";

const copyToClipboard = (text, label) => {
  if (!text) return;
  navigator.clipboard.writeText(String(text)).then(
    () => toast.success(`Đã sao chép ${label}`),
    () => toast.error("Không thể sao chép"),
  );
};

const WalletTopUpDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const returnPath = location.state?.returnPath ?? location.state?.returnTo;
  const returnState = location.state?.returnState;

  const { user } = useSelector((state) => state.auth);

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);

  const fetchPaymentInfo = useCallback(async () => {
    if (!id) {
      setErrorType("notfound");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorType(null);

    try {
      const data = await getTopUpDetail(id);
      setPaymentInfo(data);
    } catch (err) {
      const status = err?.response?.status;
      setErrorType(status === 400 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPaymentInfo();
  }, [fetchPaymentInfo]);

  const handleTopup = useCallback(() => {
    Swal.fire({
      icon: "success",
      title: "Nạp tiền thành công",
      confirmButtonText: "OK",
    }).then(() => {
      if (returnPath) {
        navigate(returnPath, { state: returnState, replace: true });
      } else {
        navigate("/wallet/top-up", { replace: true });
      }
    });
  }, [navigate, returnPath, returnState]);

  useWalletStream(user?.id, handleTopup);

  if (!loading && errorType === "notfound") {
    return <NotFoundPage title="Không tìm thấy yêu cầu nạp tiền" />;
  }

  if (!loading && errorType === "error") {
    return <ErrorPage />;
  }

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
          onClick={() => navigate("/wallet/top-up", { state: { returnPath, returnState } })}
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="wtu-header-title">Chuyển khoản nạp ví</h1>
        <div className="wtu-header-spacer" />
      </div>

      <div className="wtu-card wtu-payment-card">
        {loading ? (
          <p className="wtu-payment-intro">Đang tải thông tin thanh toán...</p>
        ) : (
          <>
            <p className="wtu-payment-intro">
              Quét mã QR hoặc chuyển khoản theo thông tin bên dưới.
            </p>

            {paymentInfo?.qrImageUrl && (
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
                <span className="wtu-info-value">{paymentInfo?.bankName || "—"}</span>
              </div>
              <div className="wtu-info-row">
                <span className="wtu-info-label">Số tài khoản</span>
                <div className="wtu-info-value-with-copy">
                  <span className="wtu-info-value">{paymentInfo?.accountNumber || "—"}</span>
                  {paymentInfo?.accountNumber && (
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
                  <span className="wtu-info-value">{paymentInfo?.accountName || "—"}</span>
                  {paymentInfo?.accountName && (
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
                <strong className="wtu-info-value wtu-amount">
                  {formatVND(paymentInfo?.amount || 0)}
                </strong>
              </div>
              <div className="wtu-info-row">
                <span className="wtu-info-label">Nội dung chuyển khoản</span>
                <div className="wtu-info-value-with-copy">
                  <span className="wtu-info-value wtu-transfer-content">
                    {paymentInfo?.transferContent || "—"}
                  </span>
                  {paymentInfo?.transferContent && (
                    <button
                      type="button"
                      className="wtu-copy-btn"
                      onClick={() =>
                        copyToClipboard(paymentInfo.transferContent, "nội dung chuyển khoản")
                      }
                      aria-label="Sao chép nội dung"
                    >
                      <Copy size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default WalletTopUpDetail;
