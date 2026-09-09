// Central place for talking to the backend. Every authenticated call goes
// through here so the auth token is attached consistently, and a 401
// response is easy to recognise everywhere in the app (session expired).

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://print-kiosk-backend-t470.onrender.com";

/**
 * @param {object} [options.onSlow] - called if the request takes longer than
 *   4s, most likely because the Render free-tier backend is waking up from
 *   sleep. Callers use this to show a "waking up..." notice instead of
 *   leaving the user staring at a stuck spinner with no explanation.
 */
export async function apiFetch(path, { method = "GET", body, token, onSlow } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const slowTimer = onSlow ? setTimeout(onSlow, 4000) : null;

  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // some responses have no JSON body — that's fine
  }

  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return data;
}

/**
 * Exchanges the current (still-valid) token for a fresh one with a new
 * 7-day expiry — see App.js, which calls this periodically while the
 * shopkeeper is actively using the dashboard, so their session renews
 * itself instead of ever hitting the expiry while they're mid-use.
 */
export async function refreshShopToken(token) {
  return apiFetch("/shops/refresh-token", { method: "POST", token });
}
