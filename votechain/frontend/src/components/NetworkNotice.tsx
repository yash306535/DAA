import { AlertTriangle, PlugZap } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { CONTRACT_CONFIG, networkName } from "../contracts/config";

/** Global banners: wrong network and contract / node unavailable. */
export default function NetworkNotice() {
  const { account, isCorrectNetwork, chainId, switchNetwork } = useWallet();
  const { error } = useElection();

  return (
    <>
      {account && !isCorrectNetwork && (
        <div className="border-b border-amber-400/20 bg-amber-500/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm text-amber-100 sm:px-6">
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} /> Wrong network: MetaMask is on <b>{networkName(chainId)}</b>. VoteChain runs on <b>{CONTRACT_CONFIG.chainName}</b>.
            </span>
            <button onClick={switchNetwork} className="rounded-lg bg-amber-400/20 px-3 py-1 font-medium hover:bg-amber-400/30">
              Switch network
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="border-b border-rose-400/20 bg-rose-500/10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-sm text-rose-100 sm:px-6">
            <PlugZap size={16} className="shrink-0" /> {error}
          </div>
        </div>
      )}
    </>
  );
}
