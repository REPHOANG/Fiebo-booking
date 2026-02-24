import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/layout/Layout';
import Home from './components/HeroComponents/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import AnimatedBallBackground from './components/AnimatedBallBackground';

const App = () => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id'}>
      <AnimatedBallBackground />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<div>Home Page</div>} />
            <Route path="/admin" element={<div>Admin Page</div>} />
          </Route>
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;