import { useState } from "react";
import { ChevronDown, FlaskConical, RotateCcw } from "lucide-react";
import { DEMO_ACCOUNTS, demoWallet } from "../demo/demoChain";
import { useWallet } from "../hooks/useWallet";
import { shortAddress } from "../utils/format";

/** Floating account switcher shown only in demo mode (replaces MetaMask's account menu). */
export default function DemoWalletPanel() {
  const { account } = useWallet();
  const [open, setOpen] = useState(true);
  if (!demoWallet) return null;
  const accounts = demoWallet.accounts;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[290px] max-w-[calc(100vw-2rem)]">
      <div className="glass gradient-border overflow-hidden !rounded-2xl text-sm">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="flex items-center gap-2 font-semibold text-white">
            <FlaskConical size={16} className="text-violet-300" /> Demo wallet
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition ${open ? "" : "rotate-180"}`} />
        </button>
        {open && (
          <div className="border-t border-white/5 px-3 pb-3">
            <p className="px-1 pt-2 text-xs leading-relaxed text-slate-400">
              Real Voting.sol on an in-browser Ethereum chain. Pick an account to act as it. Data resets on page reload.
            </p>
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {accounts.map((a, i) => {
                const active = account?.toLowerCase() === a.toLowerCase();
                return (
                  <button
                    key={a}
                    onClick={() => demoWallet!.selectAccount(i)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition ${active ? "bg-violet-500/25 text-white" : "text-slate-300 hover:bg-white/5"}`}
                  >
                    <span>{DEMO_ACCOUNTS[i]?.label}</span>
                    <span className="font-mono text-xs text-slate-400">{shortAddress(a, 6, 4)}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => window.location.reload()} className="btn-ghost mt-2 w-full !py-1.5 text-xs">
              <RotateCcw size={13} /> Reset demo election
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
