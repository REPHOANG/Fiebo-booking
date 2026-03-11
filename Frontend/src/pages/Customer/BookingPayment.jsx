import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Calendar,
  User,
  Phone,
  Receipt,
} from "lucide-react";
import "./BookingPayment.css";
import { payBooking } from '../../services/bookingService';
import { addBookedSlots } from '../../store/bookedSlotsSlice';

const formatPrice = (price) =>
  price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ";

const HOLD_SECONDS = 5 * 60; // 5 minutes

const BookingPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const paymentState = location.state;

  // Mark selected slots local-booked for UI if we have them (no server reserve by default)
  useEffect(() => {
    try {
      const bs = location.state;
      if (bs?.venue && bs?.selectedDate && Array.isArray(bs.selectedSlots) && bs.selectedSlots.length > 0) {
        const ttl = Number(bs.reservationTtl ?? 300);
        try {
          // Add to local bookedSlots so UI reflects chosen slots while on payment screen
          // This does not call server reserve — backend currently exposes only createBooking + payment.
          // eslint-disable-next-line no-console
          console.debug('[BookingPayment] marking local booked slots on mount', { venueId: String(bs.venue.id), date: bs.selectedDate, slots: bs.selectedSlots, ttlSeconds: ttl });
          dispatch(addBookedSlots({ venueId: String(bs.venue.id), date: bs.selectedDate, slots: bs.selectedSlots, ttlSeconds: ttl }));
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {}
  }, [location.state, dispatch]);

  // Wallet balance (TODO: fetch from API)
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Hold countdown
  const [timeLeft, setTimeLeft] = useState(HOLD_SECONDS);
  const [expired, setExpired] = useState(false);
  const [reservationId, setReservationId] = useState(null);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      setLoadingBalance(true);
      try {
        // TODO: Replace with actual API call
        // const res = await getWalletBalance(token);
        // setWalletBalance(res.balance);
        setWalletBalance(50000); // demo
      } catch {
        setWalletBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (paymentDone || expired) return;
    if (timeLeft <= 0) {
      setExpired(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, paymentDone, expired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // If no state, show error
  if (!paymentState) {
    return (
      <div className="bp-empty">
        <h2>Không có thông tin thanh toán</h2>
        <p>Vui lòng quay lại trang đặt lịch.</p>
        <button onClick={() => navigate(-1)} className="bp-back-link">
          ← Quay lại
        </button>
      </div>
    );
  }

  const { venue, selectedDate, slotSummary, bookingItems, customerName, customerPhone, totalPrice } = paymentState;

  const isEnough = walletBalance >= totalPrice;

  // No server-side reserve endpoint in current API; payment requires a server-created bookingId.
  // If `reservationId` is provided by previous step (server created booking), use it; otherwise
  // we keep a client-side hold timer for UI only and require users to complete booking creation first.
  useEffect(() => {
    if (paymentState?.reservationId) {
      setReservationId(paymentState.reservationId);
      const ttl = Number(paymentState.reservationTtl ?? HOLD_SECONDS);
      setTimeLeft(ttl > 0 ? ttl : HOLD_SECONDS);
      return;
    }
    // No server reservation — use client-only TTL for UX feedback
    setTimeLeft(HOLD_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, bookingItems, paymentState]);

  // No server release call — nothing to do when client-only hold expires
  useEffect(() => {
    if (expired && reservationId) {
      // Optionally inform user that server reservation expired; nothing to release on server.
    }
  }, [expired, reservationId]);

  // On unmount, if still have reservation and not confirmed, release it
  useEffect(() => {
    return () => {
      // nothing to release on server in current API
    };
  }, [reservationId]);

  const handlePay = async () => {
    if (!token) {
      // Redirect to login if not authenticated
      navigate('/auth/login', { state: { returnTo: location.pathname, returnState: paymentState } });
      return;
    }
    if (!isEnough || paying || expired) {
      if (!isEnough) alert('Số dư không đủ. Vui lòng nạp thêm vào ví hoặc chọn phương thức khác.');
      return;
    }
    setPaying(true);
    try {
      // Call backend to confirm reservation + process payment
      let bookingId = reservationId;
      if (!bookingId) {
        // No server booking id available — cannot proceed to server payment.
        alert('Không tìm thấy mã đặt chỗ trên máy chủ. Vui lòng hoàn tất xác nhận đặt sân trước khi thanh toán.');
        // navigate back to confirmation step
        navigate(`/venue/${id}/booking/confirm`, { state: { venue, selectedDate, selectedSlots, slots, slotSummary } });
        setPaying(false);
        return;
      }

      try {
        await payBooking(bookingId, { paymentMethod: 'wallet' });
        setPaymentDone(true);
      } catch (payErr) {
        console.error('Payment failed', payErr);
        alert('Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
        setPaying(false);
      }
    } catch {
      setPaying(false);
    }
  };

  const handleTopUp = () => {
    // Navigate to top-up page, passing return URL
    navigate("/wallet/top-up", {
      state: { returnTo: location.pathname, returnState: paymentState },
    });
  };

  // Format date
  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    const [y, mo, d] = selectedDate.split("-");
    const date = new Date(y, mo - 1, d);
    const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${dayName}, ${d}/${mo}/${y}`;
  }, [selectedDate]);

  const pageTransition = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.35, ease: "easeInOut" },
  };

  /* ── Payment success ── */
  if (paymentDone) {
    return (
      <motion.div {...pageTransition}>
      <div className="bp-main">
        <div className="bp-success">
          <div className="bp-success-icon">
            <CheckCircle2 size={56} />
          </div>
          <h2>Đặt sân thành công!</h2>
          <p>Đơn đặt sân của bạn đã được xác nhận và thanh toán.</p>
          <div className="bp-success-details">
            <div className="bp-success-row">
              <span>Sân</span>
              <strong>{venue?.name}</strong>
            </div>
            <div className="bp-success-row">
              <span>Ngày</span>
              <strong>{formattedDate}</strong>
            </div>
            <div className="bp-success-row">
              <span>Tổng tiền</span>
              <strong className="bp-success-price">{formatPrice(totalPrice)}</strong>
            </div>
          </div>
          <button className="bp-home-btn" onClick={() => navigate("/home")}>
            Về trang chủ
          </button>
        </div>
      </div>
      </motion.div>
    );
  }

  /* ── Expired ── */
  if (expired) {

    return (
      <motion.div {...pageTransition}>
      <div className="bp-main">
        <div className="bp-expired">
          <div className="bp-expired-icon">
            <Clock size={48} />
          </div>
          <h2>Hết thời gian giữ chỗ</h2>
          <p>Đơn đặt sân đã hết hạn. Vui lòng đặt lại.</p>
          <button className="bp-back-link" onClick={() => navigate(`/venue/${id}/booking`)}>
            ← Đặt lại
          </button>
        </div>
      </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <div className="bp-main">
      {/* Header */}
      <div className="bp-header">
        <button className="bp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="bp-header-title">Thanh toán</h1>
        <div className="bp-header-spacer" />
      </div>

      <div className="bp-content">
        {/* Left: Payment area */}
        <div className="bp-left">
          {/* Countdown */}
          <div className="bp-timer-card">
            <Clock size={20} className="bp-timer-icon" />
            <div className="bp-timer-text">
              <span>Đơn của bạn còn được giữ chỗ trong</span>
              <strong className={`bp-timer-count${timeLeft <= 60 ? " urgent" : ""}`}>
                {timerDisplay}
              </strong>
            </div>
          </div>

          {(paymentState?.slotMappingFailed || !paymentState?.reservationId) && (
            <div className="bp-notice-card" role="status">
              <AlertTriangle size={18} />
              <span>
                {paymentState?.slotMappingFailed
                  ? "Đặt chỗ chưa được lưu trên máy chủ. Bạn vẫn có thể thanh toán hoặc quay lại đặt lịch."
                  : "Đặt chỗ chưa có mã từ máy chủ. Giữ chỗ tạm 5 phút — hãy thanh toán sớm."}
              </span>
            </div>
          )}

          {/* Wallet section */}
          <div className="bp-wallet-card">
            <div className="bp-wallet-header">
              <Wallet size={20} />
              <span>Ví Fiebo</span>
            </div>

            <div className="bp-wallet-balance-row">
              <span className="bp-wallet-label">Số dư ví</span>
              <span className={`bp-wallet-balance${!isEnough ? " low" : ""}`}>
                {loadingBalance ? "..." : formatPrice(walletBalance)}
              </span>
            </div>

            <div className="bp-wallet-amount-row">
              <span className="bp-wallet-label">Cần thanh toán</span>
              <span className="bp-wallet-amount">{formatPrice(totalPrice)}</span>
            </div>

            {!loadingBalance && !isEnough && (
              <div className="bp-wallet-warning">
                <AlertTriangle size={16} />
                <span>
                  Số dư không đủ. Bạn cần nạp thêm{" "}
                  <strong>{formatPrice(totalPrice - walletBalance)}</strong> để thanh toán.
                </span>
              </div>
            )}

            {!loadingBalance && (
              <button className="bp-topup-btn" onClick={handleTopUp}>
                <Plus size={18} />
                Nạp tiền vào ví
              </button>
            )}
          </div>

          {/* Pay button */}
          {isEnough && !loadingBalance && (
            <button
              className={`bp-pay-btn${paying ? " loading" : ""}`}
              onClick={handlePay}
              disabled={paying}
            >
                  {paying ? (
                    <span className="bp-pay-loading" />
                  ) : !token ? (
                    <>Đăng nhập để thanh toán</>
                  ) : !isEnough ? (
                    <>Số dư không đủ</>
                  ) : (
                    <>THANH TOÁN {formatPrice(totalPrice)}</>
                  )}
            </button>
              )}

              {/* If user is not logged in, show separate login button as CTA */}
              {!token && (
                <button className="bp-login-btn" onClick={() => navigate('/auth/login', { state: { returnTo: location.pathname, returnState: paymentState } })}>
                  Đăng nhập
                </button>
              )}
        </div>

        {/* Right: Booking summary */}
        <div className="bp-right">
          <div className="bp-summary-card">
            <h3 className="bp-summary-title">Thông tin lịch đặt</h3>

            <div className="bp-summary-row">
              <div className="bp-summary-icon"><User size={18} /></div>
              <div className="bp-summary-info">
                <span className="bp-summary-label">Tên</span>
                <strong>{customerName || "—"}</strong>
              </div>
            </div>

            <div className="bp-summary-row">
              <div className="bp-summary-icon"><Phone size={18} /></div>
              <div className="bp-summary-info">
                <span className="bp-summary-label">SĐT</span>
                <strong>{customerPhone || "—"}</strong>
              </div>
            </div>

            <div className="bp-summary-row">
              <div className="bp-summary-icon"><Calendar size={18} /></div>
              <div className="bp-summary-info">
                <span className="bp-summary-label">Chi tiết đơn</span>
                <strong>{formattedDate}</strong>
                {bookingItems?.map((item, i) => (
                  <div key={i} className="bp-summary-field">
                    - {item.fieldName}: {item.ranges?.join(", ")}
                  </div>
                ))}
              </div>
            </div>

            <div className="bp-summary-row">
              <div className="bp-summary-icon"><Receipt size={18} /></div>
              <div className="bp-summary-info">
                <span className="bp-summary-label">Tổng đơn</span>
                <strong className="bp-summary-price">{formatPrice(totalPrice)}</strong>
              </div>
            </div>

            <div className="bp-summary-row">
              <div className="bp-summary-icon"><Wallet size={18} /></div>
              <div className="bp-summary-info">
                <span className="bp-summary-label">Cần thanh toán</span>
                <strong className="bp-summary-price">{formatPrice(totalPrice)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
     </motion.div>
  );
};

export default BookingPayment;
