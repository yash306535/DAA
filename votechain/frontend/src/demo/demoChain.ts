/**
 * DEMO MODE (VITE_DEMO_MODE=true) – used for the hosted online demo.
 *
 * Starts a real Ethereum blockchain (Ganache EVM) inside the browser, deploys the compiled
 * Voting.sol bytecode to it and seeds the demo election. Every vote is still executed by the
 * smart contract; nothing is faked in the UI. A small demo wallet replaces MetaMask so visitors
 * can switch between the admin and voter accounts without installing anything.
 *
 * Note: this chain lives in the visitor's browser tab, so its state resets when the page is reloaded.
 * For the real setup use Hardhat (localhost) or Sepolia with MetaMask (see README).
 */
import { BrowserProvider, ContractFactory } from "ethers";
import { CONTRACT_CONFIG } from "../contracts/config";
import { bytecode } from "../contracts/VotingBytecode.json";

// Shipped next to the demo build (see build:demo); the CDN copy is a fallback
const GANACHE_LOCAL = "./ganache.min.js";
const GANACHE_CDN = "https://cdn.jsdelivr.net/npm/ganache@7.9.2/dist/web/ganache.min.js";
// Same mnemonic as Hardhat, so addresses match the README / report
const MNEMONIC = "test test test test test test test test test test test junk";

export const DEMO_ACCOUNTS = [
  { label: "Admin (contract owner)", role: "admin" },
  { label: "Voter 1", role: "voter" },
  { label: "Voter 2", role: "voter" },
  { label: "Voter 3", role: "voter" },
  { label: "Voter 4", role: "voter" },
  { label: "Voter 5", role: "voter" },
  { label: "Unregistered wallet A", role: "outsider" },
  { label: "Unregistered wallet B", role: "outsider" },
] as const;

const CANDIDATES: [string, string, string][] = [
  ["Aarav Sharma", "Student First", "24x7 library access, upgraded computer labs and a transparent student budget."],
  ["Priya Patil", "Future Forward", "Green campus drive, monthly hackathons and stronger industry mentorship."],
  ["Rahul Deshmukh", "Progress Alliance", "Active placement cell, better sports facilities and a student help desk."],
];

type Listener = (...args: any[]) => void;

/** EIP-1193 wallet that signs with the selected demo account (stands in for MetaMask). */
class DemoWallet {
  isMetaMask = false;
  isVoteChainDemo = true;
  accounts: string[] = [];
  current = "";
  private listeners: Record<string, Listener[]> = {};
  constructor(private inner: any) {}

  on(event: string, fn: Listener) {
    (this.listeners[event] ||= []).push(fn);
  }
  removeListener(event: string, fn: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== fn);
  }
  private emit(event: string, ...args: any[]) {
    (this.listeners[event] || []).forEach((fn) => fn(...args));
  }

  selectAccount(index: number) {
    this.current = this.accounts[index];
    this.emit("accountsChanged", [this.current]);
  }

  async request({ method, params }: { method: string; params?: any }) {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [this.current];
      case "eth_chainId":
        return CONTRACT_CONFIG.chainIdHex;
      case "wallet_switchEthereumChain":
      case "wallet_addEthereumChain":
        return null;
      case "eth_sendTransaction":
        // short pause so the "Confirm in wallet" step is visible, like MetaMask
        await new Promise((r) => setTimeout(r, 900));
        return this.inner.request({ method, params: [{ ...params[0], from: this.current }] });
      default:
        return this.inner.request({ method, params: params ?? [] });
    }
  }
}

export let demoWallet: DemoWallet | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the in-browser blockchain (Ganache). Check your internet connection."));
    document.head.appendChild(s);
  });
}

export async function startDemoChain(onStep: (s: string) => void) {
  onStep("Starting in-browser Ethereum node…");
  await loadScript(GANACHE_LOCAL).catch(() => loadScript(GANACHE_CDN));
  const Ganache = (window as any).Ganache;
  const inner = Ganache.provider({
    wallet: { mnemonic: MNEMONIC, totalAccounts: DEMO_ACCOUNTS.length, defaultBalance: 1000 },
    chain: { chainId: CONTRACT_CONFIG.chainId, hardfork: "shanghai" },
    miner: { instamine: "eager" },
    logging: { quiet: true },
  });

  const wallet = new DemoWallet(inner);
  wallet.accounts = (await inner.request({ method: "eth_accounts", params: [] })) as string[];
  wallet.current = wallet.accounts[0];

  onStep("Deploying Voting.sol smart contract…");
  const provider = new BrowserProvider(inner);
  const admin = await provider.getSigner(wallet.accounts[0]);
  const factory = new ContractFactory(CONTRACT_CONFIG.abi, bytecode, admin);
  const voting: any = await factory.deploy(wallet.accounts[0]);
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  if (address.toLowerCase() !== CONTRACT_CONFIG.address.toLowerCase())
    console.warn(`Demo contract deployed at ${address}, config expects ${CONTRACT_CONFIG.address}`);

  onStep("Creating demo election, candidates and voters…");
  await (await voting.createElection("Student Council Election 2026")).wait();
  for (const [n, p, m] of CANDIDATES) await (await voting.addCandidate(n, p, m)).wait();
  await (await voting.registerVoters(wallet.accounts.slice(1, 6))).wait();
  await (await voting.startElection(0)).wait();

  demoWallet = wallet;
  window.ethereum = wallet as any;
  return wallet;
}
