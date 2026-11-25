const configuredBackendOrigin = import.meta.env.VITE_API_BASE_URL
  ?.trim()
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

export const BACKEND_ORIGIN =
  configuredBackendOrigin ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://jai-janardan-auto-backend.onrender.com");

export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;
