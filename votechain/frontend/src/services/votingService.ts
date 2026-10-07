/**
 * All blockchain access goes through this file.
 * Reads use a read-only provider (RPC URL, or the wallet if no RPC is set);
 * writes use the MetaMask signer so the user confirms every transaction.
 */
import { BrowserProvider, Contract, JsonRpcProvider, Network, type AbstractProvider, type Signer } from "ethers";
import { CONTRACT_CONFIG, isContractConfigured } from "../contracts/config";
import type { Candidate, ChainEvent, ElectionInfo, ElectionPhase, VoterStatus } from "../types";

let readProvider: AbstractProvider | null = null;

/** Provider for read-only calls. Works even before a wallet is connected when VITE_RPC_URL is set. */
export function getReadProvider(): AbstractProvider | null {
  if (readProvider) return readProvider;
  if (CONTRACT_CONFIG.rpcUrl) {
    const network = Network.from(CONTRACT_CONFIG.chainId);
    readProvider = new JsonRpcProvider(CONTRACT_CONFIG.rpcUrl, network, { staticNetwork: network, polling: true, pollingInterval: 3000 });
  } else if (window.ethereum) {
    readProvider = new BrowserProvider(window.ethereum, "any");
  }
  return readProvider;
}

export function getReadContract(): Contract {
  const provider = getReadProvider();
  if (!isContractConfigured) throw new Error("Contract address is not configured. Set VITE_CONTRACT_ADDRESS in frontend/.env.local.");
  if (!provider) throw new Error("No blockchain connection. Install MetaMask or set VITE_RPC_URL.");
  return new Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, provider);
}

export function getWriteContract(signer: Signer): Contract {
  return new Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, signer);
}

/** Make sure there is bytecode at the configured address (detects wrong network / missing deploy). */
export async function assertContractDeployed() {
  const provider = getReadProvider();
  if (!provider) throw new Error("No blockchain connection.");
  const code = await provider.getCode(CONTRACT_CONFIG.address);
  if (code === "0x") throw new Error("Smart contract unavailable: no contract is deployed at the configured address on this network.");
}

// ---------------------------------------------------------------- reads

function phaseOf(raw: { id: number; started: boolean; ended: boolean; votingOpen: boolean }): ElectionPhase {
  if (raw.id === 0) return "none";
  if (raw.ended) return "ended";
  if (!raw.started) return "setup";
  return raw.votingOpen ? "active" : "expired";
}

export async function fetchElection(): Promise<ElectionInfo> {
  const r = await getReadContract().getElectionInfo();
  const info = {
    id: Number(r.id),
    title: r.title as string,
    startTime: Number(r.startTime),
    endTime: Number(r.endTime),
    started: r.started as boolean,
    ended: r.ended as boolean,
    votingOpen: r.votingOpen as boolean,
    candidateCount: Number(r.candidateCount),
    registeredVoters: Number(r.registeredVoters),
    totalVotes: Number(r.totalVotes),
  };
  return { ...info, phase: phaseOf(info) };
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const list = await getReadContract().getCandidates();
  return list.map((c: any) => ({
    id: Number(c.id),
    name: c.name,
    party: c.party,
    manifesto: c.manifesto,
    voteCount: Number(c.voteCount),
  }));
}

export async function fetchVoterStatus(address: string): Promise<VoterStatus> {
  const [registered, hasVoted] = await getReadContract().getVoterStatus(address);
  return { registered, hasVoted };
}

export async function fetchOwner(): Promise<string> {
  return getReadContract().owner();
}

export async function fetchWinners(): Promise<{ ids: number[]; highestVotes: number }> {
  const [ids, highest] = await getReadContract().getWinners();
  return { ids: ids.map(Number), highestVotes: Number(highest) };
}

// ---------------------------------------------------------------- events / explorer

const blockTimeCache = new Map<number, number>();
const txFromCache = new Map<string, string>();

/** All events emitted by the contract, newest first, with timestamp and sender. */
export async function fetchEvents(limit = 200): Promise<ChainEvent[]> {
  const contract = getReadContract();
  const provider = getReadProvider()!;
  const logs = await contract.queryFilter("*", CONTRACT_CONFIG.deployBlock, "latest");
  const recent = logs.slice(-limit).reverse();

  const events: ChainEvent[] = [];
  for (const log of recent) {
    const parsed = "fragment" in log ? log : null;
    const name = parsed?.fragment?.name ?? "Unknown";
    const args: Record<string, string> = {};
    if (parsed) parsed.fragment.inputs.forEach((input, i) => (args[input.name] = String(parsed.args[i])));
    events.push({ name, args, txHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.index });
  }

  // Resolve timestamps and senders (cached, done in parallel)
  await Promise.all(
    [...new Set(events.map((e) => e.blockNumber))].filter((b) => !blockTimeCache.has(b)).map(async (b) => {
      const block = await provider.getBlock(b);
      if (block) blockTimeCache.set(b, block.timestamp);
    })
  );
  await Promise.all(
    [...new Set(events.map((e) => e.txHash))].filter((h) => !txFromCache.has(h)).map(async (h) => {
      const tx = await provider.getTransaction(h);
      if (tx) txFromCache.set(h, tx.from);
    })
  );
  return events.map((e) => ({ ...e, timestamp: blockTimeCache.get(e.blockNumber), from: txFromCache.get(e.txHash) }));
}

export interface TxDetails {
  hash: string;
  blockNumber: number | null;
  status: "success" | "failed" | "pending";
  timestamp?: number;
  from: string;
  to: string | null;
  gasUsed?: string;
  method?: string;
  events: string[];
}

/** Full details for one transaction hash (used by the built-in explorer). */
export async function fetchTxDetails(hash: string): Promise<TxDetails | null> {
  const provider = getReadProvider();
  if (!provider) return null;
  const tx = await provider.getTransaction(hash);
  if (!tx) return null;
  const receipt = await provider.getTransactionReceipt(hash);
  const block = receipt ? await provider.getBlock(receipt.blockNumber) : null;
  const contract = getReadContract();
  let method: string | undefined;
  try {
    method = contract.interface.parseTransaction({ data: tx.data, value: tx.value })?.signature;
  } catch {
    method = tx.data === "0x" ? "ETH transfer" : tx.to ? undefined : "Contract deployment";
  }
  const events =
    receipt?.logs
      .filter((l) => l.address.toLowerCase() === CONTRACT_CONFIG.address.toLowerCase())
      .map((l) => {
        try {
          const p = contract.interface.parseLog(l);
          return p ? `${p.name}(${p.args.map(String).join(", ")})` : "";
        } catch {
          return "";
        }
      })
      .filter(Boolean) ?? [];
  return {
    hash,
    blockNumber: receipt?.blockNumber ?? null,
    status: !receipt ? "pending" : receipt.status === 1 ? "success" : "failed",
    timestamp: block?.timestamp,
    from: tx.from,
    to: tx.to,
    gasUsed: receipt?.gasUsed.toString(),
    method,
    events,
  };
}
