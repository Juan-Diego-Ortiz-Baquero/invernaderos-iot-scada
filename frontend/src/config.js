export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5159';

export const DEFAULT_GREENHOUSE_ID = Number(import.meta.env.VITE_DEFAULT_GREENHOUSE_ID || 1);

export const POLLING_INTERVAL_MS = Number(import.meta.env.VITE_POLLING_INTERVAL_MS || 3000);

export const DEVICE_STALE_AFTER_MS = Number(
  import.meta.env.VITE_DEVICE_STALE_AFTER_SECONDS
    ? Number(import.meta.env.VITE_DEVICE_STALE_AFTER_SECONDS) * 1000
    : 10000,
);
