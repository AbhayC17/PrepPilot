const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (
  configuredApiUrl ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");