/** Base URL of the tweets microservice. Empty string means "same origin". */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Bearer token expected by the microservice (CLIENT_API_TOKEN server-side). */
export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? '';

export function apiUrl(path: string): URL {
  return new URL(path, API_BASE_URL || window.location.href);
}
