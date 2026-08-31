import { statusFor, timeAgo } from "../statusConfig";

export default function OrderCard({ order, mode, actionLoading, onApprove, onReject }) {
  const { accent, label } = statusFor(order.status);

  return (
    <div className={`ticket accent-${accent}`}>
      <div className="ticket-top">
        <span className="ticket-id">#{order._id.slice(-6).toUpperCase()}</span>
        <span className="ticket-time">{timeAgo(order.createdAt)}</span>
        <span className="ticket-price">₹{order.estimatedPrice}</span>
      </div>

      <div className="ticket-files">
        {order.files.map((f, i) => (
          <div className="ticket-file" key={i}>
            <span className="ticket-file-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                <path
                  d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                  stroke="currentColor" strokeWidth="1.5"
                />
                <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <div className="ticket-file-details">
              <span className="ticket-file-name">{f.fileName || "File"}</span>
              <span className="ticket-file-meta">
                {f.pages ? `Pages ${f.pages}` : "All pages"} · {f.copies} {f.copies > 1 ? "copies" : "copy"} · {f.color ? "Color" : "B&W"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {mode === "pending" ? (
        <div className="ticket-actions">
          <button
            className="btn-reject"
            disabled={actionLoading === order._id}
            onClick={() => onReject(order._id)}
          >
            Reject
          </button>
          <button
            className="btn-approve"
            disabled={actionLoading === order._id}
            onClick={() => onApprove(order._id)}
          >
            {actionLoading === order._id ? "Working..." : "Approve & print"}
          </button>
        </div>
      ) : (
        <div className="ticket-footer">
          <span className={`status-pill accent-${accent}`}>{label}</span>
          <span className="ticket-footer-time">{new Date(order.createdAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
