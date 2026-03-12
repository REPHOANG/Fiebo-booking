import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../landing/Header";
import BottomNav from "./BottomNav";
import Footer from "../landing/Footer";
import { getPaymentDraft, isDraftExpired, clearPaymentDraft } from "../../utils/paymentDraft";

const Layout = () => {
  const location = useLocation();
  const isBookingPage = location.pathname.includes("/booking");
  const isVenuesPage = location.pathname === "/venues";
  const isVenueDetailPage = /^\/venue\/[0-9]+$/.test(location.pathname);
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      const d = getPaymentDraft();
      if (d && !isDraftExpired(d)) setDraft(d);
    } catch (e) {}
  }, []);

  const handleResume = () => {
    if (!draft) return;
    // If we have bookingId, go to booking payment route with bookingId in state
    if (draft.bookingId) {
      navigate(`/venue/${draft.venueId}/booking/payment`, { state: { bookingId: draft.bookingId } });
    } else if (draft.venueId) {
      navigate(`/venue/${draft.venueId}/booking`, { state: { date: draft.selectedDate, slots: draft.selectedSlots } });
    }
  };

  const handleDismissDraft = () => {
    try { clearPaymentDraft(); } catch (e) {}
    setDraft(null);
  };

  return (
    <div className="layout">
      <Header />
      {draft && (
        <div className="draft-banner" style={{ background: 'linear-gradient(90deg,#f0fdf4,#ecfeff)', padding: '8px 16px', display: 'flex', justifyContent: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <strong>Bạn có đơn chờ thanh toán</strong>
            <button className="btn" onClick={handleResume} style={{ background: '#10b981', color: '#fff', borderRadius: 8, padding: '6px 12px' }}>Tiếp tục thanh toán</button>
            <button className="btn outline" onClick={handleDismissDraft} style={{ background: 'transparent', borderRadius: 8, padding: '6px 12px' }}>Bỏ qua</button>
          </div>
        </div>
      )}
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
      {!isBookingPage && !isVenuesPage && !isVenueDetailPage && <Footer />}
    </div>
  );
};

export default Layout;
