/** JWT in localStorage; axios reads this to set `Authorization: Bearer`. */
const AUTH_TOKEN_KEY = "ecommerce_auth_token";

export function setAuthToken(token) {
  if (!token) return;

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);

}

export function getAuthToken() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(AUTH_TOKEN_KEY);

}

export function clearAuthToken() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_TOKEN_KEY);

}
