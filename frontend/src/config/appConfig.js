const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredApiUrl && !import.meta.env.DEV) {
  throw new Error(
    "VITE_API_BASE_URL is missing. Add your deployed backend URL in Vercel."
  );
}

export const API_BASE_URL = (
  configuredApiUrl || "http://127.0.0.1:8000"
).replace(/\/+$/, "");