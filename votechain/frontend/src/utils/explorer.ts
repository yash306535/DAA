import { CONTRACT_CONFIG } from "../contracts/config";

/**
 * Explorer links. When a public explorer is configured (e.g. Sepolia Etherscan) we link there;
 * on a local Hardhat chain we link to the dApp's built-in explorer page instead.
 */
export const hasPublicExplorer = () => CONTRACT_CONFIG.explorerUrl.length > 0;

export function txLink(hash: string) {
  return hasPublicExplorer() ? `${CONTRACT_CONFIG.explorerUrl}/tx/${hash}` : `/explorer?tx=${hash}`;
}

export function addressLink(address: string) {
  return hasPublicExplorer() ? `${CONTRACT_CONFIG.explorerUrl}/address/${address}` : `/explorer?address=${address}`;
}

export function blockLink(block: number) {
  return hasPublicExplorer() ? `${CONTRACT_CONFIG.explorerUrl}/block/${block}` : `/explorer?block=${block}`;
}
