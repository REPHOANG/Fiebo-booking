import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { restoreAuthFromStorage } from './store/authSlice';
import Layout from './components/layout/Layout';
import Home from './components/HeroComponents/Home';
import CustomerHome from './pages/Customer/CustomerHome';
import Login from './pages/Login';
import OwnerLogin from './pages/OwnerLogin';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Venues from './pages/Venues';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ProtectedRoute from './routers/ProtectedRoute';
import AnimatedBallBackground from './components/AnimatedBallBackground';
import SplashScreen from './components/SplashScreen/SplashScreen';

const App = () => {
  const dispatch = useDispatch();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Initialize app - restore auth from localStorage
  useEffect(() => {
    console.log('🚀 App initializing...');
    // Restore auth state from localStorage on app start
    dispatch(restoreAuthFromStorage());
    
    // Show splash screen
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3000); // 3 seconds (2s show + 1s fade out)

    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}>
      <SplashScreen isVisible={isInitialLoading} />
      <AnimatedBallBackground />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Customer Home - Protected Route */}
          <Route path="/home" element={<ProtectedRoute element={<CustomerHome />} />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
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
    </GoogleOAuthProvider>
  );
};

export default App;