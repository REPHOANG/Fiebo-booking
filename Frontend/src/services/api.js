/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import store from "../store";
import { logout, AUTH_STORAGE_KEY } from "../store/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getTokenFromRedux = () => store.getState()?.auth?.token ?? null;

const api = axios.create({
  baseURL: API_BASE_URL,
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
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login") &&
      !error.config?.url?.includes("/auth/refresh-token")
    ) {
      store.dispatch(logout());
      localStorage.removeItem("accessToken");
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    return Promise.reject(error);
  }
);



export default api;
