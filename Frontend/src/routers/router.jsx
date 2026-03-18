import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CustomerHome from '../pages/Customer/Home/CustomerHome';
import VenueDetail from '../pages/Customer/VenueDetail';
import BookingSchedule from '../pages/Customer/Booking/BookingSchedule';
import BookingConfirmation from '../pages/Customer/Booking/BookingConfirmation';
import BookingPayment from '../pages/Customer/Booking/BookingPayment';
import Login from '../pages/auth/Login';
import OwnerLogin from '../pages/auth/OwnerLogin';
import OwnerHome from '../pages/Owner/OwnerHome';
import Register from '../pages/auth/Register';
import Profile from '../pages/Profile';
import Venues from '../pages/Venues';
import ForgotPassword from '../pages/auth/ForgotPassword';
import VerifyOTP from '../pages/auth/VerifyOTP';
import ProtectedRoute from './ProtectedRoute';
import CreateVenue from '../pages/Owner/CreateVenue';
import OwnerVenues from '../pages/Owner/OwnerVenues';
import OwnerEvents from '../pages/Owner/OwnerEvents';
import CreateEvent from '../pages/Owner/CreateEvent';
import EventDetail from '../pages/Event/EventDetail';
import EventRegister from '../pages/Event/EventRegister';
import EventTicketDetail from '../pages/Event/EventTicketDetail';
import EventTicketPayment from '../pages/Event/EventTicketPayment';
import EventList from '../pages/Event/EventList';
import Events from '../pages/Event/Events';
import Layout from '../components/layout/Layout';
import OwnerLayout from '../components/layout/OwnerLayout';
import WalletTopUp from '../pages/Customer/WalletTopUp';
import GiveRating from '../pages/Customer/GiveRating/GiveRating';
import BookingList from '../pages/Customer/BookingList';

/**
 * Định nghĩa toàn bộ routes của app.
 * App.jsx bọc component này bằng <BrowserRouter>.
 */
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/owner/login" element={<OwnerLogin />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-otp" element={<VerifyOTP />} />
    <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/rating" element={<GiveRating />} />

    <Route path="/venue/:id" element={<VenueDetail />} />

    {/* Event routes (require login) */}
    <Route path="/event/:id" element={<ProtectedRoute element={<EventDetail />} />} />
    <Route path="/event/:id/register" element={<ProtectedRoute element={<EventRegister />} />} />
    <Route path="/event/ticket/:id" element={<ProtectedRoute element={<EventTicketDetail />} />} />
    <Route path="/event/ticket/:id/payment" element={<ProtectedRoute element={<EventTicketPayment />} />} />

    {/* Owner routes với layout riêng */}
    <Route
      element={
        <ProtectedRoute
          element={<OwnerLayout />}
          requiredRole={"FieldOwner"}
        />
      }
    >
      <Route path="/owner" element={<OwnerHome />} />
      <Route path="/owner/venues" element={<OwnerVenues />} />
      <Route path="/owner/create-venue" element={<CreateVenue />} />
    <Route path="/owner/events" element={<OwnerEvents />} />
    <Route path="/owner/events/create" element={<CreateEvent />} />
    </Route>

    {/* Layout (Header + Footer): home, venues, booking */}
    <Route element={<Layout />}>
      <Route path="/" element={<CustomerHome />} />
      <Route path="/venue/:id/booking" element={<BookingSchedule />} />
      <Route path="/venue/:id/social-session" element={<ProtectedRoute element={<EventList />} />} />
      <Route path="/venue/:id/booking/confirm" element={<BookingConfirmation />} />
      <Route path="/venue/:id/booking/payment" element={<BookingPayment />} />
      <Route path="/events" element={<Events />} />
      <Route path="/wallet/top-up" element={<ProtectedRoute element={<WalletTopUp />} />} />
      <Route path="/bookings" element={<ProtectedRoute element={<BookingList />} />} />
      <Route path="/bookings/:id" element={<ProtectedRoute element={<BookingList />} />} />
      <Route path="/venues" element={<Venues />} />
      <Route path="/admin" element={<div>Admin Page</div>} />
    </Route>
  </Routes>
);

export default AppRoutes;
