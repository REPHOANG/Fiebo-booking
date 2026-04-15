import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import localforage from "localforage";
import { BrowserRouter as Router } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "leaflet/dist/leaflet.css";
import { getProfile } from "./services/authService";
import LocationPrompt from "./components/common/LocationPrompt/LocationPrompt";
import "./components/common/LocationPrompt/LocationPrompt.css";
import AppRoutes from "./routers/router";
import { AuthModalProvider, AuthModalRouteSync } from "./context/AuthModalContext";
import { setCredentials, logout, isTokenExpired, AUTH_STORAGE_KEY } from "./store/authSlice";


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
const App = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.token ?? null);

  // Khi accessToken hết hạn thì tự đăng xuất và xóa storage
  useEffect(() => {
    if (!token) return;
    if (isTokenExpired(token)) {
      dispatch(logout());
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path !== "/") {
          window.location.replace("/");
        }
      }
    }
  }, [token, dispatch]);


  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [location, setLocation] = useState(null);
  const initRanRef = useRef(false);


  // Tránh gọi getProfile 2 lần khi React Strict Mode double-invoke effect (development)
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    let cancelled = false;
    const init = async () => {
      console.log("🚀 App initializing...");


      const apiReady = getProfile()
        .then((profile) => {
          if (!cancelled && profile) {
            dispatch(
              setCredentials({
                user: profile,
              })
            );
          }
        })
      .catch(() => {});

      await Promise.all([apiReady]);

      if (!cancelled) {

        if (!localStorage.getItem("locationPromptAsked")) {
          setShowLocationPrompt(true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const handleLocationConfirm = (coords) => {
    setShowLocationPrompt(false);
    localStorage.setItem("locationPromptAsked", "true");
    if (coords) {
      setLocation(coords);
      localStorage.setItem("userLocation", JSON.stringify(coords));
    }
  };

  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id"
      }
    >
      <QueryClientProvider client={queryClient}>
        {showLocationPrompt && (
          <LocationPrompt onConfirm={handleLocationConfirm} />
        )}
        <Router>
          <AuthModalProvider>
            <AuthModalRouteSync />
            <AppRoutes />
          </AuthModalProvider>
        </Router>
        <ToastContainer
          position="top-right"
          autoClose={1000}
          limit={1}
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
