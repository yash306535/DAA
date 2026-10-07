/**
 * Runs a contract transaction through its full life-cycle and tracks it for the UI:
 *   awaiting-signature (MetaMask open) -> pending (mined?) -> confirmed / failed
 */
import type { ContractTransactionResponse } from "ethers";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import type { TrackedTx } from "../types";
import { parseError } from "../utils/errors";
import { useElection } from "./useElection";
import { useWallet } from "./useWallet";
import type { Signer } from "ethers";

type TxFn = (signer: Signer) => Promise<ContractTransactionResponse>;

interface TxContextValue {
  transactions: TrackedTx[];
  active: TrackedTx | null;
  dismissActive: () => void;
  runTx: (label: string, fn: TxFn, successMessage?: string) => Promise<boolean>;
}

const TxContext = createContext<TxContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { getSigner } = useWallet();
  const { refresh } = useElection();
  const [transactions, setTransactions] = useState<TrackedTx[]>([]);
  const [active, setActive] = useState<TrackedTx | null>(null);

  const update = useCallback((createdAt: number, patch: Partial<TrackedTx>) => {
    setTransactions((list) => list.map((t) => (t.createdAt === createdAt ? { ...t, ...patch } : t)));
    setActive((a) => (a && a.createdAt === createdAt ? { ...a, ...patch } : a));
  }, []);

  const runTx = useCallback(
    async (label: string, fn: TxFn, successMessage?: string) => {
      const createdAt = Date.now();
      const tx: TrackedTx = { label, state: "awaiting-signature", createdAt };
      setTransactions((l) => [tx, ...l]);
      setActive(tx);
      try {
        const signer = await getSigner();
        const response = await fn(signer); // MetaMask confirmation popup
        update(createdAt, { hash: response.hash, from: response.from, state: "pending" });
        const receipt = await response.wait(); // wait for the block
        if (!receipt || receipt.status !== 1) throw new Error("Transaction failed on-chain.");
        const block = await receipt.getBlock();
        update(createdAt, { state: "confirmed", blockNumber: receipt.blockNumber, timestamp: block.timestamp });
        toast.success(successMessage ?? `${label} confirmed ✓`);
        await refresh();
        return true;
      } catch (err) {
        const message = parseError(err);
        update(createdAt, { state: "failed", error: message });
        toast.error(message);
        return false;
      }
    },
    [getSigner, refresh, update]
  );

  const value = useMemo(
    () => ({ transactions, active, dismissActive: () => setActive(null), runTx }),
    [transactions, active, runTx]
  );
  return <TxContext.Provider value={value}>{children}</TxContext.Provider>;
}

export function useTransactions() {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error("useTransactions must be used inside <TransactionProvider>");
  return ctx;
}
