import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useDispatch } from "react-redux";
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
import { clearPaymentDraft } from "../../../store/paymentDraftSlice";
import { payBooking, getBookingById } from "../../../services/bookingService";
import { getWalletBalance } from "../../../services/walletService";
import { addBookedSlots } from "../../../store/bookedSlotsSlice";
import { useAuthModal } from "../../../context/AuthModalContext";

const formatPrice = (price) =>
  price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ";

const HOLD_SECONDS = 5 * 60; // fallback for local slot cache only

const PAID_STATUSES = new Set(["Booked", "Completed"]);
const TERMINAL_UNPAID_STATUSES = new Set([
  "Expired",
  "OwnerCancelled",
  "CustomerCancelled",
]);

const formatDateFromBooking = (b) => {
  const rawDate = b?.date ?? b?.dateStr;
  if (!rawDate) return "";
  const d = rawDate;
  const dateStr =
    typeof d === "string"
      ? d
      : `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  const [y, mo, day] = String(dateStr).split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(day));
  const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
  return `${dayName}, ${day}/${mo}/${y}`;
};

/**
 * Chuẩn hoá payload GET /api/Booking/{id} (camelCase / PascalCase, DateOnly / ISO).
 * Không đọc thông tin đơn từ localStorage/sessionStorage — chỉ từ API.
 */
function normalizeBookingDetail(raw) {
  const b =
    raw && typeof raw === "object" && raw.data !== undefined && !Array.isArray(raw)
      ? raw.data
      : raw;
  if (!b || typeof b !== "object") return null;
  const bookingId = b.bookingId ?? b.BookingId ?? b.id;
  if (bookingId == null || bookingId === "") return null;
  const dateRaw = b.date ?? b.Date ?? b.bookingDate ?? b.BookingDate;
  let dateStr = null;
  if (typeof dateRaw === "string") {
    dateStr = dateRaw.slice(0, 10);
  } else if (dateRaw && typeof dateRaw === "object" && dateRaw.year != null) {
    dateStr = `${dateRaw.year}-${String(dateRaw.month).padStart(2, "0")}-${String(dateRaw.day).padStart(2, "0")}`;
  }
  const details = b.details ?? b.Details ?? [];
  const bookingItems = details.map((d) => {
    const fieldName = d.fieldName ?? d.FieldName ?? "Sân";
    const st = d.startTime ?? d.StartTime;
    const et = d.endTime ?? d.EndTime;
    const ranges =
      st != null && et != null
        ? [`${String(st).slice(0, 5)} – ${String(et).slice(0, 5)}`]
        : [];
    return { fieldName, ranges };
  });
  return {
    bookingId: Number(bookingId),
    fullName: b.fullName ?? b.FullName ?? "",
    phone: b.phone ?? b.Phone ?? b.phoneNumber ?? b.PhoneNumber ?? "",
    totalPrice: Number(b.totalPrice ?? b.TotalPrice) || 0,
    venueId: b.venueId ?? b.VenueId,
    venueName: b.venueName ?? b.VenueName ?? "",
    status: String(b.status ?? b.Status ?? ""),
    expiredAt: b.expiredAt ?? b.ExpiredAt ?? null,
    dateStr,
    bookingItems,
  };
}

/**
 * Trang thành công — URL riêng + replace sau thanh toán để nút Back không quay lại form payment.
 */
export function BookingPaymentSuccess() {
  const { bookingId: bookingIdParam } = useParams();
  const navigate = useNavigate();
  const bookingId = bookingIdParam ? Number(bookingIdParam) : NaN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      setLoading(false);
      setError("Liên kết không hợp lệ.");
      return;
    }
    let cancelled = false;
    getBookingById(bookingId)
      .then((data) => {
        if (cancelled) return;
        const b = normalizeBookingDetail(data);
        if (!b) {
          setError("Không đọc được thông tin đơn đặt chỗ.");
          return;
        }
        const st = String(b.status ?? "");
        if (!PAID_STATUSES.has(st)) {
          setError(
            st === "Pending"
              ? "Đơn chưa thanh toán."
              : "Đơn không ở trạng thái đã thanh toán.",
          );
        }
        setDetail(b);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e?.message || "Không tải được thông tin đặt chỗ.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const pageTransition = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.35, ease: "easeInOut" },
  };

  if (loading) {
    return (
      <div className="bp-empty">
        <p>Đang tải...</p>
      </div>
    );
  }

  const paid =
    detail && PAID_STATUSES.has(String(detail.status ?? ""));
  const formattedDate = detail ? formatDateFromBooking(detail) : "";

  return (
    <motion.div {...pageTransition}>
      <div className="bp-main">
        {paid ? (
          <div className="bp-success">
            <div className="bp-success-icon">
              <CheckCircle2 size={56} />
            </div>
            <h2>Đặt sân thành công!</h2>
            <p>Đơn đặt sân của bạn đã được xác nhận và thanh toán.</p>
            <div className="bp-success-details">
              <div className="bp-success-row">
                <span>Sân</span>
                <strong>{detail.venueName}</strong>
              </div>
              <div className="bp-success-row">
                <span>Ngày</span>
                <strong>{formattedDate}</strong>
              </div>
              <div className="bp-success-row">
                <span>Tổng tiền</span>
                <strong className="bp-success-price">
                  {formatPrice(Number(detail.totalPrice) || 0)}
                </strong>
              </div>
            </div>
            <button className="bp-home-btn" onClick={() => navigate("/")}>
              Về trang chủ
            </button>
          </div>
        ) : (
          <div className="bp-empty">
            <h2>Không thể hiển thị xác nhận</h2>
            <p>{error || "Đơn chưa thanh toán hoặc đã hết hạn."}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => navigate(`/booking/${bookingId}/payment`)}
                className="bp-back-link"
              >
                Đi tới thanh toán
              </button>
              <button
                type="button"
                onClick={() => navigate("/bookings")}
                className="bp-back-link secondary"
              >
                ← Sân đã đặt
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const BookingPayment = () => {
  const { bookingId: bookingIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { openLogin } = useAuthModal();

  const token = localStorage.getItem("accessToken");
  const paymentState = location.state;
  const routeBookingId = bookingIdParam ? Number(bookingIdParam) : NaN;
  const fromState = paymentState?.reservationId ?? paymentState?.bookingId;
  const resolvedBookingId =
    Number.isFinite(routeBookingId) && routeBookingId > 0
      ? routeBookingId
      : fromState != null && Number(fromState) > 0
        ? Number(fromState)
        : null;

  const [bookingDetail, setBookingDetail] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingLoadError, setBookingLoadError] = useState(null);

  const applyGetBookingResult = useCallback(
    (raw, { silent = false } = {}) => {
      const b = normalizeBookingDetail(raw);
      if (!b) {
        if (!silent) {
          setBookingLoadError("Không đọc được dữ liệu đơn.");
          setBookingDetail(null);
        }
        return;
      }
      if (PAID_STATUSES.has(b.status)) {
        navigate(`/booking/${resolvedBookingId}/payment/success`, {
          replace: true,
        });
        return;
      }
      if (TERMINAL_UNPAID_STATUSES.has(b.status)) {
        setBookingLoadError(
          "Đơn không còn ở trạng thái chờ thanh toán (hết hạn hoặc đã hủy).",
        );
        setBookingDetail(null);
        return;
      }
      setBookingDetail(b);
      setBookingLoadError(null);
    },
    [navigate, resolvedBookingId],
  );

  useEffect(() => {
    if (!resolvedBookingId) {
      setBookingDetail(null);
      setBookingLoadError(null);
      setLoadingBooking(false);
      return;
    }
    let cancelled = false;
    setLoadingBooking(true);
    setBookingLoadError(null);
    getBookingById(resolvedBookingId)
      .then((raw) => {
        if (cancelled) return;
        applyGetBookingResult(raw, { silent: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setBookingDetail(null);
        const st = err?.response?.status;
        if (st === 401) {
          setBookingLoadError(
            "Vui lòng đăng nhập để xem thông tin đơn đặt chỗ và thanh toán.",
          );
        } else {
          setBookingLoadError(
            err?.response?.data?.message ??
              err?.message ??
              "Không tải được đơn đặt chỗ.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBooking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedBookingId, applyGetBookingResult]);

  /** Khi user quay lại tab: refetch GET booking để đồng bộ expiredAt / trạng thái (không bật loading). */
  useEffect(() => {
    if (!resolvedBookingId) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      getBookingById(resolvedBookingId)
        .then((raw) => {
          applyGetBookingResult(raw, { silent: true });
        })
        .catch(() => {
          /* giữ bookingDetail cũ */
        });
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [resolvedBookingId, applyGetBookingResult]);

  useEffect(() => {
    try {
      const bs = location.state;
      if (
        bs?.venue &&
        bs?.selectedDate &&
        Array.isArray(bs.selectedSlots) &&
        bs.selectedSlots.length > 0
      ) {
        const ttl = Number(bs.reservationTtl ?? HOLD_SECONDS);
        dispatch(
          addBookedSlots({
            venueId: String(bs.venue.id),
            date: bs.selectedDate,
            slots: bs.selectedSlots,
            ttlSeconds: ttl > 0 ? ttl : HOLD_SECONDS,
          }),
        );
      }
    } catch (e) {
      /* ignore */
    }
  }, [location.state, dispatch]);

  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paying, setPaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  /** Đếm ngược theo expiredAt từ API detail booking. */
  useEffect(() => {
    if (!bookingDetail) return;

    const deadlineMs = new Date(bookingDetail.expiredAt).getTime();
    if (!Number.isFinite(deadlineMs)) {
      setTimeLeft(0);
      setExpired(true);
      return;
    }

    const tick = () => {
      const secs = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs <= 0) setExpired(true);
      else setExpired(false);
    };

    tick();
    const idTimer = setInterval(tick, 1000);
    return () => clearInterval(idTimer);
  }, [bookingDetail]);

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

  const reservationId = bookingDetail?.bookingId;
  const totalPrice = bookingDetail?.totalPrice ?? 0;
  const customerName = bookingDetail?.fullName ?? "";
  const customerPhone = bookingDetail?.phone ?? "";
  const bookingItems = bookingDetail?.bookingItems;

  const formattedDate = useMemo(() => {
    const sd = bookingDetail?.dateStr;
    if (!sd) return "";
    const [y, mo, d] = String(sd).split("-");
    if (!y || !mo || !d) return "";
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${dayName}, ${d}/${mo}/${y}`;
  }, [bookingDetail?.dateStr]);

  const isEnough = walletBalance >= totalPrice;

  const tl = Number.isFinite(timeLeft) && timeLeft >= 0 ? timeLeft : 0;
  const minutes = Math.floor(tl / 60);
  const seconds = tl % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (bookingLoadError) {
    return (
      <div className="bp-empty">
        <h2>Không tải được đơn đặt chỗ</h2>
        <p>{bookingLoadError}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {bookingLoadError.includes("đăng nhập") ? (
            <button type="button" onClick={() => openLogin()} className="bp-back-link">
              Đăng nhập
            </button>
          ) : null}
          <button type="button" onClick={() => navigate("/bookings")} className="bp-back-link">
            ← Về danh sách đặt chỗ
          </button>
        </div>
      </div>
    );
  }

  if (!resolvedBookingId) {
    return (
      <div className="bp-empty">
        <h2>Không có thông tin thanh toán</h2>
        <p>
          Thiếu mã đặt chỗ trên URL (bookingId). Vui lòng hoàn tất đặt sân hoặc mở lại liên kết từ
          &quot;Sân đã đặt&quot;.
        </p>
        <button type="button" onClick={() => navigate("/bookings")} className="bp-back-link">
          ← Về danh sách đặt chỗ
        </button>
      </div>
    );
  }

  if (loadingBooking || !bookingDetail) {
    return (
      <div className="bp-empty">
        <p>Đang tải thông tin đơn đặt chỗ...</p>
      </div>
    );
  }

  const handlePay = async () => {
    if (!token) {
      openLogin();
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
      dispatch(clearPaymentDraft());
      navigate(`/booking/${bookingId}/payment/success`, {
        replace: true,
      });
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
    const returnTo = `${location.pathname}${location.search || ""}`;
    navigate("/wallet/top-up", {
      state: { returnTo, returnPath: returnTo },
    });
  };

  const pageTransition = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.35, ease: "easeInOut" },
  };

  if (expired) {
    const venueId = bookingDetail?.venueId ?? paymentState?.venue?.id;
    return (
      <motion.div {...pageTransition}>
        <div className="bp-main">
          <div className="bp-expired">
            <div className="bp-expired-icon">
              <Clock size={48} />
            </div>
            <h2>Hết thời gian thanh toán trên trang này</h2>
            <p>
              Đơn đã hết hạn thanh toán theo thời gian giữ chỗ từ hệ thống. Vui lòng đặt lại hoặc
              kiểm tra đơn tại
              &quot;Sân đã đặt&quot;.
            </p>
            <div className="bp-expired-actions">
              <button
                type="button"
                className="bp-back-link"
                onClick={() => navigate("/bookings")}
              >
                ← Về danh sách đặt chỗ
              </button>
              <button
                type="button"
                className="bp-back-link secondary"
                onClick={() => navigate(venueId ? `/venue/${venueId}?book=1` : "/bookings")}
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
            type="button"
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
                  className={`bp-timer-count${tl <= 60 ? " urgent" : ""}`}
                >
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
                  type="button"
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
                type="button"
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

            {!token && (
              <button
                type="button"
                className="bp-login-btn"
                onClick={() => openLogin()}
                disabled={paying}
                aria-disabled={paying}
              >
                Đăng nhập
              </button>
            )}
          </div>

          {/* Right: Booking summary — toàn bộ từ API chi tiết đặt chỗ */}
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
