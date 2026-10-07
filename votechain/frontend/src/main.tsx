import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { WalletProvider } from "./hooks/useWallet";
import { ElectionProvider } from "./hooks/useElection";
import { TransactionProvider } from "./hooks/useTransactions";
import "./index.css";

const DEMO = import.meta.env.VITE_DEMO_MODE === "true";
const root = ReactDOM.createRoot(document.getElementById("root")!);

function render() {
  // Hash routing in demo mode so the static build works on any host without rewrites
  const Router = DEMO ? HashRouter : BrowserRouter;
  root.render(
    <React.StrictMode>
      <Router>
        <WalletProvider>
          <ElectionProvider>
            <TransactionProvider>
              <App />
            </TransactionProvider>
          </ElectionProvider>
        </WalletProvider>
      </Router>
    </React.StrictMode>
  );
}

function Boot({ step, error }: { step: string; error?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05051a", color: "#e5e7f5", fontFamily: "Inter, sans-serif", padding: 16 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Space Grotesk, Inter" }}>
          Vote<span style={{ color: "#a78bfa" }}>Chain</span>
        </div>
        <p style={{ marginTop: 14, color: error ? "#fda4af" : "#a5b4fc" }}>{error ?? step}</p>
        {!error && <div style={{ margin: "18px auto 0", width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,.2)", borderTopColor: "#a78bfa", animation: "spin 1s linear infinite" }} />}
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    </div>
  );
}

if (DEMO) {
  import("./demo/demoChain")
    .then(({ startDemoChain }) => startDemoChain((step) => root.render(<Boot step={step} />)))
    .then(render)
    .catch((err) => root.render(<Boot step="" error={String(err?.message ?? err)} />));
} else {
  render();
}
