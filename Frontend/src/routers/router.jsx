import React from 'react';
import { useRoutes } from 'react-router-dom';
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
import OwnerEventDetail from '../pages/Owner/OwnerEventDetail';
import OwnerBookings from '../pages/Owner/OwnerBookings';
import OwnerBookingDetail from '../pages/Owner/OwnerBookingDetail';
import StaffList from '../pages/Owner/Staff/StaffList';
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
import Wallet from '../pages/Customer/Wallet/Wallet';
import ServiceManagement from '../pages/Owner/VenueService/ServiceManagement';
import PayoutList from '../pages/Owner/Payout/PayoutList';


/**
 * Định nghĩa toàn bộ routes của app.
 * App.jsx bọc component này bằng <BrowserRouter>.
 */
const AppRoutes = () => {
  const routes = [
    { path: '/login', element: <Login /> },
    { path: '/owner/login', element: <OwnerLogin /> },
    { path: '/register', element: <Register /> },
    { path: '/verify-otp', element: <VerifyOTP /> },
    { path: '/profile', element: <ProtectedRoute element={<Profile />} /> },
    { path: '/forgot-password', element: <ForgotPassword /> },
    { path: '/rating', element: <GiveRating /> },
    { path: '/venue/:id', element: <VenueDetail /> },
    { path: '/event/:id', element: <ProtectedRoute element={<EventDetail />} /> },
    { path: '/event/:id/register', element: <ProtectedRoute element={<EventRegister />} /> },
    { path: '/event/ticket/:id', element: <ProtectedRoute element={<EventTicketDetail />} /> },
    { path: '/event/ticket/:id/payment', element: <ProtectedRoute element={<EventTicketPayment />} /> },
    {
      path: '/owner',
      element: <ProtectedRoute element={<OwnerLayout />} requiredRole={'FieldOwner'} />,
      children: [
        { index: true, element: <OwnerHome /> },
        { path: 'venues', element: <OwnerVenues /> },
        { path: 'create-venue', element: <CreateVenue /> },
        { path: 'bookings', element: <OwnerBookings /> },
        { path: 'bookings/:id', element: <OwnerBookingDetail /> },
        { path: 'staff', element: <StaffList /> },
        { path: 'events', element: <OwnerEvents /> },
        { path: 'events/create', element: <CreateEvent /> },
        { path: 'events/:id', element: <OwnerEventDetail /> },
        { path: 'venue/:venueId/services', element: <ServiceManagement /> },
        { path: 'payout', element: <PayoutList /> },
      ],
    },

    {
      element: <Layout />,
      children: [
        { path: '/', element: <CustomerHome /> },
        { path: '/venue/:id/booking', element: <BookingSchedule /> },
        { path: '/venue/:id/social-session', element: <ProtectedRoute element={<EventList />} /> },
        { path: '/venue/:id/booking/confirm', element: <BookingConfirmation /> },
        { path: '/venue/:id/booking/payment', element: <BookingPayment /> },
        { path: '/events', element: <Events /> },
        { path: '/wallet/top-up', element: <ProtectedRoute element={<WalletTopUp />} /> },
        { path: '/bookings', element: <ProtectedRoute element={<BookingList />} /> },
        { path: '/bookings/:id', element: <ProtectedRoute element={<BookingList />} /> },
        { path: '/venues', element: <Venues /> },
        { path: '/admin', element: <div>Admin Page</div> },
        { path: '/wallet', element: <ProtectedRoute element={<Wallet />} /> },
      ],
    },
  ];

  return useRoutes(routes);
};

export default AppRoutes;
