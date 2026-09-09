import { useState, useEffect } from "react";
import "./App.css";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import SettingsScreen from "./components/SettingsScreen";
import { refreshShopToken } from "./api";

// How often to silently renew the session token while the dashboard is
// open. Well under the 7-day token expiry, so as long as the shopkeeper's
// PC is turned on and the tab is open at least this often, they're never
// logged out mid-use.
const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

function loadStoredAuth() {
  const token = localStorage.getItem("printkaro_shop_token");
  const shopId = localStorage.getItem("printkaro_shop_id");
  const shopName = localStorage.getItem("printkaro_shop_name");
  if (!token || !shopId) return null;
  return { token, shopId, shopName };
}

function persistAuth(auth) {
  localStorage.setItem("printkaro_shop_token", auth.token);
  localStorage.setItem("printkaro_shop_id", auth.shopId);
  localStorage.setItem("printkaro_shop_name", auth.shopName || auth.shopId);
}

function clearStoredAuth() {
  localStorage.removeItem("printkaro_shop_token");
  localStorage.removeItem("printkaro_shop_id");
  localStorage.removeItem("printkaro_shop_name");
}

function loadStoredTheme() {
  const stored = localStorage.getItem("printkaro_theme");
  if (stored === "light" || stored === "dark") return stored;
  // No saved preference yet — default to whatever the OS/browser prefers.
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [auth, setAuth] = useState(loadStoredAuth);
  const [screen, setScreen] = useState("dashboard"); // "dashboard" | "settings"
  const [loginNotice, setLoginNotice] = useState(null);
  const [prefillShopId, setPrefillShopId] = useState(null);
  const [theme, setTheme] = useState(loadStoredTheme);

  useEffect(() => {
    localStorage.setItem("printkaro_theme", theme);
  }, [theme]);

  // Silently renew the session token on a timer while logged in. If the
  // refresh itself fails because the token has already expired (e.g. the
  // PC was off for a week), the next real API call will get a 401 and
  // fall back to the normal "please log in again" flow — this doesn't
  // need its own error handling beyond not crashing.
  useEffect(() => {
    if (!auth) return;

    const interval = setInterval(async () => {
      try {
        const data = await refreshShopToken(auth.token);
        const nextAuth = { ...auth, token: data.token };
        persistAuth(nextAuth);
        setAuth(nextAuth);
      } catch (e) {
        // Token already expired or refresh failed — leave it to the next
        // authenticated request to trigger the normal re-login flow.
      }
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function handleLoginSuccess(data) {
    const nextAuth = { token: data.token, shopId: data.shopId, shopName: data.shopName };
    persistAuth(nextAuth);
    setAuth(nextAuth);
    setScreen("dashboard");
    setLoginNotice(null);
    setPrefillShopId(null);
  }

  function handleLogout(notice) {
    clearStoredAuth();
    setAuth(null);
    setScreen("dashboard");
    setLoginNotice(notice);
    setPrefillShopId(null);
  }

  function handleShopIdChanged(newShopId) {
    clearStoredAuth();
    setAuth(null);
    setScreen("dashboard");
    setLoginNotice(`Shop ID updated to "${newShopId}". Please log in again with your new Shop ID.`);
    setPrefillShopId(newShopId);
  }

  let content;
  if (!auth) {
    content = (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        notice={loginNotice}
        prefillShopId={prefillShopId}
      />
    );
  } else if (screen === "settings") {
    content = (
      <SettingsScreen
        auth={auth}
        onBack={() => setScreen("dashboard")}
        onLogout={handleLogout}
        onShopIdChanged={handleShopIdChanged}
      />
    );
  } else {
    content = (
      <Dashboard
        auth={auth}
        onOpenSettings={() => setScreen("settings")}
        onAuthExpired={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // data-theme is set here, at the very top, so every screen (including
  // Login and Settings) picks up the right palette — the design tokens'
  // dark overrides key off this exact attribute.
  return <div data-theme={theme} className="app-root">{content}</div>;
}

export default App;
