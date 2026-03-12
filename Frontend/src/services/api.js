/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';


const api = axios.create({
  baseURL: API_BASE_URL,
});
// attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || (() => {
      try {
        const a = JSON.parse(localStorage.getItem('authState'));
        return a?.token || a?.accessToken || null;
      } catch (e) {
        return null;
      }
    })();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
