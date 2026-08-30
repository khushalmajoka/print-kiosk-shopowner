import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Live backend URL — comes from an environment variable so it can be
// changed per-environment (local/staging/production) without touching code.
// Falls back to the production URL if the env var isn't set.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://print-kiosk-backend-t470.onrender.com";

function App() {
  // The Shop ID is entered once during setup (from the onboarding document)
  // and remembered on this device from then on.
  const [shopId, setShopId] = useState(() => localStorage.getItem("printkaro_shop_id"));
  const [shopIdInput, setShopIdInput] = useState("");
  const [shopName, setShopName] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [tab, setTab] = useState("pending"); // "pending" | "history"
  const [pendingOrders, setPendingOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // order id currently being approved/rejected

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/orders/awaiting-approval?shopId=${shopId}`);
      const data = await res.json();
      setPendingOrders(data);
    } catch (e) {
      console.error("Failed to fetch pending orders", e);
    }
  }, [shopId]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/orders?shopId=${shopId}`);
      const data = await res.json();
      // history tab shows everything except still-awaiting-approval orders
      setHistoryOrders(data.filter((o) => o.status !== "awaiting_approval"));
    } catch (e) {
      console.error("Failed to fetch order history", e);
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    // Confirm the shop exists and get its display name
    fetch(`${BACKEND_URL}/shops/${shopId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setShopName(data.shopName))
      .catch(() => setShopName(shopId)); // fall back to showing the raw ID

    fetchPending();
    fetchHistory();
    setLoading(false);

    // Poll both every 5 seconds so new requests and status updates show up live
    const interval = setInterval(() => {
      fetchPending();
      fetchHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, [shopId, fetchPending, fetchHistory]);

  function handleSetupSubmit(e) {
    e.preventDefault();
    const trimmed = shopIdInput.trim();
    if (!trimmed) return;
    setSetupError(null);

    fetch(`${BACKEND_URL}/shops/${trimmed}`)
      .then((res) => {
        if (!res.ok) throw new Error("Shop ID not found. Please check the ID from your onboarding document.");
        return res.json();
      })
      .then(() => {
        localStorage.setItem("printkaro_shop_id", trimmed);
        setShopId(trimmed);
      })
      .catch((err) => setSetupError(err.message));
  }

  async function handleApprove(orderId) {
    setActionLoading(orderId);
    try {
      await fetch(`${BACKEND_URL}/orders/${orderId}/approve`, { method: "POST" });
      await fetchPending();
      await fetchHistory();
    } catch (e) {
      console.error("Approve failed", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(orderId) {
    setActionLoading(orderId);
    try {
      await fetch(`${BACKEND_URL}/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Rejected by shop owner" }),
      });
      await fetchPending();
      await fetchHistory();
    } catch (e) {
      console.error("Reject failed", e);
    } finally {
      setActionLoading(null);
    }
  }

  // ---- First-time setup screen — enter Shop ID once, remembered after that ----
  if (!shopId) {
    return (
      <div className="dashboard">
        <div className="setup-card">
          <div className="brand">PrintKaro</div>
          <h1>Set Up This Device</h1>
          <p className="subtitle">
            Enter the Shop ID from your onboarding document to connect this dashboard.
          </p>
          <form onSubmit={handleSetupSubmit}>
            <input
              type="text"
              placeholder="e.g. sharma-xerox-01"
              value={shopIdInput}
              onChange={(e) => setShopIdInput(e.target.value)}
            />
            {setupError && <p className="error-text">{setupError}</p>}
            <button type="submit" className="tab active" style={{ width: "100%", marginTop: 10 }}>
              Connect
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <div className="brand">PrintKaro</div>
          <h1>{shopName || shopId}</h1>
        </div>
        <button className="shop-badge" onClick={() => {
          localStorage.removeItem("printkaro_shop_id");
          setShopId(null);
        }}>
          Switch Shop
        </button>
      </header>

      <div className="tabs">
        <button
          className={tab === "pending" ? "tab active" : "tab"}
          onClick={() => setTab("pending")}
        >
          Pending Requests
          {pendingOrders.length > 0 && <span className="badge">{pendingOrders.length}</span>}
        </button>
        <button
          className={tab === "history" ? "tab active" : "tab"}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {loading && <p className="loading-text">Loading...</p>}

      {!loading && tab === "pending" && (
        <div className="order-list">
          {pendingOrders.length === 0 && (
            <p className="empty-state">No pending requests right now.</p>
          )}
          {pendingOrders.map((order) => (
            <div className="order-card" key={order._id}>
              <div className="order-card-header">
                <span className="order-id">#{order._id.slice(-6).toUpperCase()}</span>
                <span className="order-price">₹{order.estimatedPrice}</span>
              </div>

              <div className="file-list">
                {order.files.map((f, i) => (
                  <div className="file-item" key={i}>
                    <span className="file-icon">📄</span>
                    <div className="file-details">
                      <span className="file-name">{f.fileName || "File"}</span>
                      <span className="file-meta">
                        {f.pages ? `Pages ${f.pages}` : "All pages"} · {f.copies} {f.copies > 1 ? "copies" : "copy"} · {f.color ? "Color" : "B&W"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="action-row">
                <button
                  className="reject-btn"
                  disabled={actionLoading === order._id}
                  onClick={() => handleReject(order._id)}
                >
                  Reject
                </button>
                <button
                  className="approve-btn"
                  disabled={actionLoading === order._id}
                  onClick={() => handleApprove(order._id)}
                >
                  {actionLoading === order._id ? "..." : "Approve & Print"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "history" && (
        <div className="order-list">
          {historyOrders.length === 0 && (
            <p className="empty-state">No past orders yet.</p>
          )}
          {historyOrders.map((order) => (
            <div className="order-card history-card" key={order._id}>
              <div className="order-card-header">
                <span className="order-id">#{order._id.slice(-6).toUpperCase()}</span>
                <StatusPill status={order.status} />
              </div>
              <div className="file-list">
                {order.files.map((f, i) => (
                  <div className="file-item" key={i}>
                    <span className="file-icon">📄</span>
                    <div className="file-details">
                      <span className="file-name">{f.fileName || "File"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="order-footer">
                <span>₹{order.estimatedPrice}</span>
                <span className="order-time">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    pending: { label: "Queued", color: "#3b82f6" },
    printing: { label: "Printing", color: "#3b82f6" },
    completed: { label: "Completed", color: "#22c55e" },
    failed: { label: "Failed", color: "#ef4444" },
    rejected: { label: "Rejected", color: "#6b7280" },
  };
  const c = config[status] || { label: status, color: "#6b7280" };
  return (
    <span className="status-pill" style={{ backgroundColor: c.color }}>
      {c.label}
    </span>
  );
}

export default App;