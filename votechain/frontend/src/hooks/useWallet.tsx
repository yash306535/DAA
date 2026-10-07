/**
 * Wallet connection state (MetaMask, EIP-1193).
 * Handles: MetaMask missing, user rejection, wrong network, account / network switching.
 */
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { CONTRACT_CONFIG, KNOWN_NETWORKS } from "../contracts/config";
import { parseError } from "../utils/errors";
import { shortAddress } from "../utils/format";

type WalletStatus = "no-wallet" | "disconnected" | "connecting" | "connected";

interface WalletContextValue {
  account: string | null;
  chainId: number | null;
  status: WalletStatus;
  isCorrectNetwork: boolean;
  hasWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
}

const WalletContext = createContext<WalletContextValue | null>(null);
const STORAGE_KEY = "votechain:connected";

function safeStorage(action: "get" | "set" | "remove") {
  try {
    if (action === "get") return localStorage.getItem(STORAGE_KEY) === "1";
    if (action === "set") localStorage.setItem(STORAGE_KEY, "1");
    if (action === "remove") localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: ignore */
  }
  return false;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const hasWallet = typeof window !== "undefined" && !!window.ethereum;
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<WalletStatus>(hasWallet ? "disconnected" : "no-wallet");

  const readChain = useCallback(async () => {
    if (!window.ethereum) return;
    const id = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    setChainId(parseInt(id, 16));
  }, []);

  // Silent reconnect on page load if the user connected before
  useEffect(() => {
    if (!window.ethereum) return;
    readChain().catch(() => {});
    if (!safeStorage("get")) return;
    (window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>)
      .then((accounts) => {
        if (accounts[0]) {
          setAccount(accounts[0]);
          setStatus("connected");
        }
      })
      .catch(() => {});
  }, [readChain]);

  // React to account / network changes made inside MetaMask
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth?.on) return;
    const onAccounts = (accounts: string[]) => {
      if (!accounts.length) {
        setAccount(null);
        setStatus("disconnected");
        safeStorage("remove");
        toast("Wallet disconnected", { icon: "🔌" });
      } else {
        setAccount(accounts[0]);
        setStatus("connected");
        toast.success(`Switched to ${shortAddress(accounts[0])}`);
      }
    };
    const onChain = (id: string) => {
      const n = parseInt(id, 16);
      setChainId(n);
      if (n !== CONTRACT_CONFIG.chainId) toast.error(`Wrong network. Please switch to ${CONTRACT_CONFIG.chainName}.`);
      else toast.success(`Connected to ${CONTRACT_CONFIG.chainName}`);
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed. Install it from metamask.io to continue.");
      return;
    }
    setStatus("connecting");
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      await readChain();
      setAccount(accounts[0] ?? null);
      setStatus(accounts[0] ? "connected" : "disconnected");
      safeStorage("set");
      if (accounts[0]) toast.success(`Wallet connected: ${shortAddress(accounts[0])}`);
    } catch (err) {
      setStatus("disconnected");
      toast.error(parseError(err));
    }
  }, [readChain]);

  /** MetaMask cannot be disconnected programmatically; we forget the session locally. */
  const disconnect = useCallback(() => {
    setAccount(null);
    setStatus(hasWallet ? "disconnected" : "no-wallet");
    safeStorage("remove");
    toast("Disconnected from VoteChain", { icon: "👋" });
  }, [hasWallet]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONTRACT_CONFIG.chainIdHex }] });
    } catch (err: any) {
      // 4902 = chain not added to MetaMask yet
      if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
        try {
          const known = KNOWN_NETWORKS[CONTRACT_CONFIG.chainId];
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: CONTRACT_CONFIG.chainIdHex,
                chainName: CONTRACT_CONFIG.chainName,
                rpcUrls: [CONTRACT_CONFIG.rpcUrl || "http://127.0.0.1:8545"],
                nativeCurrency: { name: "Ether", symbol: known?.currency ?? "ETH", decimals: 18 },
                ...(CONTRACT_CONFIG.explorerUrl ? { blockExplorerUrls: [CONTRACT_CONFIG.explorerUrl] } : {}),
              },
            ],
          });
        } catch (addErr) {
          toast.error(parseError(addErr));
        }
      } else {
        toast.error(parseError(err));
      }
    }
  }, []);

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed.");
    if (!account) throw new Error("Wallet not connected. Please connect MetaMask first.");
    if (chainId !== CONTRACT_CONFIG.chainId) throw new Error(`Wrong network. Please switch MetaMask to ${CONTRACT_CONFIG.chainName}.`);
    return new BrowserProvider(window.ethereum, "any").getSigner(account);
  }, [account, chainId]);

  const value = useMemo<WalletContextValue>(
    () => ({
      account,
      chainId,
      status,
      hasWallet,
      isCorrectNetwork: chainId === CONTRACT_CONFIG.chainId,
      connect,
      disconnect,
      switchNetwork,
      getSigner,
    }),
    [account, chainId, status, hasWallet, connect, disconnect, switchNetwork, getSigner]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
