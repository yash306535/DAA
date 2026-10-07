import Logo from "./Logo";
import { CONTRACT_CONFIG } from "../contracts/config";
import { shortAddress } from "../utils/format";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-ink-950/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-400 sm:px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <div>
            <p className="font-medium text-slate-200">Built with Ethereum + Solidity + React</p>
            <p className="text-xs">Blockchain-powered • Transparent • Tamper-resistant</p>
          </div>
        </div>
        <div className="text-center text-xs md:text-right">
          <p>
            {CONTRACT_CONFIG.chainName} · Contract <span className="font-mono text-slate-300">{shortAddress(CONTRACT_CONFIG.address) || "not configured"}</span>
          </p>
          <p className="mt-1">Academic demonstration project · Yashvant Dayanand Mane (F24121004)</p>
        </div>
      </div>
    </footer>
  );
}
