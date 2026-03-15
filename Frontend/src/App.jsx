import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import localforage from "localforage";
import { BrowserRouter as Router } from "react-router-dom";
import { useDispatch } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getProfile } from "./services/authService";
import LocationPrompt from "./components/common/LocationPrompt/LocationPrompt";
import "./components/common/LocationPrompt/LocationPrompt.css";
import SplashScreen from "./components/ui/SplashScreen/SplashScreen";
import AppRoutes from "./routers/router";
import { setCredentials, setProfileLoading } from "./store/authSlice";

const SPLASH_MIN_MS = 800;

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

  // Persist react-query cache to IndexedDB via localforage
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const persister = {
      persistClient: async (client) => {
        try {
          await localforage.setItem("react_query_offline_cache", client);
        } catch (e) {
          console.warn("Failed to persist react-query cache", e);
        }
      },
      restoreClient: async () => {
        try {
          const data = await localforage.getItem("react_query_offline_cache");
          return data || undefined;
        } catch (e) {
          console.warn("Failed to restore react-query cache", e);
          return undefined;
        }
      },
      removeClient: async () => {
        try {
          await localforage.removeItem("react_query_offline_cache");
        } catch (e) {
          console.warn("Failed to remove react-query cache", e);
        }
      },
    };

    persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 });
  }, [queryClient]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [location, setLocation] = useState(null);

  // Splash = loading cho đến khi restore auth + API khởi tạo xong
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      console.log("🚀 App initializing...");
      dispatch(setProfileLoading(true));

      const minDelay = new Promise((r) => setTimeout(r, SPLASH_MIN_MS));

      const apiReady = getProfile()
        .then((profile) => {
          if (!cancelled && profile) {
            dispatch(
              setCredentials({
                user: profile,
              }),
            );
          }
        })
        .catch(() => {
          console.log("No valid auth token found, starting as guest.");
        });

      await Promise.all([minDelay, apiReady]);

      if (!cancelled) {
        dispatch(setProfileLoading(false));
        setIsInitialLoading(false);
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
        <SplashScreen isVisible={isInitialLoading} />
        {showLocationPrompt && (
          <LocationPrompt onConfirm={handleLocationConfirm} />
        )}
        <Router>
          <AppRoutes />
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
