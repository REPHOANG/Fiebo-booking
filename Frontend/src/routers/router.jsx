import React from "react";
import { Navigate, useParams, useRoutes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import OwnerLayout from "../components/layout/OwnerLayout";
import AdminLayout from "../components/layout/AdminLayout";
import StaffLayout from "../components/layout/StaffLayout";
import CustomerHome from "../pages/Customer/Home/CustomerHome";
import VenueDetail from "../pages/Customer/VenueDetail";
import BookingSchedule from "../pages/Customer/Booking/BookingSchedule";
import BookingConfirmation from "../pages/Customer/Booking/BookingConfirmation";
import BookingPayment, {
  BookingPaymentSuccess,
} from "../pages/Customer/Booking/BookingPayment";
import WalletTopUp from "../pages/Customer/WalletTopUp";
import BookingList from "../pages/Customer/BookingList";
import Wallet from "../pages/Customer/Wallet/Wallet";
import GiveRating from "../pages/Customer/GiveRating/GiveRating";
import EventDetail from "../pages/Event/EventDetail";
import EventRegister from "../pages/Event/EventRegister";
import EventTicketDetail from "../pages/Event/EventTicketDetail";
import EventTicketPayment from "../pages/Event/EventTicketPayment";
import EventList from "../pages/Event/EventList";
import Events from "../pages/Event/Events";
import OwnerLogin from "../pages/auth/OwnerLogin";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Profile from "../pages/Profile";
import Venues from "../pages/Venues";
import MapExplore from "../pages/MapExplore";
import OwnerProfile from "../pages/Owner/Account/OwnerProfile";
import OwnerSubscription from "../pages/Owner/Account/OwnerSubscription";
import OwnerVenues from "../pages/Owner/Venue/OwnerVenues";
import CreateVenue from "../pages/Owner/Venue/CreateVenue";
import OwnerOfflineBooking from "../pages/Owner/Booking/OwnerOfflineBooking";
import OwnerVenueDetail from "../pages/Owner/Venue/OwnerVenueDetail";
import OwnerTimeSlot from "../pages/Owner/Venue/OwnerTimeSlot";
import OwnerAddField from "../pages/Owner/Venue/OwnerAddField";
import OwnerEditVenue from "../pages/Owner/Venue/OwnerEditVenue";
import OwnerBookings from "../pages/Owner/Booking/OwnerBookings";
import OwnerBookingDetail from "../pages/Owner/Booking/OwnerBookingDetail";
import StaffList from "../pages/Owner/StaffManagement/StaffList";
import OwnerEvents from "../pages/Owner/Event/OwnerEvents";
import CreateEvent from "../pages/Owner/Event/CreateEvent";
import OwnerEventDetail from "../pages/Owner/Event/OwnerEventDetail";
import ServiceManagement from "../pages/Owner/VenueService/ServiceManagement";
import PayoutList from "../pages/Owner/Payout/PayoutList";
import AdminHome from "../pages/Admin/Dashboard/AdminHome";
import AdminUsers from "../pages/Admin/UserManagement/AdminUsers";
import StaffHome from "../pages/Staff/Dashboard/StaffHome";
import ProtectedRoute from "./ProtectedRoute";
import PayoutDetails from "../pages/Owner/Payout/PayoutDetails";
import OwnerDashboard from "../pages/Owner/Dashboard/OwnerDashboard";

const OwnerVenueTimeSlotLegacyRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/owner/venues/${id}/time-slot`} replace />;
};

const routes = [
  { path: "/login", element: <Login /> },
  { path: "/owner/login", element: <OwnerLogin /> },
  { path: "/register", element: <Register /> },
  { path: "/verify-otp", element: <VerifyOTP /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/rating", element: <GiveRating /> },
  { path: "/profile", element: <ProtectedRoute element={<Profile />} /> },
  { path: "/venue/:id", element: <VenueDetail /> },
  { path: "/map", element: <MapExplore /> },
  {
    path: "/event/:id",
    element: <ProtectedRoute element={<EventDetail />} />,
  },
  {
    path: "/event/:id/register",
    element: <ProtectedRoute element={<EventRegister />} />,
  },
  {
    path: "/event/ticket/:id",
    element: <ProtectedRoute element={<EventTicketDetail />} />,
  },
  {
    path: "/event/ticket/:id/payment",
    element: <ProtectedRoute element={<EventTicketPayment />} />,
  },
  { path: "wallet", element: <ProtectedRoute element={<Wallet />} /> },
  {
    path: "wallet/top-up",
    element: <ProtectedRoute element={<WalletTopUp />} />,
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, path: "", element: <CustomerHome /> },
      { path: "venue/:id/booking", element: <BookingSchedule /> },
      {
        path: "venue/:id/social-session",
        element: <ProtectedRoute element={<EventList />} />,
      },
      { path: "venue/:id/booking/confirm", element: <BookingConfirmation /> },
      { path: "venue/:id/booking/payment", element: <BookingPayment /> },
      {
        path: "venue/:id/booking/payment/success",
        element: <BookingPaymentSuccess />,
      },
      { path: "events", element: <Events /> },
      {
        path: "bookings",
        element: <ProtectedRoute element={<BookingList />} />,
      },
      {
        path: "bookings/:id",
        element: <ProtectedRoute element={<BookingList />} />,
      },
      { path: "venues", element: <Venues /> },
    ],
  },
  {
    path: "/owner",
    element: (
      <ProtectedRoute element={<OwnerLayout />} requiredRole="FieldOwner" />
    ),
    children: [
      { index: true, element: <OwnerDashboard /> },
      { path: "profile", element: <OwnerProfile /> },
      { path: "subscription", element: <OwnerSubscription /> },
      { path: "payout", element: <PayoutList /> },
      { path: "payout/:id/details", element: <PayoutDetails /> },
      { path: "venues", element: <OwnerVenues /> },
      { path: "create-venue", element: <CreateVenue /> },
      { path: "offline-booking", element: <OwnerOfflineBooking /> },
      { path: "venues/:id", element: <OwnerVenueDetail /> },
      { path: "venues/:id/edit", element: <OwnerEditVenue /> },
      { path: "venues/:id/time-slot", element: <OwnerTimeSlot /> },
      { path: "venues/:id/add-field", element: <OwnerAddField /> },
      {
        path: "venues/:id/edit-field/:fieldId",
        element: <OwnerAddField />,
      },
      {
        path: "venues/:id/create-field",
        element: <OwnerVenueTimeSlotLegacyRedirect />,
      },
      {
        path: "venues/:id/offline-booking",
        element: <BookingSchedule />,
      },
      {
        path: "venues/:id/offline-booking/confirm",
        element: <BookingConfirmation />,
      },
      { path: "bookings", element: <OwnerBookings /> },
      { path: "bookings/:id", element: <OwnerBookingDetail /> },
      { path: "staff", element: <StaffList /> },
      { path: "events", element: <OwnerEvents /> },
      { path: "events/create", element: <CreateEvent /> },
      { path: "events/:id", element: <OwnerEventDetail /> },
      {
        path: "venue/:venueId/services",
        element: <ServiceManagement />,
      },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute element={<AdminLayout />} requiredRole="Admin" />,
    children: [
      { index: true, element: <AdminHome /> },
      { path: "users", element: <AdminUsers /> },
    ],
  },
  {
    path: "/staff",
    element: <ProtectedRoute element={<StaffLayout />} requiredRole="Staff" />,
    children: [
      { index: true, element: <StaffHome /> },
      { path: "profile", element: <Profile /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

const AppRoutes = () => useRoutes(routes);

export default AppRoutes;
