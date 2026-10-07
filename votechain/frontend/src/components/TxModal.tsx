import { CheckCircle2, XCircle, Wallet } from "lucide-react";
import Modal from "./Modal";
import TxDetails from "./TxDetails";
import { useTransactions } from "../hooks/useTransactions";

/** Global overlay that follows the active transaction from MetaMask to block confirmation. */
export default function TxModal() {
  const { active, dismissActive } = useTransactions();
  const busy = active?.state === "awaiting-signature" || active?.state === "pending";

  return (
    <Modal open={!!active} onClose={dismissActive} dismissible={!busy}>
      {active && (
        <div className="text-center">
          {active.state === "awaiting-signature" && (
            <>
              <div className="mx-auto mb-4 grid h-16 w-16 animate-float place-items-center rounded-2xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30">
                <Wallet size={30} />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">Confirm in MetaMask</h3>
              <p className="mt-2 text-sm text-slate-400">Review and approve “{active.label}” in the MetaMask window.</p>
            </>
          )}

          {active.state === "pending" && (
            <>
              <BlockLoader />
              <h3 className="font-display text-xl font-semibold text-white">Transaction pending…</h3>
              <p className="mt-2 text-sm text-slate-400">Waiting for the network to include it in a block.</p>
            </>
          )}

          {active.state === "confirmed" && (
            <>
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <CheckCircle2 size={34} />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">
                {active.label === "Cast vote" ? "Vote successfully recorded on blockchain ✓" : `${active.label} confirmed ✓`}
              </h3>
            </>
          )}

          {active.state === "failed" && (
            <>
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30">
                <XCircle size={34} />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">Transaction not completed</h3>
              <p className="mt-2 text-sm text-rose-200">{active.error}</p>
            </>
          )}

          {active.hash && (
            <div className="mt-5 text-left">
              <TxDetails
                compact
                tx={{
                  hash: active.hash,
                  blockNumber: active.blockNumber,
                  status: active.state === "confirmed" ? "success" : active.state === "failed" ? "failed" : "pending",
                  timestamp: active.timestamp,
                  from: active.from,
                }}
              />
            </div>
          )}

          {!busy && (
            <button onClick={dismissActive} className="btn-primary mt-5 w-full">
              Done
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Three blocks being chained together. */
function BlockLoader() {
  return (
    <div className="mx-auto mb-5 flex h-16 items-center justify-center gap-2" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-9 w-9 animate-pulse rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 shadow-[0_0_20px_rgba(139,92,246,0.6)]"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
          {i < 2 && <div className="h-0.5 w-5 animate-pulse bg-violet-400/60" style={{ animationDelay: `${i * 0.25 + 0.12}s` }} />}
        </div>
      ))}
    </div>
  );
}
