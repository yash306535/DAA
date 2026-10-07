/** Shapes of the data read from Voting.sol (bigints converted to numbers for the UI). */

export interface Candidate {
  id: number;
  name: string;
  party: string;
  manifesto: string;
  voteCount: number;
}

export type ElectionPhase = "none" | "setup" | "active" | "expired" | "ended";

export interface ElectionInfo {
  id: number;
  title: string;
  startTime: number; // unix seconds
  endTime: number; // unix seconds, 0 = no deadline
  started: boolean;
  ended: boolean;
  votingOpen: boolean;
  candidateCount: number;
  registeredVoters: number;
  totalVotes: number;
  phase: ElectionPhase;
}

export interface VoterStatus {
  registered: boolean;
  hasVoted: boolean;
}

export type TxState = "awaiting-signature" | "pending" | "confirmed" | "failed";

/** A transaction made from this browser session (vote / admin action). */
export interface TrackedTx {
  hash?: string;
  label: string;
  state: TxState;
  from?: string;
  blockNumber?: number;
  timestamp?: number;
  error?: string;
  createdAt: number;
}

/** A decoded contract event, used by the Explorer and Admin activity feed. */
export interface ChainEvent {
  name: string;
  args: Record<string, string>;
  txHash: string;
  blockNumber: number;
  timestamp?: number;
  from?: string;
  logIndex: number;
}
