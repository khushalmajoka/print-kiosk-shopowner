// Central place for talking to the backend. Every authenticated call goes
// through here so the auth token is attached consistently, and a 401
// response is easy to recognise everywhere in the app (session expired).

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://print-kiosk-backend-t470.onrender.com";

export async function apiFetch(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
