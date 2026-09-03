import { useState, useEffect } from "react";
import { apiFetch, BACKEND_URL } from "../api";

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

  // ---- Print Rates ----
  const [platformDefaults, setPlatformDefaults] = useState({ ratePerPageBW: 3, ratePerPageColor: 10 });
  const [rateBW, setRateBW] = useState("");
  const [rateColor, setRateColor] = useState("");
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(null);
  const [ratesSuccess, setRatesSuccess] = useState(null);
  const [ratesSaving, setRatesSaving] = useState(false);

  useEffect(() => {
    // Platform default rates (used as placeholders + as the fallback when
    // this shop hasn't set its own custom rate).
    fetch(`${BACKEND_URL}/pricing`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPlatformDefaults({ ratePerPageBW: data.ratePerPageBW, ratePerPageColor: data.ratePerPageColor }))
      .catch(() => {});

    // This shop's own current rates, if any have been set.
    fetch(`${BACKEND_URL}/shops/${auth.shopId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setRateBW(data.ratePerPageBW != null ? String(data.ratePerPageBW) : "");
        setRateColor(data.ratePerPageColor != null ? String(data.ratePerPageColor) : "");
      })
      .catch(() => setRatesError("Could not load current rates."))
      .finally(() => setRatesLoading(false));
  }, [auth.shopId]);

  async function handleSaveRates(e) {
    e.preventDefault();
    setRatesError(null);
    setRatesSuccess(null);

    if (rateBW !== "" && Number(rateBW) <= 0) {
      setRatesError("B&W rate must be a positive number.");
      return;
    }
    if (rateColor !== "" && Number(rateColor) <= 0) {
      setRatesError("Color rate must be a positive number.");
      return;
    }

    setRatesSaving(true);
    try {
      await apiFetch(`/shops/${auth.shopId}/pricing`, {
        method: "PATCH",
        token: auth.token,
        body: {
          ratePerPageBW: rateBW === "" ? null : Number(rateBW),
          ratePerPageColor: rateColor === "" ? null : Number(rateColor),
        },
      });
      setRatesSuccess("Print rates updated successfully.");
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        onLogout("Your session has expired. Please log in again.");
        return;
      }
      setRatesError(err.message || "Failed to update print rates. Please try again.");
    } finally {
      setRatesSaving(false);
    }
  }

  async function handleChangePin(e) {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError("New PIN must be a 4-6 digit number.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PIN and confirm PIN do not match.");
      return;
    }

    setPinSaving(true);
    try {
      await apiFetch(`/shops/${auth.shopId}/change-pin`, {
        method: "POST",
        token: auth.token,
        body: { oldPin, newPin },
      });
      setPinSuccess("PIN updated successfully.");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        onLogout("Your session has expired. Please log in again.");
        return;
      }
      setPinError(err.message || "Failed to update PIN. Please try again.");
    } finally {
      setPinSaving(false);
    }
  }

  async function handleChangeShopId(e) {
    e.preventDefault();
    setShopIdError(null);

    const trimmed = newShopId.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(trimmed)) {
      setShopIdError("Only lowercase letters, numbers, and hyphens are allowed (minimum 3 characters).");
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
        onLogout("Your session has expired. Please log in again.");
        return;
      }
      setShopIdError(err.message || "Failed to update Shop ID. Please try again.");
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
        <h2>Print Rates</h2>
        <p className="settings-panel-hint">
          Set your own per-page rate for each print type. Leave a field blank to use the
          platform default (₹{platformDefaults.ratePerPageBW}/page B&amp;W, ₹{platformDefaults.ratePerPageColor}/page color).
        </p>
        {ratesLoading ? (
          <p className="loading-text">Loading current rates...</p>
        ) : (
          <form onSubmit={handleSaveRates}>
            <label className="field-label" htmlFor="rateBW">Black &amp; white — ₹ per page</label>
            <input
              id="rateBW"
              type="number"
              min="0.01"
              step="0.01"
              placeholder={`Default: ₹${platformDefaults.ratePerPageBW}`}
              value={rateBW}
              onChange={(e) => setRateBW(e.target.value)}
            />

            <label className="field-label" htmlFor="rateColor">Color — ₹ per page</label>
            <input
              id="rateColor"
              type="number"
              min="0.01"
              step="0.01"
              placeholder={`Default: ₹${platformDefaults.ratePerPageColor}`}
              value={rateColor}
              onChange={(e) => setRateColor(e.target.value)}
            />

            {ratesError && <p className="error-text">{ratesError}</p>}
            {ratesSuccess && <p className="success-text">{ratesSuccess}</p>}

            <button type="submit" className="btn-primary" disabled={ratesSaving}>
              {ratesSaving ? "Saving..." : "Save Print Rates"}
            </button>
          </form>
        )}
      </section>

      <section className="settings-panel">
        <h2>Change PIN</h2>
        <p className="settings-panel-hint">Set a new PIN for dashboard login.</p>
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
          Current Shop ID: <code>{auth.shopId}</code>. Changing this will stop your old QR code
          from working — you'll need to download a new one from the Admin Dashboard.
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
