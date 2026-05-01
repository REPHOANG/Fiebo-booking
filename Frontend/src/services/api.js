/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import store from "../store";
import { logout, AUTH_STORAGE_KEY, REFRESH_STORAGE_KEY, setCredentials } from "../store/authSlice";
import { refreshToken as refreshTokenApi } from "./authService";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api` || 'http://localhost:8080/api';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;


const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop if refresh fails
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      const currentAccessToken = localStorage.getItem(AUTH_STORAGE_KEY);
      const currentRefreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);

      if (currentAccessToken && currentRefreshToken) {
        try {
          const newTokens = await refreshTokenApi(currentAccessToken, currentRefreshToken);
          if (newTokens && newTokens.accessToken) {
            localStorage.setItem(AUTH_STORAGE_KEY, newTokens.accessToken);
            if (newTokens.refreshToken) {
              localStorage.setItem(REFRESH_STORAGE_KEY, newTokens.refreshToken);
            }

            // Dispatch to update Redux state
            store.dispatch(setCredentials({
              token: newTokens.accessToken,
              refreshToken: newTokens.refreshToken
            }));

            // Update authorization header and retry original request
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, proceed to logout
        }
      }

      // If no refresh token or refresh failed, logout
      store.dispatch(logout());
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(REFRESH_STORAGE_KEY);
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path !== "/") {
          window.location.replace("/");
        }
      }
    }
    return Promise.reject(error);
  }
);



export default api;
