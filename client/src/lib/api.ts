/**
 * API configuration for split deployment (Vercel frontend + Railway backend)
 * 
 * Usage:
 *   import { getApiUrl } from "@/lib/api";
 *   const response = await fetch(getApiUrl('/api/chat/stream'), ...);
 */

/**
 * Get the API base URL from environment variable
 * Falls back to same origin for monolithic deployment
 */
export function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && typeof apiUrl === "string" && apiUrl.length > 0) {
    // Remove trailing slash if present
    return apiUrl.replace(/\/$/, "");
  }
  return "";
}

/**
 * Get full API URL for a given path
 * @param path - API path (e.g., '/api/chat/stream')
 * @returns Full URL including base URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Check if we're in split deployment mode (separate frontend/backend)
 */
export function isSplitDeployment(): boolean {
  return getApiBaseUrl().length > 0;
}
