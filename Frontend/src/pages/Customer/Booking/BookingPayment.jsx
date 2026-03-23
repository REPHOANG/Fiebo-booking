import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
import {
  savePaymentDraft,
  clearPaymentDraft,
} from "../../../utils/paymentDraft";
import { payBooking, getBookingById } from "../../../services/bookingService";
import { getWalletBalance } from "../../../services/walletService";
import { addBookedSlots } from "../../../store/bookedSlotsSlice";
import { callPaymentWebhook } from "../../../services/bookingService";

const formatPrice = (price) =>
  price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ";

const HOLD_SECONDS = 5 * 60; // 5 minutes
const BOOKING_GRACE_STORAGE_KEY = (bookingId) =>
  `fiebo_booking_grace_${bookingId}`;
const PAYMENT_VENUE_SESSION_KEY = (venueId) => `fiebo_payment_venue_${venueId}`;

const BookingPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const token = localStorage.getItem("accessToken");
  const paymentState = location.state;
  const bookingIdFromQuery = searchParams.get("bookingId");
  const resolvedBookingId =
    paymentState?.bookingId ??
    (bookingIdFromQuery ? Number(bookingIdFromQuery) : null);

  // "Tiếp tục thanh toán" từ danh sách hoặc mở lại từ URL có ?bookingId= → gọi API lấy chi tiết
  const [continuePaymentState, setContinuePaymentState] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingLoadError, setBookingLoadError] = useState(null);

  useEffect(() => {
    if (resolvedBookingId && !paymentState?.totalPrice) {
      setSearchParams(
        { bookingId: String(resolvedBookingId) },
        { replace: true },
      );
    }
  }, [resolvedBookingId, paymentState?.totalPrice, setSearchParams]);

  // Reload: nếu không có state nhưng có session theo venue → chuyển sang URL có bookingId để tải lại đơn và dùng thời gian đã lưu
  useEffect(() => {
    if (paymentState != null || bookingIdFromQuery || !id) return;
    try {
      const raw = sessionStorage.getItem(PAYMENT_VENUE_SESSION_KEY(id));
      if (!raw) return;
      const data = JSON.parse(raw);
      const rid = data?.reservationId;
      const expiresAt = data?.reservationExpireAt
        ? Number(data.reservationExpireAt)
        : 0;
      if (!rid || expiresAt <= Date.now()) return;
      sessionStorage.setItem(BOOKING_GRACE_STORAGE_KEY(rid), String(expiresAt));
      setSearchParams({ bookingId: String(rid) }, { replace: true });
    } catch (_) {}
  }, [id, paymentState, bookingIdFromQuery, setSearchParams]);

  useEffect(() => {
    const bookingId = resolvedBookingId;
    if (!bookingId || paymentState?.totalPrice != null) return; // đã có state đầy đủ từ luồng confirm
    let cancelled = false;
    setLoadingBooking(true);
    setBookingLoadError(null);
    getBookingById(bookingId)
      .then((data) => {
        if (cancelled) return;
        const b = data?.data ?? data;
        const dateStr = b.date
          ? typeof b.date === "string"
            ? b.date
            : `${b.date.year}-${String(b.date.month).padStart(2, "0")}-${String(b.date.day).padStart(2, "0")}`
          : null;
        setContinuePaymentState({
          reservationId: b.bookingId ?? b.id,
          reservationExpireAt: b.expiredAt,
          reservationTtl: 5 * 60,
          venue: { id: b.venueId, name: b.venueName },
          totalPrice: Number(b.totalPrice) ?? 0,
          customerName: b.fullName ?? b.fullname ?? "",
          customerPhone: b.phone ?? b.phoneNumber ?? "",
          selectedDate: dateStr,
          bookingItems: (b.details || []).map((d) => ({
            fieldName: d.fieldName ?? "Sân",
            ranges:
              d.startTime != null && d.endTime != null
                ? [
                    `${String(d.startTime).slice(0, 5)} – ${String(d.endTime).slice(0, 5)}`,
                  ]
                : [],
          })),
        });
      })
      .catch((err) => {
        if (!cancelled)
          setBookingLoadError(err?.message || "Không tải được đơn đặt chỗ.");
      })
      .finally(() => {
        if (!cancelled) setLoadingBooking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedBookingId, paymentState?.totalPrice]);

  const effectiveState = continuePaymentState || paymentState;

  // Đồng bộ thời gian: lưu expiry theo venue + theo booking để reload không bị reset
  useEffect(() => {
    const state = effectiveState;
    if (!state?.reservationId || !state?.reservationExpireAt) return;
    const ts = new Date(state.reservationExpireAt).getTime();
    if (ts <= Date.now()) return;
    try {
      sessionStorage.setItem(
        BOOKING_GRACE_STORAGE_KEY(state.reservationId),
        String(ts),
      );
      if (id)
        sessionStorage.setItem(
          PAYMENT_VENUE_SESSION_KEY(id),
          JSON.stringify({
            reservationId: state.reservationId,
            reservationExpireAt: ts,
          }),
        );
    } catch (_) {}
  }, [effectiveState?.reservationId, effectiveState?.reservationExpireAt, id]);

  // Mark selected slots local-booked for UI if we have them (no server reserve by default)
  useEffect(() => {
    try {
      const bs = location.state;
      if (
        bs?.venue &&
        bs?.selectedDate &&
        Array.isArray(bs.selectedSlots) &&
        bs.selectedSlots.length > 0
      ) {
        const ttl = Number(bs.reservationTtl ?? 300);
        try {
          dispatch(
            addBookedSlots({
              venueId: String(bs.venue.id),
              date: bs.selectedDate,
              slots: bs.selectedSlots,
              ttlSeconds: ttl,
            }),
          );
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {}
  }, [location.state, dispatch]);

  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Hold countdown
  const [timeLeft, setTimeLeft] = useState(HOLD_SECONDS);
  const [expired, setExpired] = useState(false);
  const [reservationId, setReservationId] = useState(null);
  const [graceExpiresAt, setGraceExpiresAt] = useState(null);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      setLoadingBalance(true);
      try {
        const res = await getWalletBalance();
        setWalletBalance(res.balance ?? 0);
      } catch {
        setWalletBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };
    if (token) fetchBalance();
    else {
      setWalletBalance(0);
      setLoadingBalance(false);
    }
  }, [token]);

  const isContinuePaymentMode = !!continuePaymentState;

  // Init reservation + countdown from server expireAt (5 phút) or fallback TTL
  // Khi "Tiếp tục thanh toán": nếu expiredAt đã qua thì dùng grace; grace lưu sessionStorage để reload không reset
  useEffect(() => {
    const state = effectiveState;
    if (!state) return;
    if (state.reservationId) {
      setReservationId(state.reservationId);
    }
    const expireAt = state.reservationExpireAt;
    if (expireAt) {
      const secs = Math.max(
        0,
        Math.floor((new Date(expireAt) - Date.now()) / 1000),
      );
      if (secs > 0) {
        setTimeLeft(secs);
        setGraceExpiresAt(null);
        return;
      }
      if (isContinuePaymentMode) {
        const key = BOOKING_GRACE_STORAGE_KEY(state.reservationId);
        const stored = sessionStorage.getItem(key);
        const now = Date.now();
        if (stored) {
          const expiresAt = parseInt(stored, 10);
          const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setTimeLeft(remaining);
          setGraceExpiresAt(expiresAt);
        } else {
          const expiresAt = now + HOLD_SECONDS * 1000;
          sessionStorage.setItem(key, String(expiresAt));
          setTimeLeft(HOLD_SECONDS);
          setGraceExpiresAt(expiresAt);
        }
        return;
      }
      setTimeLeft(0);
      return;
    }
    const ttl = Number(state.reservationTtl ?? HOLD_SECONDS);
    setTimeLeft(ttl > 0 ? ttl : HOLD_SECONDS);
  }, [
    effectiveState?.reservationId,
    effectiveState?.reservationExpireAt,
    effectiveState?.reservationTtl,
    isContinuePaymentMode,
  ]);

  useEffect(() => {
    if (paymentDone || expired) return;
    if (timeLeft <= 0) {
      if (!isContinuePaymentMode) setExpired(true);
      return;
    }
    const timer = setTimeout(() => {
      if (graceExpiresAt != null) {
        const secs = Math.max(
          0,
          Math.floor((graceExpiresAt - Date.now()) / 1000),
        );
        setTimeLeft(secs);
        return;
      }
      const expireAt = effectiveState?.reservationExpireAt;
      if (expireAt) {
        const secs = Math.max(
          0,
          Math.floor((new Date(expireAt) - Date.now()) / 1000),
        );
        if (secs > 0) {
          setTimeLeft(secs);
        } else if (isContinuePaymentMode) {
          setTimeLeft((t) => Math.max(0, t - 1));
        } else {
          setTimeLeft(0);
          setExpired(true);
        }
      } else {
        setTimeLeft((t) => {
          if (t <= 1 && !isContinuePaymentMode) setExpired(true);
          return Math.max(0, t - 1);
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    timeLeft,
    paymentDone,
    expired,
    effectiveState?.reservationExpireAt,
    isContinuePaymentMode,
    graceExpiresAt,
  ]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const venue = effectiveState?.venue;
  const selectedDate = effectiveState?.selectedDate;
  const slotSummary = effectiveState?.slotSummary;
  const bookingItems = effectiveState?.bookingItems;
  const customerName = effectiveState?.customerName;
  const customerPhone = effectiveState?.customerPhone;
  const totalPrice = effectiveState?.totalPrice ?? 0;
  const isEnough = walletBalance >= totalPrice;

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

  // Save draft while user is on payment page so they can return later
  useEffect(() => {
    const draft = {
      bookingId: reservationId ?? effectiveState?.reservationId,
      venueId: venue?.id,
      selectedDate: selectedDate ?? effectiveState?.selectedDate,
      selectedSlots:
        location.state?.selectedSlots ?? effectiveState?.selectedSlots ?? [],
      totalPrice: totalPrice ?? effectiveState?.totalPrice ?? 0,
      expiresAt: effectiveState?.reservationExpireAt ?? null,
    };
    if (draft.bookingId || (draft.venueId && draft.selectedSlots?.length)) {
      savePaymentDraft(draft);
    }
    const handleBeforeUnload = () => savePaymentDraft(draft);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    reservationId,
    effectiveState,
    venue?.id,
    selectedDate,
    totalPrice,
    location.state,
  ]);

  const formattedDate = useMemo(() => {
    const sd = selectedDate ?? effectiveState?.selectedDate;
    if (!sd) return "";
    const [y, mo, d] = String(sd).split("-");
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${dayName}, ${d}/${mo}/${y}`;
  }, [selectedDate, effectiveState?.selectedDate]);

  if (bookingLoadError) {
    return (
      <div className="bp-empty">
        <h2>Không tải được đơn đặt chỗ</h2>
        <p>{bookingLoadError}</p>
        <button onClick={() => navigate("/bookings")} className="bp-back-link">
          ← Về danh sách đặt chỗ
        </button>
      </div>
    );
  }

  if (!effectiveState) {
    if ((resolvedBookingId || paymentState?.bookingId) && loadingBooking) {
      return (
        <div className="bp-empty">
          <p>Đang tải thông tin đơn đặt chỗ...</p>
        </div>
      );
    }
    return (
      <div className="bp-empty">
        <h2>Không có thông tin thanh toán</h2>
        <p>
          Vui lòng quay lại trang đặt lịch hoặc chọn "Tiếp tục thanh toán" từ
          Sân đã đặt.
        </p>
        <button onClick={() => navigate("/bookings")} className="bp-back-link">
          ← Về danh sách đặt chỗ
        </button>
      </div>
    );
  }

  const handlePay = async () => {
    if (!token) {
      navigate("/auth/login", {
        state: { returnTo: location.pathname, returnState: effectiveState },
      });
      return;
    }
    if (!isEnough || paying || expired) {
      if (!isEnough)
        alert(
          "Số dư không đủ. Vui lòng nạp thêm vào ví.",
        );
      return;
    }
    setPaying(true);
    try {
      const bookingId = reservationId;
      if (!bookingId) {
        alert(
          "Không tìm thấy mã đặt chỗ trên máy chủ. Vui lòng hoàn tất xác nhận đặt sân trước khi thanh toán.",
        );
        setPaying(false);
        return;
      }
      await payBooking(bookingId, { paymentMethod: "wallet" });
      try {
        await callPaymentWebhook(bookingId, { paymentMethod: "wallet" });
      } catch (webErr) {
        // non-fatal: continue
      }
      setPaymentDone(true);
      try {
        clearPaymentDraft();
      } catch (e) {}
      try {
        sessionStorage.removeItem(BOOKING_GRACE_STORAGE_KEY(bookingId));
        if (id) sessionStorage.removeItem(PAYMENT_VENUE_SESSION_KEY(id));
      } catch (_) {}
    } catch (payErr) {
      console.error("Payment failed", payErr);
      alert(
        "Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
      );
    } finally {
      setPaying(false);
    }
  };

  const handleTopUp = () => {
    navigate("/wallet/top-up", {
      state: { returnTo: location.pathname, returnState: effectiveState },
    });
  };

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
                <strong className="bp-success-price">
                  {formatPrice(totalPrice)}
                </strong>
              </div>
            </div>
            <button className="bp-home-btn" onClick={() => navigate("/")}>
              Về trang chủ
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Expired ── */
  const handleTryPayAfterExpired = async () => {
    if (!reservationId || paying) return;
    setPaying(true);
    try {
      await payBooking(reservationId, { paymentMethod: "wallet" });
      try {
        await callPaymentWebhook(reservationId, { paymentMethod: "wallet" });
      } catch (webErr) {
        // non-fatal
      }
      setPaymentDone(true);
      try {
        sessionStorage.removeItem(BOOKING_GRACE_STORAGE_KEY(reservationId));
        if (id) sessionStorage.removeItem(PAYMENT_VENUE_SESSION_KEY(id));
      } catch (_) {}
    } catch (err) {
      alert(
        err?.message ||
          "Không thể thanh toán. Đơn có thể đã bị hủy hoặc hết hạn.",
      );
    } finally {
      setPaying(false);
    }
  };

  if (expired) {
    return (
      <motion.div {...pageTransition}>
        <div className="bp-main">
          <div className="bp-expired">
            <div className="bp-expired-icon">
              <Clock size={48} />
            </div>
            <h2>Hết thời gian giữ chỗ</h2>
            <p>
              Đơn đặt sân đã hết hạn. Bạn vẫn có thể thử thanh toán nếu đơn còn
              hiệu lực trên hệ thống.
            </p>
            <div className="bp-expired-actions">
              {reservationId && (
                <button
                  type="button"
                  className="bp-btn-try-pay"
                  onClick={handleTryPayAfterExpired}
                  disabled={paying}
                >
                  {paying ? "Đang xử lý..." : "Thử thanh toán"}
                </button>
              )}
              <button
                className="bp-back-link"
                onClick={() => navigate("/bookings")}
              >
                ← Về danh sách đặt chỗ
              </button>
              <button
                className="bp-back-link secondary"
                onClick={() => navigate(`/venue/${id}?book=1`)}
              >
                Đặt sân mới
              </button>
            </div>
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
          <button
            className="bp-back-btn"
            onClick={() => navigate(-1)}
            disabled={paying}
            aria-disabled={paying}
          >
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
                <strong
                  className={`bp-timer-count${timeLeft <= 60 ? " urgent" : ""}`}
                >
                  {timerDisplay}
                </strong>
              </div>
            </div>

            {isContinuePaymentMode && timeLeft <= 0 && (
              <div className="bp-notice-card" role="status">
                <AlertTriangle size={18} />
                <span>
                  Thời gian giữ chỗ đã qua. Bạn vẫn có thể thanh toán nếu đơn
                  còn hiệu lực.
                </span>
              </div>
            )}

            {(effectiveState?.slotMappingFailed ||
              !effectiveState?.reservationId) &&
              !(isContinuePaymentMode && timeLeft <= 0) && (
                <div className="bp-notice-card" role="status">
                  <AlertTriangle size={18} />
                  <span>
                    {effectiveState?.slotMappingFailed
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
                <span className="bp-wallet-amount">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              {!loadingBalance && !isEnough && (
                <div className="bp-wallet-warning">
                  <AlertTriangle size={16} />
                  <span>
                    Số dư không đủ. Bạn cần nạp thêm{" "}
                    <strong>{formatPrice(totalPrice - walletBalance)}</strong>{" "}
                    để thanh toán.
                  </span>
                </div>
              )}

              {!loadingBalance && (
                <button
                  className="bp-topup-btn"
                  onClick={handleTopUp}
                  disabled={paying}
                  aria-disabled={paying}
                >
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
              <button
                className="bp-login-btn"
                onClick={() =>
                  navigate("/auth/login", {
                    state: {
                      returnTo: location.pathname,
                      returnState: effectiveState,
                    },
                  })
                }
                disabled={paying}
                aria-disabled={paying}
              >
                Đăng nhập
              </button>
            )}
          </div>

          {/* Right: Booking summary */}
          <div className="bp-right">
            <div className="bp-summary-card">
              <h3 className="bp-summary-title">Thông tin lịch đặt</h3>

              <div className="bp-summary-row">
                <div className="bp-summary-icon">
                  <User size={18} />
                </div>
                <div className="bp-summary-info">
                  <span className="bp-summary-label">Tên</span>
                  <strong>{customerName || "—"}</strong>
                </div>
              </div>

              <div className="bp-summary-row">
                <div className="bp-summary-icon">
                  <Phone size={18} />
                </div>
                <div className="bp-summary-info">
                  <span className="bp-summary-label">SĐT</span>
                  <strong>{customerPhone || "—"}</strong>
                </div>
              </div>

              <div className="bp-summary-row">
                <div className="bp-summary-icon">
                  <Calendar size={18} />
                </div>
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
                <div className="bp-summary-icon">
                  <Receipt size={18} />
                </div>
                <div className="bp-summary-info">
                  <span className="bp-summary-label">Tổng đơn</span>
                  <strong className="bp-summary-price">
                    {formatPrice(totalPrice)}
                  </strong>
                </div>
              </div>

              <div className="bp-summary-row">
                <div className="bp-summary-icon">
                  <Wallet size={18} />
                </div>
                <div className="bp-summary-info">
                  <span className="bp-summary-label">Cần thanh toán</span>
                  <strong className="bp-summary-price">
                    {formatPrice(totalPrice)}
                  </strong>
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
