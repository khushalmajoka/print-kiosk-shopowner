import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";
import { isToday } from "../statusConfig";
import OrderCard from "./OrderCard";

function SkeletonTicket() {
  return (
    <div className="skeleton-ticket" aria-hidden="true">
      <div className="skeleton-bar" style={{ width: "40%", height: 14, marginBottom: 10 }} />
      <div className="skeleton-bar" style={{ width: "100%", height: 36, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton-bar" style={{ width: "100%", height: 36, marginBottom: 12, borderRadius: 8 }} />
      <div className="skeleton-bar" style={{ width: "100%", height: 34, borderRadius: 8 }} />
    </div>
  );
}

export default function Dashboard({ auth, onOpenSettings, onAuthExpired, theme, onToggleTheme }) {
  const [tab, setTab] = useState("pending"); // "pending" | "history"
  const [pendingOrders, setPendingOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // full history, used for stats + history tab
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const handleAuthError = useCallback(
    (err) => {
      if (err.status === 401 || err.status === 403) {
        onAuthExpired("Your session has expired. Please log in again.");
        return true;
      }
      return false;
    },
    [onAuthExpired]
  );

  const fetchPending = useCallback(
    async (options = {}) => {
      try {
        const data = await apiFetch(`/orders/awaiting-approval?shopId=${auth.shopId}`, {
          token: auth.token,
          onSlow: options.onSlow,
        });
        setPendingOrders(data);
      } catch (err) {
        if (!handleAuthError(err)) console.error("Failed to fetch pending orders", err);
      }
    },
    [auth.shopId, auth.token, handleAuthError]
  );

  const fetchAllOrders = useCallback(
    async (options = {}) => {
      try {
        const data = await apiFetch(`/orders?shopId=${auth.shopId}`, {
          token: auth.token,
          onSlow: options.onSlow,
        });
        setAllOrders(data);
      } catch (err) {
        if (!handleAuthError(err)) console.error("Failed to fetch order history", err);
      }
    },
    [auth.shopId, auth.token, handleAuthError]
  );

  useEffect(() => {
    setLoading(true);
    setWaking(false);
    // Only the very first load gets the "waking up" notice — by the time
    // the 5s poll below kicks in, the backend is already awake.
    const onSlow = () => setWaking(true);
    Promise.all([fetchPending({ onSlow }), fetchAllOrders({ onSlow })]).finally(() => {
      setLoading(false);
      setWaking(false);
    });

    const interval = setInterval(() => {
      fetchPending();
      fetchAllOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchPending, fetchAllOrders]);

  async function handleApprove(orderId) {
    setActionLoading(orderId);
    try {
      await apiFetch(`/orders/${orderId}/approve`, { method: "POST", token: auth.token });
      await Promise.all([fetchPending(), fetchAllOrders()]);
    } catch (err) {
      if (!handleAuthError(err)) console.error("Approve failed", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(orderId) {
    setActionLoading(orderId);
    try {
      await apiFetch(`/orders/${orderId}/reject`, {
        method: "POST",
        token: auth.token,
        body: { reason: "Rejected by shop owner" },
      });
      await Promise.all([fetchPending(), fetchAllOrders()]);
    } catch (err) {
      if (!handleAuthError(err)) console.error("Reject failed", err);
    } finally {
      setActionLoading(null);
    }
  }

  const historyOrders = allOrders.filter((o) => o.status !== "awaiting_approval");
  const todaysOrders = allOrders.filter((o) => isToday(o.createdAt));
  const todaysRevenue = allOrders
    .filter((o) => o.status === "completed" && isToday(o.createdAt))
    .reduce((sum, o) => sum + (o.estimatedPrice || 0), 0);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-identity">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect x="4" y="9" width="16" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
              <path d="M7 9V4h10v5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M7 16v4h10v-4" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </div>
          <div>
            <div className="topbar-shopname">{auth.shopName || auth.shopId}</div>
            <div className="topbar-live">
              <span className="live-dot" />
              Live
            </div>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M19.4 13.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.02-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.38.96a7.4 7.4 0 0 0-1.73-1l-.36-2.54a.5.5 0 0 0-.5-.43h-3.84a.5.5 0 0 0-.5.43l-.36 2.54c-.63.24-1.22.58-1.73 1l-2.38-.96a.5.5 0 0 0-.6.22L2.7 9.28a.5.5 0 0 0 .12.64L4.84 11.5c-.04.33-.06.66-.06 1s.02.67.06 1L2.82 15.08a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.38-.96c.51.42 1.1.76 1.73 1l.36 2.54c.05.25.26.43.5.43h3.84c.24 0 .45-.18.5-.43l.36-2.54a7.4 7.4 0 0 0 1.73-1l2.38.96c.21.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64L19.4 13.5Z"
                stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {waking && (
        <p className="wake-banner">
          Waking up the server — this can take up to a minute after a period of inactivity. Please hang on.
        </p>
      )}

      <div className="stats-strip">
        <div className="stat-seg">
          <span className="stat-value">{pendingOrders.length}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-seg">
          <span className="stat-value">{todaysOrders.length}</span>
          <span className="stat-label">Orders today</span>
        </div>
        <div className="stat-seg">
          <span className="stat-value">₹{todaysRevenue}</span>
          <span className="stat-label">Revenue today</span>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "pending" ? "tab active" : "tab"} onClick={() => setTab("pending")}>
          Pending requests
          {pendingOrders.length > 0 && <span className="tab-badge">{pendingOrders.length}</span>}
        </button>
        <button className={tab === "history" ? "tab active" : "tab"} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {loading && (
        <div className="ticket-list">
          <SkeletonTicket />
          <SkeletonTicket />
        </div>
      )}

      {!loading && tab === "pending" && (
        <div className="ticket-list">
          {pendingOrders.length === 0 && (
            <div className="empty-state-wrap">
              <div className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                  <path d="M4 13l2.5-7A2 2 0 018.4 4.5h7.2a2 2 0 011.9 1.5L20 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 13v4a2 2 0 002 2h12a2 2 0 002-2v-4h-4.5a1 1 0 00-.9.55L14 15h-4l-.6-1.45a1 1 0 00-.9-.55H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="empty-state">No new requests yet — new orders will appear here as soon as a customer submits one.</p>
            </div>
          )}
          {pendingOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              mode="pending"
              actionLoading={actionLoading}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {!loading && tab === "history" && (
        <div className="ticket-list">
          {historyOrders.length === 0 && (
            <div className="empty-state-wrap">
              <div className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="empty-state">No completed orders yet.</p>
            </div>
          )}
          {historyOrders.map((order) => (
            <OrderCard key={order._id} order={order} mode="history" />
          ))}
        </div>
      )}
    </div>
  );
}
