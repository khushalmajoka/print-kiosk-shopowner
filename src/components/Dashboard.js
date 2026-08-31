import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";
import { isToday } from "../statusConfig";
import OrderCard from "./OrderCard";

export default function Dashboard({ auth, onOpenSettings, onAuthExpired }) {
  const [tab, setTab] = useState("pending"); // "pending" | "history"
  const [pendingOrders, setPendingOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // full history, used for stats + history tab
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const handleAuthError = useCallback(
    (err) => {
      if (err.status === 401 || err.status === 403) {
        onAuthExpired("Session expire ho gaya, dobara login karein.");
        return true;
      }
      return false;
    },
    [onAuthExpired]
  );

  const fetchPending = useCallback(async () => {
    try {
      const data = await apiFetch(`/orders/awaiting-approval?shopId=${auth.shopId}`, {
        token: auth.token,
      });
      setPendingOrders(data);
    } catch (err) {
      if (!handleAuthError(err)) console.error("Failed to fetch pending orders", err);
    }
  }, [auth.shopId, auth.token, handleAuthError]);

  const fetchAllOrders = useCallback(async () => {
    try {
      const data = await apiFetch(`/orders?shopId=${auth.shopId}`, { token: auth.token });
      setAllOrders(data);
    } catch (err) {
      if (!handleAuthError(err)) console.error("Failed to fetch order history", err);
    }
  }, [auth.shopId, auth.token, handleAuthError]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPending(), fetchAllOrders()]).finally(() => setLoading(false));

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
        body: { reason: "Shop owner ne reject kiya" },
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
        <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M19.4 13.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.02-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.38.96a7.4 7.4 0 0 0-1.73-1l-.36-2.54a.5.5 0 0 0-.5-.43h-3.84a.5.5 0 0 0-.5.43l-.36 2.54c-.63.24-1.22.58-1.73 1l-2.38-.96a.5.5 0 0 0-.6.22L2.7 9.28a.5.5 0 0 0 .12.64L4.84 11.5c-.04.33-.06.66-.06 1s.02.67.06 1L2.82 15.08a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.38-.96c.51.42 1.1.76 1.73 1l.36 2.54c.05.25.26.43.5.43h3.84c.24 0 .45-.18.5-.43l.36-2.54a7.4 7.4 0 0 0 1.73-1l2.38.96c.21.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64L19.4 13.5Z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

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

      {loading && <p className="loading-text">Loading...</p>}

      {!loading && tab === "pending" && (
        <div className="ticket-list">
          {pendingOrders.length === 0 && (
            <p className="empty-state">Koi naya request nahi hai — jab customer order karega, yahan turant dikhega.</p>
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
            <p className="empty-state">Abhi tak koi order complete nahi hua hai.</p>
          )}
          {historyOrders.map((order) => (
            <OrderCard key={order._id} order={order} mode="history" />
          ))}
        </div>
      )}
    </div>
  );
}
