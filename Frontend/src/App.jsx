import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import localforage from 'localforage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { restoreAuthFromStorage } from './store/authSlice';
import Layout from './components/layout/Layout';
// import Home from './components/landing/Home';
import LocationPrompt from './components/common/LocationPrompt/LocationPrompt';
import './components/common/LocationPrompt/LocationPrompt.css';
import CustomerHome from './pages/Customer/CustomerHome';
import VenueDetail from './pages/Customer/VenueDetail';
import BookingSchedule from './pages/Customer/BookingSchedule';
import BookingConfirmation from './pages/Customer/BookingConfirmation';
import BookingPayment from './pages/Customer/BookingPayment';
import Login from './pages/auth/Login';
import OwnerLogin from './pages/auth/OwnerLogin';
import Register from './pages/auth/Register';
import Profile from './pages/Profile';
import Venues from './pages/Venues';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyOTP from './pages/auth/VerifyOTP';
import ProtectedRoute from './routers/ProtectedRoute';
import SplashScreen from './components/ui/SplashScreen/SplashScreen';
import CreateVenue from './pages/Owner/CreateVenue';
import WalletTopUp from './pages/Customer/WalletTopUp';

const App = () => {
  const dispatch = useDispatch();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  // Persist react-query cache to IndexedDB via localforage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const persister = {
      persistClient: async (client) => {
        try {
          await localforage.setItem('react_query_offline_cache', client);
        } catch (e) {
          console.warn('Failed to persist react-query cache', e);
        }
      },
      restoreClient: async () => {
        try {
          const data = await localforage.getItem('react_query_offline_cache');
          return data || undefined;
        } catch (e) {
          console.warn('Failed to restore react-query cache', e);
          return undefined;
        }
      },
      removeClient: async () => {
        try {
          await localforage.removeItem('react_query_offline_cache');
        } catch (e) {
          console.warn('Failed to remove react-query cache', e);
        }
      },
    };

    persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 });
  }, [queryClient]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [location, setLocation] = useState(null);

  // Initialize app - restore auth from localStorage
  useEffect(() => {
    console.log('🚀 App initializing...');
    // Restore auth state from localStorage on app start
    dispatch(restoreAuthFromStorage());

    // Show splash screen
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
      // Kiểm tra đã hỏi location chưa
      if (!localStorage.getItem('locationPromptAsked')) {
        setShowLocationPrompt(true);
      }
    }, 3000); // 3 seconds (2s show + 1s fade out)

    return () => clearTimeout(timer);
  }, [dispatch]);

  const handleLocationConfirm = (coords) => {
    setShowLocationPrompt(false);
    localStorage.setItem('locationPromptAsked', 'true');
    if (coords) {
      setLocation(coords);
      localStorage.setItem('userLocation', JSON.stringify(coords));
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}>
      <QueryClientProvider client={queryClient}>
        <SplashScreen isVisible={isInitialLoading} />
        {showLocationPrompt && (
          <LocationPrompt onConfirm={handleLocationConfirm} />
        )}
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/venue/:id" element={<VenueDetail />} />

            {/* Owner routes */}
            <Route path="/owner/create-venue" element={<ProtectedRoute element={<CreateVenue />} />} />

            {/* Layout (Header + Footer): home, venues, booking */}
            <Route element={<Layout />}>
              <Route path="/" element={<CustomerHome />} />
              <Route path="/venue/:id/booking" element={<BookingSchedule />} />
              <Route path="/venue/:id/booking/confirm" element={<BookingConfirmation />} />
              <Route path="/venue/:id/booking/payment" element={<BookingPayment />} />
              <Route path="/wallet/top-up" element={<ProtectedRoute element={<WalletTopUp />} />} />
              <Route path="/venues" element={<Venues />} />
              <Route path="/admin" element={<div>Admin Page</div>} />
            </Route>
          </Routes>
        </Router>
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss={true}
          draggable={true}
          pauseOnHover={true}
          theme="light"
        />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;