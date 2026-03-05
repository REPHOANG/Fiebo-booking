import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
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
import { reserveSlots, confirmReservation, releaseReservation } from '../../services/bookingService';

const formatPrice = (price) =>
  price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ";

const HOLD_SECONDS = 5 * 60; // 5 minutes

const BookingPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useSelector((state) => state.auth);

  const paymentState = location.state;

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

  // Reserve slots on mount: call backend to reserve with TTL, use server-provided TTL when available
  useEffect(() => {
    let mounted = true;
    const doReserve = async () => {
      try {
        const payload = {
          venueId: Number(id),
          date: selectedDate,
          items: bookingItems?.map((it) => ({ fieldId: it.fieldId, ranges: it.ranges })) || [],
          customerName: customerName || (user && user.name) || '',
          customerPhone: customerPhone || (user && user.phone) || '',
        };

        const res = await reserveSlots(payload);
        // Expect server to return { reservationId, expiresInSeconds }
        if (!mounted) return;
        const rid = res?.reservationId || res?.id || null;
        const ttl = Number(res?.expiresInSeconds ?? res?.ttlSeconds ?? HOLD_SECONDS);
        if (rid) setReservationId(rid);
        setTimeLeft(ttl > 0 ? ttl : HOLD_SECONDS);
      } catch (err) {
        // If reservation fails, fall back to client hold but inform user could not reserve
        console.warn('Reserve failed', err);
        setTimeLeft(HOLD_SECONDS);
      }
    };
    doReserve();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, bookingItems, customerName, customerPhone, id]);

  // When reservation expires, notify server to release
  useEffect(() => {
    if (expired && reservationId) {
      releaseReservation({ reservationId }).catch(() => {});
    }
  }, [expired, reservationId]);

  // On unmount, if still have reservation and not confirmed, release it
  useEffect(() => {
    return () => {
      if (reservationId) {
        releaseReservation({ reservationId }).catch(() => {});
      }
    };
  }, [reservationId]);

  const handlePay = async () => {
    if (!isEnough || paying || expired) return;
    setPaying(true);
    try {
      // Call backend to confirm reservation + process payment
      if (reservationId) {
        const res = await confirmReservation({ reservationId, paymentMethod: 'wallet' });
        // Expect confirmation response; treat as success if no error
        setPaymentDone(true);
      } else {
        // No reservationId (server reserve failed) — attempt to confirm via full payload
        const payload = {
          venueId: Number(id),
          date: selectedDate,
          items: bookingItems?.map((it) => ({ fieldId: it.fieldId, ranges: it.ranges })) || [],
          paymentMethod: 'wallet',
        };
        await confirmReservation(payload);
        setPaymentDone(true);
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
              ) : (
                <>THANH TOÁN {formatPrice(totalPrice)}</>
              )}
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
