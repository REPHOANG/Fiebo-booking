/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import store from "../store";
import { logout, AUTH_STORAGE_KEY, isTokenExpired } from "../store/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

const getTokenFromRedux = () => store.getState()?.auth?.token ?? null;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});
api.interceptors.request.use(
  (config) => {
    const token = getTokenFromRedux();
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
    const currentToken = getTokenFromRedux();
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login") &&
      !error.config?.url?.includes("/auth/refresh-token")
    ) {
      // Chỉ auto-logout khi token hiện tại đã hết hạn.
      // Tránh trường hợp 401 do phân quyền/endpoint đặc thù làm user bị đá ra sai.
      if (currentToken && isTokenExpired(currentToken)) {
        store.dispatch(logout());
        localStorage.removeItem(AUTH_STORAGE_KEY);
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path !== "/") {
            window.location.replace("/");
          }
        }
      }
    }
    return Promise.reject(error);
  }
);



export default api;
