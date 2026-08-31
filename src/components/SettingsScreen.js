import { useState } from "react";
import { apiFetch } from "../api";

export default function SettingsScreen({ auth, onBack, onLogout, onShopIdChanged }) {
  // ---- Change PIN ----
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState(null);
  const [pinSuccess, setPinSuccess] = useState(null);
  const [pinSaving, setPinSaving] = useState(false);

  // ---- Change Shop ID ----
  const [newShopId, setNewShopId] = useState("");
  const [shopIdError, setShopIdError] = useState(null);
  const [shopIdSaving, setShopIdSaving] = useState(false);

  async function handleChangePin(e) {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError("Naya PIN 4-6 digit ka number hona chahiye");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Naya PIN aur confirm PIN match nahi kar rahe");
      return;
    }

    setPinSaving(true);
    try {
      await apiFetch(`/shops/${auth.shopId}/change-pin`, {
        method: "POST",
        token: auth.token,
        body: { oldPin, newPin },
      });
      setPinSuccess("PIN change ho gaya.");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        onLogout("Session expire ho gaya, dobara login karein.");
        return;
      }
      setPinError(err.message || "PIN change fail hua");
    } finally {
      setPinSaving(false);
    }
  }

  async function handleChangeShopId(e) {
    e.preventDefault();
    setShopIdError(null);

    const trimmed = newShopId.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(trimmed)) {
      setShopIdError("Sirf lowercase letters, numbers, hyphens allowed (kam se kam 3 characters)");
      return;
    }

    setShopIdSaving(true);
    try {
      await apiFetch(`/shops/${auth.shopId}/shop-id`, {
        method: "PATCH",
        token: auth.token,
        body: { newShopId: trimmed },
      });
      onShopIdChanged(trimmed);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        onLogout("Session expire ho gaya, dobara login karein.");
        return;
      }
      setShopIdError(err.message || "Shop ID change fail hua");
    } finally {
      setShopIdSaving(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="settings-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1>Settings</h1>
      </header>

      <section className="settings-panel">
        <h2>Change PIN</h2>
        <p className="settings-panel-hint">Dashboard login ke liye naya PIN set karein.</p>
        <form onSubmit={handleChangePin}>
          <label className="field-label" htmlFor="oldPin">Current PIN</label>
          <input
            id="oldPin"
            type="password"
            inputMode="numeric"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value)}
          />

          <label className="field-label" htmlFor="newPin">New PIN</label>
          <input
            id="newPin"
            type="password"
            inputMode="numeric"
            placeholder="4-6 digit"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />

          <label className="field-label" htmlFor="confirmPin">Confirm new PIN</label>
          <input
            id="confirmPin"
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
          />

          {pinError && <p className="error-text">{pinError}</p>}
          {pinSuccess && <p className="success-text">{pinSuccess}</p>}

          <button type="submit" className="btn-primary" disabled={pinSaving}>
            {pinSaving ? "Saving..." : "Update PIN"}
          </button>
        </form>
      </section>

      <section className="settings-panel">
        <h2>Change Shop ID</h2>
        <p className="settings-panel-hint">
          Current Shop ID: <code>{auth.shopId}</code>. Ise badalne se aapka purana QR code kaam
          karna band kar dega — naya QR Admin se dobara download karna hoga.
        </p>
        <form onSubmit={handleChangeShopId}>
          <label className="field-label" htmlFor="newShopId">New Shop ID</label>
          <input
            id="newShopId"
            type="text"
            placeholder="e.g. sharma-xerox-station"
            value={newShopId}
            onChange={(e) => setNewShopId(e.target.value)}
          />

          {shopIdError && <p className="error-text">{shopIdError}</p>}

          <button type="submit" className="btn-secondary" disabled={shopIdSaving}>
            {shopIdSaving ? "Saving..." : "Update Shop ID"}
          </button>
        </form>
      </section>

      <button className="btn-logout" onClick={() => onLogout(null)}>
        Log out
      </button>
    </div>
  );
}
