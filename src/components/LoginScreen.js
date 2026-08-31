import { useState } from "react";
import { apiFetch } from "../api";

export default function LoginScreen({ onLoginSuccess, notice, prefillShopId }) {
  const [shopId, setShopId] = useState(prefillShopId || "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!shopId.trim() || !pin.trim()) {
      setError("Shop ID aur PIN dono daalein");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch("/shops/login", {
        method: "POST",
        body: { shopId: shopId.trim(), pin: pin.trim() },
      });
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || "Login fail hua");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <rect x="4" y="9" width="16" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
              <path d="M7 9V4h10v5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M7 16v4h10v-4" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <span>PrintKaro</span>
        </div>

        <h1>Shop dashboard</h1>
        <p className="auth-subtitle">Apne Shop ID aur PIN se login karein</p>

        {notice && <div className="auth-notice">{notice}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="shopId">Shop ID</label>
          <input
            id="shopId"
            type="text"
            placeholder="e.g. sharma-xerox-4f2a"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            autoComplete="username"
          />

          <label className="field-label" htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            placeholder="4-6 digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? "Login ho raha hai..." : "Log in"}
          </button>
        </form>

        <p className="auth-help">
          PIN bhool gaye? PrintKaro se contact karein — wo dashboard se reset kar denge.
        </p>
      </div>
    </div>
  );
}
