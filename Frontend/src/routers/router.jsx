import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CustomerHome from '../pages/Customer/CustomerHome';
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
import Layout from '../components/layout/Layout';
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

    {/* Owner routes */}
    <Route path="/owner" element={<ProtectedRoute element={<OwnerHome />} />} />
    <Route path="/owner/create-venue" element={<ProtectedRoute element={<CreateVenue />} />} />

    {/* Layout (Header + Footer): home, venues, booking */}
    <Route element={<Layout />}>
      <Route path="/" element={<CustomerHome />} />
      <Route path="/venue/:id/booking" element={<BookingSchedule />} />
      <Route path="/venue/:id/booking/confirm" element={<BookingConfirmation />} />
      <Route path="/venue/:id/booking/payment" element={<BookingPayment />} />
      <Route path="/wallet/top-up" element={<ProtectedRoute element={<WalletTopUp />} />} />
      <Route path="/bookings" element={<ProtectedRoute element={<BookingList />} />} />
      <Route path="/bookings/:id" element={<ProtectedRoute element={<BookingList />} />} />
      <Route path="/venues" element={<Venues />} />
      <Route path="/admin" element={<div>Admin Page</div>} />
    </Route>
  </Routes>
);

export default AppRoutes;
