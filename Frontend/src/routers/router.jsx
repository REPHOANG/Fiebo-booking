// Router configuration
// NOTE: Routing is currently handled directly in App.jsx.
// This file is kept for reference / future migration to createBrowserRouter.

import Layout from '../components/layout/Layout';
import Home from '../components/landing/Home';
import CustomerHome from '../pages/Customer/CustomerHome';
import Login from '../pages/auth/Login';
import OwnerLogin from '../pages/auth/OwnerLogin';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import VerifyOTP from '../pages/auth/VerifyOTP';
import Profile from '../pages/Profile';
import Venues from '../pages/Venues';
import ProtectedRoute from './ProtectedRoute';
import GiveRating from '../pages/Customer/GiveRating/GiveRating';

export const publicRoutes = [
  {
    path: '/home',
    element: <Layout />,
    children: [
      { path: 'home', element: <CustomerHome /> },
      { path: 'venues', element: <Venues /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/owner/login', element: <OwnerLogin /> },
  { path: '/register', element: <Register /> },
  { path: '/verify-otp', element: <VerifyOTP /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/profile', element: <Profile /> },
  { path: '/home', element: <ProtectedRoute element={<CustomerHome />} /> },
];
