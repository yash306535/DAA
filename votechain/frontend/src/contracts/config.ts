/**
 * Single place for every contract / network setting.
 * Values come from environment variables (frontend/.env.local), written by the deploy script.
 * Nothing else in the app hardcodes an address, chain id or explorer URL.
 */
import VotingABI from "./VotingABI.json";

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? 31337);

export const CONTRACT_CONFIG = {
  address: (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim(),
  abi: VotingABI,
  chainId,
  chainIdHex: "0x" + chainId.toString(16),
  chainName: import.meta.env.VITE_CHAIN_NAME ?? (chainId === 31337 ? "Hardhat Local" : `Chain ${chainId}`),
  rpcUrl: (import.meta.env.VITE_RPC_URL ?? "").trim(),
  explorerUrl: (import.meta.env.VITE_EXPLORER_URL ?? "").trim().replace(/\/$/, ""),
  deployBlock: Number(import.meta.env.VITE_DEPLOY_BLOCK ?? 0),
} as const;

export const isContractConfigured = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_CONFIG.address);

/** Known networks: used for display names and for wallet_addEthereumChain. */
export const KNOWN_NETWORKS: Record<number, { name: string; currency: string; explorer?: string }> = {
  1: { name: "Ethereum Mainnet", currency: "ETH", explorer: "https://etherscan.io" },
  11155111: { name: "Sepolia", currency: "SepoliaETH", explorer: "https://sepolia.etherscan.io" },
  31337: { name: "Hardhat Local", currency: "ETH" },
  1337: { name: "Localhost 8545", currency: "ETH" },
};

export function networkName(id: number | null | undefined): string {
  if (id == null) return "Unknown";
  return KNOWN_NETWORKS[id]?.name ?? `Chain ${id}`;
}
