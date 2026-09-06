import { useState, useEffect } from "react";
import "./App.css";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import SettingsScreen from "./components/SettingsScreen";

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
