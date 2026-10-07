/** Formatting helpers. */

export const shortAddress = (addr?: string | null, left = 6, right = 4) =>
  !addr ? "" : addr.length <= left + right ? addr : `${addr.slice(0, left)}...${addr.slice(-right)}`;

export const shortHash = (hash?: string | null) => shortAddress(hash, 10, 8);

export function formatDateTime(unixSeconds?: number) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function percent(part: number, total: number, digits = 1) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(digits));
}

export function timeAgo(unixSeconds?: number) {
  if (!unixSeconds) return "";
  const diff = Math.max(0, Date.now() / 1000 - unixSeconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function countdown(toUnixSeconds: number) {
  const s = Math.max(0, Math.floor(toUnixSeconds - Date.now() / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/** Deterministic gradient for avatars, based on a name. */
export function avatarGradient(seed: string) {
  const palettes = [
    ["#8b5cf6", "#3b82f6"],
    ["#ec4899", "#8b5cf6"],
    ["#06b6d4", "#6366f1"],
    ["#f59e0b", "#ef4444"],
    ["#10b981", "#3b82f6"],
    ["#a855f7", "#ec4899"],
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = palettes[h % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
