/** Base URL of the tweets microservice. Empty string means "same origin". */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Bearer token expected by the microservice (CLIENT_API_TOKEN server-side). */
export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? '';

export function apiUrl(path: string): URL {
  return new URL(path, API_BASE_URL || window.location.href);
}

/**
 * Base URL of the Gemini microservice. Falls back to the tweets base URL, so
 * if both services sit behind the same shared entry point (nginx) you only
 * need to set VITE_API_BASE_URL.
 */
export const GEMINI_API_BASE_URL = import.meta.env.VITE_GEMINI_API_BASE_URL || API_BASE_URL;

/** Bearer token expected by the Gemini microservice (its own CLIENT_API_TOKEN). */
export const GEMINI_API_TOKEN = import.meta.env.VITE_GEMINI_API_TOKEN ?? '';

/**
 * Appends `path` to the base URL *including any path prefix* — e.g. base
 * "https://api.example.com/gemini" + "/api/generate" gives
 * "https://api.example.com/gemini/api/generate". (new URL('/api/generate', base)
 * would throw the "/gemini" prefix away, because a leading "/" resets the path.)
 */
export function geminiApiUrl(path: string): URL {
  if (!GEMINI_API_BASE_URL) return new URL(path, window.location.href);
  return new URL(GEMINI_API_BASE_URL.replace(/\/+$/, '') + path, window.location.href);
}
