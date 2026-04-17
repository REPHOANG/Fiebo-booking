import React from "react";
import { Navigate, useParams, useRoutes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import OwnerLayout from "../components/layout/OwnerLayout";
import AdminLayout from "../components/layout/AdminLayout";
import FinanceAdminLayout from "../components/layout/FinanceAdminLayout";
import StaffLayout from "../components/layout/StaffLayout";
import CustomerHome from "../pages/Customer/Home/CustomerHome";
import VenueDetail from "../pages/Customer/VenueDetail";
import BookingSchedule from "../pages/Customer/Booking/BookingSchedule";
import BookingConfirmation from "../pages/Customer/Booking/BookingConfirmation";
import BookingPayment, {
  BookingPaymentSuccess,
} from "../pages/Customer/Booking/BookingPayment";
import WalletTopUp from "../pages/Customer/WalletTopUp";
import WalletTopUpDetail from "../pages/Customer/WalletTopUpDetail";
import BookingList from "../pages/Customer/BookingList";
import Wallet from "../pages/Customer/Wallet/Wallet";
import GiveRating from "../pages/Customer/GiveRating/GiveRating";
import EventDetail from "../pages/Event/EventDetail";
import EventRegister from "../pages/Event/EventRegister";
import EventTicketDetail from "../pages/Event/EventTicketDetail";
import EventTicketPayment from "../pages/Event/EventTicketPayment";
import EventList from "../pages/Event/EventList";
import Events from "../pages/Event/Events";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import VerifyOTP from "../pages/auth/VerifyOTP";
import { OPEN_AUTH_STATE_KEY } from "../context/AuthModalContext";
import Profile from "../pages/Profile";
import Venues from "../pages/Venues";
import MapExplore from "../pages/MapExplore";
import OwnerProfile from "../pages/Owner/Account/OwnerProfile";
import OwnerSubscriptionOverview from "../pages/Owner/Account/OwnerSubscriptionOverview";
import OwnerSubscriptionPlans from "../pages/Owner/Account/OwnerSubscriptionPlans";
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
import AdminAuditLog from "../pages/Admin/AuditLog/AdminAuditLog";
import AdminReports from "../pages/Admin/Reports/AdminReports";
import AdminCustomers from "../pages/Admin/CustomerManagement/AdminCustomers";
import AdminVenueModeration from "../pages/Admin/VenueManagement/AdminVenueModeration";
import AdminOwners from "../pages/Admin/OwnerManagement/AdminOwners";
import AdminPolicies from "../pages/Admin/Policy/AdminPolicies";
import FinanceAdminHome from "../pages/FinanceAdmin/Dashboard/FinanceAdminHome";
import FinanceAdminOwnerPayouts from "../pages/FinanceAdmin/Payout/FinanceAdminOwnerPayouts";
import FinanceAdminProcessOwnerPayouts from "../pages/FinanceAdmin/Payout/FinanceAdminProcessOwnerPayouts";
import FinanceAdminOwnerSubscriptionTransactions from "../pages/FinanceAdmin/Subscription/FinanceAdminOwnerSubscriptionTransactions";
import FinanceAdminRevenueReport from "../pages/FinanceAdmin/Revenue/FinanceAdminRevenueReport";
import FinanceAdminWithdrawalRequests from "../pages/FinanceAdmin/Withdrawal/FinanceAdminWithdrawalRequests";
import FinanceAdminProcessWithdrawalRequests from "../pages/FinanceAdmin/Withdrawal/FinanceAdminProcessWithdrawalRequests";
import StaffHome from "../pages/Staff/Dashboard/StaffHome";
import StaffOfflineBooking from "../pages/Staff/Booking/StaffOfflineBooking";
import StaffBookings from "../pages/Staff/Booking/StaffBookings";
import StaffBookingDetail from "../pages/Staff/Booking/StaffBookingDetail";
import StaffEvents from "../pages/Staff/Event/StaffEvents";
import ProtectedRoute from "./ProtectedRoute";
import PayoutDetails from "../pages/Owner/Payout/PayoutDetails";
import OwnerDashboard from "../pages/Owner/Dashboard/OwnerDashboard";
import FinanceAdminManagement from "../pages/Admin/FinanceAdminManagement/FinanceAdminManagement";
import SportCatalog from "../pages/Admin/SportCatalog/SportCatalog";
import NotFoundPage from "../components/ui/Error/NotFoundPage";
import { AdminVenueRegistrations } from "../pages/Admin/VenueRegistration/AdminVenueRegistrations";
import { VenueDetailPage } from "../pages/Admin/VenueRegistration/VenueDetailPage";

const OwnerVenueTimeSlotLegacyRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/owner/venues/${id}/time-slot`} replace />;
};

const routes = [
  { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
  { path: "/verify-otp", element: <VerifyOTP /> },
  {
    path: "/forgot-password",
    element: <Navigate to="/" replace state={{ [OPEN_AUTH_STATE_KEY]: "forgot-password" }} />,
  },
  { path: "/rating", element: <GiveRating /> },
  { path: "/profile", element: <ProtectedRoute element={<Profile />} /> },
  { path: "/venue/:id", element: <VenueDetail /> },
  { path: "/map", element: <MapExplore /> },
  { path: "/event/:id", element: <EventDetail /> },
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
    path: "wallet/top-up/:id",
    element: <ProtectedRoute element={<WalletTopUpDetail />} />,
  },

  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, path: "", element: <CustomerHome /> },
      { path: "venue/:id/booking/schedule", element: <BookingSchedule /> },
      { path: "venue/:id/events", element: <EventList /> },
      { path: "venue/:id/booking", element: <BookingConfirmation /> },
      { path: "booking/:bookingId/payment", element: <BookingPayment /> },
      {
        path: "booking/:bookingId/payment/success",
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
      {
        path: "subscription/overview",
        element: <OwnerSubscriptionOverview />,
      },
      {
        path: "subscription/plans",
        element: <OwnerSubscriptionPlans />,
      },
      { path: "wallet", element: <Wallet /> },
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
      { path: "audit-logs", element: <AdminAuditLog /> },
      { path: "reports", element: <AdminReports /> },
      { path: "customers", element: <AdminCustomers /> },
      { path: "venues", element: <AdminVenueModeration /> },
      { path: "venue/:id", element: <VenueDetailPage /> },
      { path: "venue-registrations/:id", element: <VenueDetailPage /> },
      { path: "owners", element: <AdminOwners /> },
      { path: "venue-registrations", element: <AdminVenueRegistrations /> },
      { path: "finance-admins", element: <FinanceAdminManagement /> },
      { path: "sports", element: <SportCatalog /> },
      { path: "policies", element: <AdminPolicies /> },
      { path: "users", element: <AdminCustomers /> },
    ],
  },
  {
    path: "/finance-admin",
    element: (
      <ProtectedRoute
        element={<FinanceAdminLayout />}
        requiredRole="FinanceAdmin"
      />
    ),
    children: [
      { index: true, element: <FinanceAdminHome /> },
      { path: "owner-payouts", element: <FinanceAdminOwnerPayouts /> },
      { path: "process-owner-payouts", element: <FinanceAdminProcessOwnerPayouts /> },
      {
        path: "owner-subscription-transactions",
        element: <FinanceAdminOwnerSubscriptionTransactions />,
      },
      { path: "revenue-reports", element: <FinanceAdminRevenueReport /> },
      { path: "withdrawal-requests", element: <FinanceAdminWithdrawalRequests /> },
      {
        path: "process-withdrawal-requests",
        element: <FinanceAdminProcessWithdrawalRequests />,
      },
      { path: "transactions", element: <Navigate to="/finance-admin/owner-subscription-transactions" replace /> },
      { path: "payout-reconciliation", element: <Navigate to="/finance-admin/process-owner-payouts" replace /> },
      { path: "reports", element: <Navigate to="/finance-admin/revenue-reports" replace /> },
    ],
  },
  {
    path: "/staff",
    element: <ProtectedRoute element={<StaffLayout />} requiredRole="Staff" />,
    children: [
      { index: true, element: <StaffHome /> },
      { path: "profile", element: <Profile /> },
      { path: "offline-booking", element: <StaffOfflineBooking /> },
      { path: "venues/:id/offline-booking", element: <BookingSchedule /> },
      { path: "venues/:id/offline-booking/confirm", element: <BookingConfirmation /> },
      { path: "bookings", element: <StaffBookings /> },
      { path: "bookings/:id", element: <StaffBookingDetail /> },
      { path: "events", element: <StaffEvents /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

const AppRoutes = () => useRoutes(routes);

export default AppRoutes;
