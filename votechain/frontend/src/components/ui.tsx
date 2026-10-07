/** Small shared UI building blocks. */
import type { ReactNode } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ElectionPhase } from "../types";
import { hasPublicExplorer } from "../utils/explorer";
import { avatarGradient, initials } from "../utils/format";

export function GlassCard({ children, className = "", glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return <div className={`glass ${glow ? "gradient-border" : ""} p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-slate-400">{subtitle}</p>}
    </div>
  );
}

const PHASE_STYLE: Record<ElectionPhase, { label: string; dot: string; text: string; ring: string }> = {
  none: { label: "No election", dot: "bg-slate-400", text: "text-slate-300", ring: "bg-slate-400/40" },
  setup: { label: "Not started", dot: "bg-amber-400", text: "text-amber-300", ring: "bg-amber-400/40" },
  active: { label: "Voting live", dot: "bg-emerald-400", text: "text-emerald-300", ring: "bg-emerald-400/50" },
  expired: { label: "Deadline passed", dot: "bg-orange-400", text: "text-orange-300", ring: "bg-orange-400/40" },
  ended: { label: "Ended", dot: "bg-rose-400", text: "text-rose-300", ring: "bg-rose-400/40" },
};

export function StatusPill({ phase }: { phase: ElectionPhase }) {
  const s = PHASE_STYLE[phase];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${s.text}`}>
      <span className="relative flex h-2.5 w-2.5">
        {phase === "active" && <span className={`absolute inline-flex h-full w-full animate-pulse-ring rounded-full ${s.ring}`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

export function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-rose-400"}`} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-2xl font-display font-semibold text-white shadow-lg ring-1 ring-white/20"
      style={{ width: size, height: size, background: avatarGradient(name), fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <GlassCard className="!p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/20 text-violet-200 ring-1 ring-white/10">{icon}</div>
        <p className="text-xs text-slate-400 sm:text-sm">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </GlassCard>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
      title="Copy"
    >
      {done ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

/** "View on Explorer": external link for public chains, internal page on Hardhat. */
export function ExplorerLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const cls = `inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200 ${className}`;
  return hasPublicExplorer() ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children} <ExternalLink size={13} />
    </a>
  ) : (
    <Link to={href} className={cls}>
      {children} <ExternalLink size={13} />
    </Link>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-violet-300 ring-1 ring-white/10">{icon}</div>
      <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-slate-400">{children}</div>}
    </GlassCard>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/25 border-t-white"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}
