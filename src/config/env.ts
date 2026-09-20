const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const isLocalHost =
  import.meta.env.DEV ||
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '[::1]' ||
  /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const AI_PROD_URL: string =
  import.meta.env.VITE_AI_API_URL_PROD || 'https://pollution-detection.onrender.com/detect-pollution';

export const AI_LOCAL_URL: string =
  import.meta.env.VITE_AI_API_URL_LOCAL || `http://${host}:8000/detect-pollution`;

export const AI_API_URL: string = isLocalHost ? AI_LOCAL_URL : AI_PROD_URL;

export const AI_BASE_URL: string = AI_API_URL.replace(/\/detect-pollution\/?$/, '');

export const AI_FALLBACK_TO_PROD: boolean = import.meta.env.VITE_AI_FALLBACK_TO_PROD === 'true';
