// Central mapping of order status -> how it's shown (label, color, and
// which left-edge accent a ticket card gets). Keeping this in one place
// means the queue and history views always agree on what a status means.

export const STATUS_CONFIG = {
  awaiting_approval: { label: "New request", accent: "amber" },
  pending: { label: "Queued to print", accent: "blue" },
  printing: { label: "Printing", accent: "blue" },
  completed: { label: "Completed", accent: "green" },
  failed: { label: "Failed", accent: "red" },
  rejected: { label: "Rejected", accent: "gray" },
};

export function statusFor(status) {
  return STATUS_CONFIG[status] || { label: status, accent: "gray" };
}

export function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
