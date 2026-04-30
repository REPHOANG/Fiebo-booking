import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, AlertTriangle, Calendar, Clock, Plus, Receipt, User, Wallet } from "lucide-react";
import { payEventTicket, getEventTicketById } from "../../services/eventService";
import { getWalletBalance } from "../../services/walletService";
import "../Customer/Booking/BookingPayment.css";

const formatPrice = (price) => (Number(price) > 0 ? `${Number(price).toLocaleString("vi-VN")} đ` : "0 đ");

/** Thời gian còn lại (giây) đến khi hết hạn thanh toán. Null = không có thông tin. */
const secondsLeftFromExpiredAt = (expiredAt) => {
  if (expiredAt == null || expiredAt === "") return null;
  const ts = new Date(expiredAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const secs = Math.floor((ts - Date.now()) / 1000);
  return secs;
};

const formatMMSS = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const EventTicketPayment = () => {
  const { id } = useParams();
  const ticketId = id;
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [ticketError, setTicketError] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const totalAmount = useMemo(() => {
    // Backend TicketDetailResponse: TotalAmount, PricePerTicket, TicketQuantity
    const t = ticket || {};
    return (
      Number(t.totalAmount ?? t.TotalAmount) ||
      (Number(t.pricePerTicket ?? t.PricePerTicket) || 0) * (Number(t.ticketQuantity ?? t.TicketQuantity) || 0)
    );
  }, [ticket]);

  const eventDate = useMemo(() => {
    const d = ticket?.eventDate ?? ticket?.EventDate;
    if (!d) return "";
    return String(d).slice(0, 10);
  }, [ticket]);

  const expiredAt = useMemo(() => ticket?.expiredAt ?? ticket?.ExpiredAt, [ticket]);
  const [timeLeft, setTimeLeft] = useState(null);
  const expired = timeLeft != null && timeLeft <= 0;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!ticketId) return;
      setLoadingTicket(true);
      setTicketError("");
      try {
        const data = await getEventTicketById(ticketId);
        if (mounted) setTicket(data ?? null);
      } catch (e) {
        if (mounted) {
          setTicket(null);
          setTicketError(e?.response?.data?.message ?? e?.message ?? "Không tải được thông tin vé.");
        }
      } finally {
        if (mounted) setLoadingTicket(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingBalance(true);
      try {
        const res = await getWalletBalance();
        if (mounted) setWalletBalance(Number(res?.balance ?? 0));
      } catch {
        if (mounted) setWalletBalance(0);
      } finally {
        if (mounted) setLoadingBalance(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // Đếm ngược trực tiếp theo expiredAt từ API.
  useEffect(() => {
    const initial = secondsLeftFromExpiredAt(expiredAt);
    if (initial == null) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(Math.max(0, initial));
  }, [expiredAt]);

  useEffect(() => {
    if (timeLeft == null) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // Khi vé đã hết hạn: tắt toast cũ "Đã giữ chỗ" để tránh mâu thuẫn với banner "Vé đã hết hạn"
  useEffect(() => {
    if (ticket && timeLeft != null && timeLeft <= 0 && typeof toast.dismiss === "function") {
      toast.dismiss();
    }
  }, [ticket, timeLeft]);

  const onPay = async () => {
    if (!ticketId) return;
    if (walletBalance < totalAmount) {
      toast.error("Số dư ví không đủ.");
      return;
    }
    setSubmitting(true);
    try {
      await payEventTicket(ticketId, { paymentMethod: "wallet" });
      toast.success("Thanh toán thành công!");
      navigate(`/event/ticket/${ticketId}`, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Thanh toán thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTicket) {
    return (
      <div className="bp-empty">
        <h2>Đang tải thanh toán...</h2>
        <p>Vui lòng chờ một chút.</p>
      </div>
    );
  }

  if (ticketError) {
    return (
      <div className="bp-empty">
        <h2>Không thể tải vé</h2>
        <p>{ticketError}</p>
        <button className="bp-back-link" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="bp-main">
      <div className="bp-header">
        <button className="bp-back-btn" type="button" onClick={() => navigate(-1)} disabled={submitting}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="bp-header-title">Thanh toán vé</h1>
        <div className="bp-header-spacer" />
      </div>

      <div className="bp-content">
        <div className="bp-left">
          {/* Countdown: luôn hiển thị khi có timeLeft (kể cả 00:00 khi hết hạn), giống BookingPayment */}
          {timeLeft != null && (
            <div className="bp-timer-card">
              <Clock size={20} className="bp-timer-icon" />
              <div className="bp-timer-text">
                <span>Đơn của bạn còn được giữ chỗ trong</span>
                <strong className={`bp-timer-count${timeLeft <= 60 ? " urgent" : ""}`}>
                  {formatMMSS(timeLeft)}
                </strong>
              </div>
            </div>
          )}

          {expired && (
            <div className="bp-notice-card" role="status">
              <AlertTriangle size={18} />
              <span>
                Vé này đã hết hạn thanh toán. Bạn vẫn có thể thử thanh toán nếu hệ thống chấp nhận, hoặc đăng ký lại.
              </span>
            </div>
          )}

          {/* Luôn hiển thị form Ví Fiebo (kể cả khi hết hạn để user có thể thử thanh toán) */}
          <div className="bp-wallet-card">
            <div className="bp-wallet-header">
              <Wallet size={20} />
              <span>Ví Fiebo</span>
            </div>

            <div className="bp-wallet-balance-row">
              <span className="bp-wallet-label">Số dư ví</span>
              <span className={`bp-wallet-balance ${walletBalance < totalAmount ? "low" : ""}`}>
                {loadingBalance ? "..." : formatPrice(walletBalance)}
              </span>
            </div>

            <div className="bp-wallet-amount-row">
              <span className="bp-wallet-label">Cần thanh toán</span>
              <span className="bp-wallet-amount">{formatPrice(totalAmount)}</span>
            </div>

            {!loadingBalance && walletBalance < totalAmount && (
              <div className="bp-wallet-warning">
                <AlertTriangle size={16} />
                <span>
                  Số dư không đủ. Bạn cần nạp thêm{" "}
                  <strong>{formatPrice(totalAmount - walletBalance)}</strong> để thanh toán.
                </span>
              </div>
            )}

            {!loadingBalance && (
              <Link
                className="bp-topup-btn"
                to="/wallet/top-up"
                state={{ returnTo: `/event/ticket/${ticketId}/payment` }}
              >
                <Plus size={18} />
                Nạp tiền vào ví
              </Link>
            )}
          </div>

          <button
            className={`bp-pay-btn ${submitting ? "loading" : ""}`}
            onClick={onPay}
            disabled={submitting || walletBalance < totalAmount}
          >
            {submitting ? (
              <span className="bp-pay-loading" />
            ) : expired ? (
              `THỬ THANH TOÁN ${formatPrice(totalAmount)}`
            ) : (
              `THANH TOÁN ${formatPrice(totalAmount)}`
            )}
          </button>
        </div>

        <div className="bp-right">
          <div className="bp-summary-card">
            <h3 className="bp-summary-title">Thông tin lịch đặt</h3>

          <div className="bp-summary-row">
            <div className="bp-summary-icon">
              <Receipt size={18} />
            </div>
            <div className="bp-summary-info">
              <span className="bp-summary-label">Ticket ID</span>
              <strong>#{ticketId}</strong>
            </div>
          </div>

          {eventDate && (
            <div className="bp-summary-row">
              <div className="bp-summary-icon">
                <Calendar size={18} />
              </div>
              <div className="bp-summary-info">
                <span className="bp-summary-label">Ngày</span>
                <strong>{eventDate}</strong>
              </div>
            </div>
          )}

          <div className="bp-summary-row">
            <div className="bp-summary-icon">
              <User size={18} />
            </div>
            <div className="bp-summary-info">
              <span className="bp-summary-label">Người tham gia</span>
              <strong>{ticket?.fullname ?? ticket?.fullName ?? "—"}</strong>
              {ticket?.phoneNumber ? <span className="bp-summary-field">{ticket.phoneNumber}</span> : null}
            </div>
          </div>

          <div className="bp-summary-row">
            <div className="bp-summary-icon">
              <Wallet size={18} />
            </div>
            <div className="bp-summary-info">
              <span className="bp-summary-label">Cần thanh toán</span>
              <strong className="bp-summary-price">{formatPrice(totalAmount)}</strong>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default EventTicketPayment;

