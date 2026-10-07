import { AlertTriangle, CheckCircle2, Download, KeyRound, Network, Wallet, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { CopyButton, Dot, GlassCard, SectionTitle, Spinner } from "../components/ui";
import { CONTRACT_CONFIG, networkName } from "../contracts/config";
import { useElection } from "../hooks/useElection";
import { useWallet } from "../hooks/useWallet";

export default function ConnectWallet() {
  const { account, chainId, status, hasWallet, isCorrectNetwork, connect, disconnect, switchNetwork } = useWallet();
  const { voterStatus, isAdmin } = useElection();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Wallet"
        title="Connect your wallet"
        subtitle="VoteChain uses MetaMask to identify you and to sign your vote. We never see your private key."
      />

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <GlassCard glow>
          {!hasWallet ? (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/15 text-orange-300"><Download size={30} /></div>
              <h3 className="font-display text-xl font-semibold text-white">MetaMask not detected</h3>
              <p className="mt-2 text-sm text-slate-400">Install the MetaMask browser extension, then reload this page.</p>
              <a className="btn-primary mt-5" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                Install MetaMask
              </a>
            </div>
          ) : !account ? (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 animate-float place-items-center rounded-2xl bg-violet-500/15 text-violet-200"><Wallet size={30} /></div>
              <h3 className="font-display text-xl font-semibold text-white">Not connected</h3>
              <p className="mt-2 text-sm text-slate-400">MetaMask will ask you to choose an account to share with VoteChain.</p>
              <button onClick={connect} disabled={status === "connecting"} className="btn-primary mt-5">
                {status === "connecting" ? <Spinner /> : <Wallet size={18} />} {status === "connecting" ? "Waiting for MetaMask…" : "Connect MetaMask"}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 size={16} /> Connected
              </div>
              <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">Wallet address</p>
              <p className="mt-1 flex items-center gap-2 break-all font-mono text-lg text-white">
                {account} <CopyButton text={account} />
              </p>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <Info label="Connected network" value={<span className="flex items-center gap-2"><Dot ok={isCorrectNetwork} /> {networkName(chainId)} ({chainId})</span>} />
                <Info label="Required network" value={`${CONTRACT_CONFIG.chainName} (${CONTRACT_CONFIG.chainId})`} />
                <Info label="Voter eligibility" value={voterStatus ? (voterStatus.registered ? "Registered ✓" : "Not registered") : "—"} />
                <Info label="Role" value={isAdmin ? "Election admin (owner)" : "Voter"} />
              </dl>

              {!isCorrectNetwork && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  <span className="flex items-center gap-2"><AlertTriangle size={16} /> Wrong network</span>
                  <button className="btn-ghost !py-1.5 text-sm" onClick={switchNetwork}>
                    <Network size={15} /> Switch to {CONTRACT_CONFIG.chainName}
                  </button>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/vote" className="btn-primary">Go to voter dashboard</Link>
                <button onClick={disconnect} className="btn-ghost"><XCircle size={16} /> Disconnect</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">To use another account, switch it inside MetaMask. VoteChain updates automatically.</p>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 text-violet-200"><KeyRound size={18} /> <h3 className="font-display text-lg font-semibold text-white">What is a wallet?</h3></div>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-400">
            <li>• A crypto wallet holds a <b className="text-slate-200">private key</b> and shows its public <b className="text-slate-200">address</b>.</li>
            <li>• Your address is your voter ID. The admin registers it in the smart contract.</li>
            <li>• When you vote, MetaMask <b className="text-slate-200">signs</b> a transaction. The signature proves it came from you without revealing the key.</li>
            <li>• A transaction costs a small gas fee. On Hardhat / Sepolia this is free test ETH.</li>
            <li>• Never share your seed phrase. VoteChain will never ask for it.</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}
