/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { store } from "../store";
import { AUTH_STORAGE_KEY } from "../store/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
});
api.interceptors.request.use(
  (config) => {
    const token = store.getState()?.auth?.token ?? null;
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

    // Nếu lỗi 401 và là lỗi hết hạn


    // Các lỗi khác
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest.url.includes("/auth/login")
      // !originalRequest.url.includes("/auth/refresh-token")
    ) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // queryClient.removeQueries({ queryKey: ["profile"] });

    }

    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Các lỗi khác
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh-token")
    ) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // queryClient.removeQueries({ queryKey: ["profile"] });
      // window.location.href = "/";
    }

    return Promise.reject(error);
  }
);



export default api;
