/**
 * Election state read from the smart contract (the only source of truth).
 * Polls the chain every few seconds so every open tab sees new votes live.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isContractConfigured } from "../contracts/config";
import { assertContractDeployed, fetchCandidates, fetchElection, fetchOwner, fetchVoterStatus, fetchWinners } from "../services/votingService";
import type { Candidate, ElectionInfo, VoterStatus } from "../types";
import { parseError } from "../utils/errors";
import { useWallet } from "./useWallet";

interface ElectionContextValue {
  election: ElectionInfo | null;
  candidates: Candidate[];
  voterStatus: VoterStatus | null;
  owner: string | null;
  isAdmin: boolean;
  winners: { ids: number[]; highestVotes: number } | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

const ElectionContext = createContext<ElectionContextValue | null>(null);
const POLL_MS = 5000;

export function ElectionProvider({ children }: { children: ReactNode }) {
  const { account } = useWallet();
  const [election, setElection] = useState<ElectionInfo | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterStatus, setVoterStatus] = useState<VoterStatus | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [winners, setWinners] = useState<{ ids: number[]; highestVotes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const checkedDeployment = useRef(false);

  const refresh = useCallback(async () => {
    if (!isContractConfigured) {
      setError("Contract address is not configured. Deploy the contract and set VITE_CONTRACT_ADDRESS.");
      setLoading(false);
      return;
    }
    try {
      if (!checkedDeployment.current) {
        await assertContractDeployed();
        checkedDeployment.current = true;
      }
      const [e, c, o, w] = await Promise.all([fetchElection(), fetchCandidates(), fetchOwner(), fetchWinners()]);
      setElection(e);
      setCandidates(c);
      setOwner(o);
      setWinners(c.length ? w : null);
      setVoterStatus(account ? await fetchVoterStatus(account) : null);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      checkedDeployment.current = false;
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo<ElectionContextValue>(
    () => ({
      election,
      candidates,
      voterStatus,
      owner,
      isAdmin: !!account && !!owner && account.toLowerCase() === owner.toLowerCase(),
      winners,
      loading,
      error,
      lastUpdated,
      refresh,
    }),
    [election, candidates, voterStatus, owner, account, winners, loading, error, lastUpdated, refresh]
  );

  return <ElectionContext.Provider value={value}>{children}</ElectionContext.Provider>;
}

export function useElection() {
  const ctx = useContext(ElectionContext);
  if (!ctx) throw new Error("useElection must be used inside <ElectionProvider>");
  return ctx;
}
