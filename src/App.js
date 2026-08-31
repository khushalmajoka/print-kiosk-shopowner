import { useState } from "react";
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

function App() {
  const [auth, setAuth] = useState(loadStoredAuth);
  const [screen, setScreen] = useState("dashboard"); // "dashboard" | "settings"
  const [loginNotice, setLoginNotice] = useState(null);
  const [prefillShopId, setPrefillShopId] = useState(null);

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
    setLoginNotice(`Shop ID update ho gaya: "${newShopId}". Isi naye ID se dobara login karein.`);
    setPrefillShopId(newShopId);
  }

  if (!auth) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        notice={loginNotice}
        prefillShopId={prefillShopId}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        auth={auth}
        onBack={() => setScreen("dashboard")}
        onLogout={handleLogout}
        onShopIdChanged={handleShopIdChanged}
      />
    );
  }

  return (
    <Dashboard
      auth={auth}
      onOpenSettings={() => setScreen("settings")}
      onAuthExpired={handleLogout}
    />
  );
}

export default App;
