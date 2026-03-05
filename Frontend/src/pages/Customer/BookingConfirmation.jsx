import React, { useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Calendar, ChevronRight, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { sendBookingOtp, verifyBookingOtp, reserveSlots } from "../../services/bookingService";
import { clearDraft } from '../../store/bookingDraftSlice';
import { addBookedSlots } from '../../store/bookedSlotsSlice';
import { setCredentials } from "../../store/authSlice";
import "./BookingConfirmation.css";
const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth || {});

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("idle");
  const [otpCode, setOtpCode] = useState("");

  const formatPrice = (price) => (price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "0 đ");
  const [phoneError, setPhoneError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Start countdown timer for resending OTP
  const startCountdown = useCallback(() => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Send OTP to phone number
  const handleSendOtp = async () => {
    if (!guestPhone || guestPhone.length < 9) {
      setPhoneError("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }
    setPhoneError("");
    setPhoneStatus("sending");
    try {
      await sendBookingOtp(guestPhone);
      setPhoneStatus("otp-sent");
      startCountdown();
    } catch (err) {
      // Booking OTP may still succeed even if backend returns conflict for user account
      if (err.status === 409 || err.message?.includes("đã tồn tại") || err.message?.includes("already")) {
        setPhoneStatus("exists");
        setPhoneError("Số điện thoại này đã có tài khoản. Vui lòng đăng nhập.");
      } else {
        setPhoneStatus("otp-sent");
        startCountdown();
      }
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setPhoneError("Vui lòng nhập mã OTP");
      return;
    }
    setPhoneError("");
    setPhoneStatus("verifying");
    try {
      const result = await verifyBookingOtp(guestPhone, otpCode, guestName);
      // If backend returned an access token, persist it so subsequent booking/payment calls can use it
      const token = result?.accessToken || result?.token || result?.data || null;
      const userFromRes = result?.user || result?.data?.user || null;
      if (token) {
        try {
          const authState = { user: userFromRes || { name: guestName, phone: guestPhone }, token, isAuthenticated: !!token };
          localStorage.setItem('authState', JSON.stringify(authState));
          dispatch(setCredentials({ user: authState.user, token: authState.token }));
        } catch (e) {
          // ignore storage errors
        }
      }
      setPhoneStatus("verified");
    } catch (err) {
      setPhoneError(err.message || "Mã OTP không đúng");
      setPhoneStatus("otp-sent");
    }
  };

  const isGuestReady = phoneStatus === "verified" || (isAuthenticated && user);
  const displayName = isAuthenticated ? (user?.fullName || user?.name || "") : guestName;
  const displayPhone = isAuthenticated ? (user?.phone || user?.phoneNumber || "") : guestPhone;

  // Data passed from BookingSchedule via navigate state
  const bookingState = location.state;

  // If no booking data, redirect back
  if (!bookingState) {
    return (
      <div className="bc-empty">
        <h2>Không có dữ liệu đặt sân</h2>
        <p>Vui lòng quay lại trang đặt lịch để chọn khung giờ.</p>
        <button onClick={() => navigate(-1)} className="bc-back-link">
          ← Quay lại
        </button>
      </div>
    );
  }

  const { venue, fields, selectedDate, selectedSlots, slots, slotSummary } = bookingState;

  // Format the date nicely
  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";
    const [y, mo, d] = selectedDate.split("-");
    const date = new Date(y, mo - 1, d);
    const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${dayName}, ${d}/${mo}/${y}`;
  }, [selectedDate]);

  // Build detailed booking items
  const bookingItems = useMemo(() => {
    if (!slotSummary?.groups) return [];
    return slotSummary.groups.map((g) => ({
      fieldName: g.fieldName,
      ranges: g.ranges,
      slotCount: g.slotCount,
      pricePerSlot: g.pricePerSlot,
      subtotal: g.slotCount * g.pricePerSlot,
      duration: `${Math.floor((g.slotCount * 30) / 60)}h${(g.slotCount * 30) % 60 > 0 ? (g.slotCount * 30) % 60 + "p" : ""}`,
    }));
  }, [slotSummary]);

  const totalPrice = slotSummary?.totalPrice || 0;
  const totalMinutes = slotSummary?.totalMinutes || 0;

  const handleConfirmBooking = () => {
    (async () => {
      // Reserve slots on server for TTL before navigating to payment
      try {
        const payload = {
          venueId: Number(venue?.id),
          date: selectedDate,
          items: bookingItems?.map((it) => ({ fieldId: it.fieldId, ranges: it.ranges })) || [],
          customerName: displayName || guestName,
          customerPhone: displayPhone || guestPhone,
        };

        const res = await reserveSlots(payload);
        // Expect { reservationId, expiresInSeconds }
        const reservationId = res?.reservationId || res?.id || null;
        const ttl = Number(res?.expiresInSeconds ?? res?.ttlSeconds ?? 300);
        try {
          dispatch(clearDraft(venue?.id));
          // Mark slots as booked in local store so UI reflects booking immediately (respect server TTL when provided)
          try {
            dispatch(addBookedSlots({ venueId: String(venue?.id), date: selectedDate, slots: selectedSlots, ttlSeconds: ttl }));
          } catch (e) {}
        } catch (e) {}
        navigate(`/venue/${venue?.id || 'unknown'}/booking/payment`, {
          state: {
            venue,
            selectedDate,
            selectedSlots,
            slotSummary,
            bookingItems,
            customerName: displayName,
            customerPhone: displayPhone,
            totalPrice,
            reservationId,
            reservationTtl: ttl,
          },
        });
      } catch (err) {
        // If reservation failed, still navigate but without reservationId
        console.warn('Reserve failed, proceeding without server reservation', err);
        try {
          dispatch(clearDraft(venue?.id));
          // Mark slots as booked in local store so UI reflects booking immediately
          try {
            dispatch(addBookedSlots({ venueId: String(venue?.id), date: selectedDate, slots: selectedSlots }));
          } catch (e) {}
        } catch (e) {}
        navigate(`/venue/${venue?.id || 'unknown'}/booking/payment`, {
          state: {
            venue,
            selectedDate,
            selectedSlots,
            slotSummary,
            bookingItems,
            customerName: displayName,
            customerPhone: displayPhone,
            totalPrice,
          },
        });
      }
    })();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
    <div className="bc-main">
      {/* Header */}
      <div className="bc-header">
        <button className="bc-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="bc-header-title">Xác nhận đặt sân</h1>
        <div className="bc-header-spacer" />
      </div>

      {/* Venue info */}
      <div className="bc-section">
        <div className="bc-section-header">
          <MapPin size={18} />
          <span>Thông tin sân</span>
        </div>
        <div className="bc-venue-card">
          <h3 className="bc-venue-name">{venue?.name}</h3>
          {venue?.address && (
            <p className="bc-venue-address">{venue.address}</p>
          )}
          <div className="bc-venue-meta">
            <span className="bc-venue-tag">
              <Clock size={14} />
              {venue?.openTime?.slice(0, 5)} – {venue?.closeTime?.slice(0, 5)}
            </span>
          </div>
        </div>
      </div>

      {/* Booking date */}
      <div className="bc-section">
        <div className="bc-section-header">
          <Calendar size={18} />
          <span>Ngày đặt</span>
        </div>
        <div className="bc-date-card">
          <span className="bc-date-text">{formattedDate}</span>
        </div>
      </div>

      {/* Booking details */}
      <div className="bc-section">
        <div className="bc-section-header">
          <Clock size={18} />
          <span>Chi tiết đặt sân</span>
        </div>
        <div className="bc-items">
          {bookingItems.map((item, i) => (
            <div key={i} className="bc-item">
              <div className="bc-item-top">
                <span className="bc-item-field">{item.fieldName}</span>
                <span className="bc-item-duration">{item.duration}</span>
              </div>
              <div className="bc-item-times">
                {item.ranges.map((r, ri) => (
                  <span key={ri} className="bc-item-range">{r}</span>
                ))}
              </div>
              <div className="bc-item-bottom">
                <span className="bc-item-slots">
                  {item.slotCount} khung × {formatPrice(item.pricePerSlot)}
                </span>
                <span className="bc-item-subtotal">{formatPrice(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer info */}
      <div className="bc-section">
        <div className="bc-section-header">
          <span style={{ fontSize: "1.1rem" }}>👤</span>
          <span>Thông tin người đặt</span>
        </div>
        <div className="bc-customer-card">
          {isAuthenticated && user ? (
            /* ── Logged-in user ── */
            <>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Họ tên</span>
                <span className="bc-customer-value">{user.fullName || user.name || "—"}</span>
              </div>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Số điện thoại</span>
                <span className="bc-customer-value">{user.phone || user.phoneNumber || "—"}</span>
              </div>
              <div className="bc-customer-row">
                <span className="bc-customer-label">Email</span>
                <span className="bc-customer-value">{user.email || "—"}</span>
              </div>
            </>
          ) : phoneStatus === "verified" ? (
            /* ── Guest – verified ── */
            <div className="bc-verified-badge">
              <CheckCircle size={18} />
              <span>Đã xác thực: <strong>{guestName}</strong> — {guestPhone}</span>
            </div>
          ) : (
            /* ── Guest form ── */
            <div className="bc-guest-form">
              <p className="bc-guest-note">
                Bạn không cần tài khoản để đặt sân. Nhập thông tin và xác thực SĐT để tiếp tục.
              </p>

              {/* Name */}
              <div className="bc-field">
                <label className="bc-field-label">Họ tên</label>
                <input
                  className="bc-field-input"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>

              {/* Phone */}
              <div className="bc-field">
                <label className="bc-field-label">Số điện thoại</label>
                <div className="bc-phone-row">
                  <input
                    className={`bc-field-input${phoneStatus === "exists" ? " error" : ""}`}
                    type="tel"
                    placeholder="0912 345 678"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value.replace(/[^0-9]/g, ""));
                      setPhoneStatus("idle");
                      setPhoneError("");
                    }}
                    disabled={phoneStatus === "otp-sent" || phoneStatus === "verifying"}
                  />
                  {phoneStatus !== "otp-sent" && phoneStatus !== "verifying" && (
                    <button
                      className="bc-send-otp-btn"
                      onClick={handleSendOtp}
                      disabled={!guestPhone || guestPhone.length < 9 || !guestName.trim() || phoneStatus === "sending"}
                    >
                      {phoneStatus === "sending" ? (
                        <span className="bc-btn-loading" />
                      ) : (
                        <><Send size={14} /> Gửi OTP</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Phone exists warning */}
              {phoneStatus === "exists" && (
                <div className="bc-phone-warning">
                  <AlertTriangle size={16} />
                  <span>{phoneError}</span>
                  <button
                    className="bc-login-link"
                    onClick={() => navigate("/login", { state: { from: location } })}
                  >
                    Đăng nhập <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* OTP input */}
              {(phoneStatus === "otp-sent" || phoneStatus === "verifying") && (
                <div className="bc-otp-section">
                  <p className="bc-otp-hint">Nhập mã OTP đã gửi đến <strong>{guestPhone}</strong></p>
                  <div className="bc-otp-row">
                    <input
                      className="bc-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Nhập mã OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      autoFocus
                    />
                    <button
                      className="bc-verify-btn"
                      onClick={handleVerifyOtp}
                      disabled={!otpCode || otpCode.length < 4 || phoneStatus === "verifying"}
                    >
                      {phoneStatus === "verifying" ? (
                        <span className="bc-btn-loading" />
                      ) : (
                        "Xác thực"
                      )}
                    </button>
                  </div>
                  <div className="bc-otp-actions">
                    {countdown > 0 ? (
                      <span className="bc-countdown">Gửi lại sau {countdown}s</span>
                    ) : (
                      <button className="bc-resend-btn" onClick={handleSendOtp}>Gửi lại mã</button>
                    )}
                    <button
                      className="bc-change-phone-btn"
                      onClick={() => {
                        setPhoneStatus("idle");
                        setOtpCode("");
                        setPhoneError("");
                      }}
                    >
                      Đổi SĐT
                    </button>
                  </div>
                </div>
              )}

              {/* Generic error */}
              {phoneError && phoneStatus !== "exists" && (
                <p className="bc-field-error">{phoneError}</p>
              )}

              {/* Already have account hint */}
              {phoneStatus === "idle" && (
                <p className="bc-login-hint">
                  Đã có tài khoản?{" "}
                  <button
                    className="bc-login-link-inline"
                    onClick={() => navigate("/login", { state: { from: location } })}
                  >
                    Đăng nhập
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price summary */}
      <div className="bc-summary">
        <div className="bc-summary-row">
          <span>Tổng thời gian</span>
          <span className="bc-summary-val">
            {Math.floor(totalMinutes / 60)}h{totalMinutes % 60 > 0 ? totalMinutes % 60 + "p" : ""}
          </span>
        </div>
        <div className="bc-summary-row">
          <span>Tổng khung giờ</span>
          <span className="bc-summary-val">{selectedSlots?.length || 0} khung</span>
        </div>
        <div className="bc-summary-divider" />
        <div className="bc-summary-row total">
          <span>Tổng thanh toán</span>
          <span className="bc-summary-total">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Bottom action */}
      <div className="bc-bottom">
        <div className="bc-bottom-price">
          <span className="bc-bottom-label">Tổng cộng</span>
          <span className="bc-bottom-amount">{formatPrice(totalPrice)}</span>
        </div>
        <button
          className={`bc-confirm-btn${!isGuestReady ? " disabled" : ""}`}
          disabled={!isGuestReady}
          onClick={handleConfirmBooking}
        >
          XÁC NHẬN ĐẶT SÂN
        </button>
      </div>
    </div>
    </motion.div>
  );
};

export default BookingConfirmation;
