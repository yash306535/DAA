import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, Wallet, X, ShieldCheck, AlertTriangle } from "lucide-react";
import Logo from "./Logo";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { shortAddress } from "../utils/format";
import { Spinner } from "./ui";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/vote", label: "Vote" },
  { to: "/results", label: "Results" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/explorer", label: "Explorer" },
  { to: "/admin", label: "Admin" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { account, status, connect, disconnect, isCorrectNetwork } = useWallet();
  const { isAdmin } = useElection();

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`;

  const walletButton = account ? (
    <div className="flex items-center gap-2">
      <Link
        to="/wallet"
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm ${
          isCorrectNetwork ? "border-violet-400/30 bg-violet-500/10 text-violet-100" : "border-amber-400/40 bg-amber-500/10 text-amber-200"
        }`}
        title={account}
      >
        {isCorrectNetwork ? <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> : <AlertTriangle size={14} />}
        {shortAddress(account)}
        {isAdmin && <ShieldCheck size={14} className="text-violet-300" aria-label="Admin" />}
      </Link>
      <button onClick={disconnect} className="btn-ghost !p-2" title="Disconnect">
        <LogOut size={16} />
      </button>
    </div>
  ) : (
    <button onClick={connect} className="btn-primary !py-2 text-sm" disabled={status === "connecting"}>
      {status === "connecting" ? <Spinner size={14} /> : <Wallet size={16} />}
      {status === "no-wallet" ? "Install MetaMask" : "Connect Wallet"}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo size={34} />
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            Vote<span className="text-gradient">Chain</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:block">{walletButton}</div>

        <button className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 px-4 pb-4 lg:hidden">
          <div className="flex flex-col gap-1 py-3">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </div>
          {walletButton}
        </div>
      )}
    </header>
  );
}
