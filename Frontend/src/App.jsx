import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "leaflet/dist/leaflet.css";
import { getProfile } from "./services/authService";
import AppRoutes from "./routers/router";
import { AuthModalProvider, AuthModalRouteSync } from "./context/AuthModalContext";
import { logout, setCredentials, setProfileLoading } from "./store/authSlice";


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
const AppContent = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated ?? false);

  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  const initRanRef = useRef(false);


  // Check token in localStorage and only call profile API when token exists.
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const ready = Boolean(token);
    setTokenReady(ready);
    setTokenChecked(true);
    if (!ready) {
      dispatch(setProfileLoading(false));
    }
  }, [isAuthenticated, dispatch]);

  const { data, isSuccess, isError, isLoading, isFetching } = useQuery({
    queryFn: getProfile,
    queryKey: ["profile"],
    enabled: tokenReady,
    retry: 0,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!tokenChecked) {
      return;
    }

    if (!tokenReady) {
      dispatch(setProfileLoading(false));
      return;
    }
    // Only block route rendering on initial load, not background refetch.
    dispatch(setProfileLoading(isLoading));
  }, [dispatch, tokenChecked, tokenReady, isLoading]);

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(
        setCredentials({
          user: data,
        })
      );
    }

    if (tokenChecked && tokenReady && isError) {
      dispatch(logout());
      dispatch(setProfileLoading(false));
    }
  }, [data, isSuccess, isError, dispatch, tokenChecked, tokenReady]);


  // Tránh gọi logic init 2 lần khi React Strict Mode double-invoke effect (development)
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    // Kiểm tra xem đã hỏi truy cập vị trí chưa
    const locationPromptAsked = localStorage.getItem("locationPromptAsked");

    // Nếu chưa hỏi, hỏi ngay (với cơ chế thử lại khi thất bại)
    if (!locationPromptAsked) {
      if (navigator.geolocation) {
        const maxRetries = 2; // số lần thử lại nếu thất bại (ngoài lần thử đầu)

        const attemptGetLocation = (retriesLeft) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              localStorage.setItem("userLocation", JSON.stringify(position.coords));
              localStorage.setItem("locationPromptAsked", "true");
              localStorage.setItem("userLocationPermission", "granted");
              console.log("✓ Lưu vị trí:", position.coords);
            },
            (error) => {
              // Nếu user từ chối cấp quyền, dừng thử lại
              if (error?.code === 1) {
                localStorage.setItem("locationPromptAsked", "true");
                localStorage.setItem("userLocationPermission", "denied");
                console.log("User từ chối vị trí:", error.message);
                return;
              }

              if (retriesLeft > 0) {
                console.warn(`Lấy vị trí thất bại, thử lại (${retriesLeft} lần còn lại):`, error.message);
                setTimeout(() => attemptGetLocation(retriesLeft - 1), 1000);
              } else {
                // Hết lượt thử — đánh dấu đã hỏi nhưng không lấy được vị trí
                localStorage.setItem("locationPromptAsked", "true");
                localStorage.setItem("userLocationPermission", "unavailable");
                console.log("Không lấy được vị trí sau nhiều lần thử:", error.message);
              }
            },
            {
              timeout: 10000, // Timeout 10 giây
              maximumAge: 0
            }
          );
        };

        attemptGetLocation(maxRetries);
      } else {
        // Không hỗ trợ geolocation
        localStorage.setItem("locationPromptAsked", "true");
        localStorage.setItem("userLocationPermission", "unavailable");
        console.log("Trình duyệt không hỗ trợ Geolocation.");
      }
    } else {
      // Đã hỏi rồi, lấy từ localStorage
      const savedLocation = localStorage.getItem("userLocation");
      if (savedLocation) {
        console.log("Vị trí từ localStorage:", JSON.parse(savedLocation));
      }
    }
  }, []);

  return (
    <>
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
    </>
  );
};

const App = () => {
  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id"
      }
    >
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
