import { Interface, isError } from "ethers";
import { CONTRACT_CONFIG } from "../contracts/config";

const iface = new Interface(CONTRACT_CONFIG.abi);

/** Friendly text for every custom error defined in Voting.sol (+ OpenZeppelin Ownable). */
const CONTRACT_ERRORS: Record<string, string> = {
  NoElection: "No election has been created yet.",
  PreviousElectionNotEnded: "The current election must end before a new one can be created.",
  ElectionAlreadyStarted: "The election has already started. Candidates can only be added before voting begins.",
  ElectionNotStarted: "The election has not started yet. Please wait for the admin to open voting.",
  ElectionAlreadyEnded: "This election has already ended.",
  ElectionNotActive: "Voting is closed. The election has ended.",
  EmptyField: "Please fill in all required fields.",
  NoCandidates: "Add at least one candidate before starting the election.",
  InvalidCandidate: "Invalid candidate. Please choose a candidate from the list.",
  InvalidAddress: "That is not a valid wallet address.",
  AlreadyRegistered: "This wallet is already registered for the election.",
  NotRegistered: "Your wallet is not registered as an eligible voter for this election.",
  AlreadyVoted: "You have already voted. Each registered wallet can vote only once.",
  OwnableUnauthorizedAccount: "Unauthorized: only the election admin (contract owner) can do this.",
  OwnableInvalidOwner: "Invalid owner address.",
};

/** Look for revert data anywhere inside an ethers / MetaMask / JSON-RPC error object. */
function findRevertData(err: any, depth = 0): string | undefined {
  if (!err || depth > 6) return undefined;
  if (typeof err.data === "string" && err.data.startsWith("0x") && err.data.length >= 10) return err.data;
  if (typeof err.data?.data === "string" && err.data.data.startsWith("0x")) return err.data.data;
  if (typeof err.data?.result === "string" && err.data.result.startsWith("0x")) return err.data.result; // Ganache
  return findRevertData(err.error, depth + 1) ?? findRevertData(err.info?.error, depth + 1) ?? findRevertData(err.cause, depth + 1);
}

/** Convert any wallet / RPC / contract error into one human readable sentence. */
export function parseError(err: unknown): string {
  const e = err as any;

  // 1. Custom error from the contract
  if (e?.revert?.name && CONTRACT_ERRORS[e.revert.name]) return CONTRACT_ERRORS[e.revert.name];
  const data = findRevertData(e);
  if (data) {
    try {
      const parsed = iface.parseError(data);
      if (parsed && CONTRACT_ERRORS[parsed.name]) return CONTRACT_ERRORS[parsed.name];
    } catch {
      /* not one of ours */
    }
  }

  // 2. Wallet / provider errors
  if (isError(e, "ACTION_REJECTED") || e?.code === 4001 || e?.info?.error?.code === 4001)
    return "You rejected the request in MetaMask. Nothing was sent to the blockchain.";
  if (isError(e, "INSUFFICIENT_FUNDS") || /insufficient funds/i.test(e?.message ?? ""))
    return "Insufficient funds for gas. Add test ETH to this wallet and try again.";
  if (e?.code === -32002) return "A MetaMask request is already open. Please check the MetaMask window.";
  if (e?.code === 4902) return "This network is not added to MetaMask yet.";
  if (isError(e, "NETWORK_ERROR") || /failed to fetch|ECONNREFUSED|could not detect network/i.test(e?.message ?? ""))
    return "Cannot reach the blockchain node. Is the Hardhat node / RPC running?";
  if (isError(e, "BAD_DATA") || /could not decode result data/i.test(e?.message ?? ""))
    return "Smart contract unavailable at the configured address on this network. Check the deployment and network.";
  if (isError(e, "CALL_EXCEPTION")) return e.reason ? `Transaction reverted: ${e.reason}` : "The smart contract rejected this transaction.";

  return e?.shortMessage ?? e?.reason ?? e?.message ?? "Something went wrong.";
}
