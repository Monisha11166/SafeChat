import axios from "axios";

// In production, set VITE_SERVER_ORIGIN in your hosting platform's env
// vars (e.g. Vercel) to your deployed backend's URL, e.g.
// https://safechat-api.onrender.com — no trailing slash.
// Falls back to localhost for local development.
const SERVER_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || "http://localhost:5000";

const API = axios.create({
  baseURL: `${SERVER_ORIGIN}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Resolve a path returned by the backend (e.g. "/uploads/169...jpg" or a
 * full DiceBear avatar URL) into something an <img>/<a> can use directly.
 */
export function mediaUrl(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${SERVER_ORIGIN}${path}`;
}

// Automatically attach JWT token if available
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle unauthorized responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;