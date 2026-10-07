import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { WalletProvider } from "./hooks/useWallet";
import { ElectionProvider } from "./hooks/useElection";
import { TransactionProvider } from "./hooks/useTransactions";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <ElectionProvider>
          <TransactionProvider>
            <App />
          </TransactionProvider>
        </ElectionProvider>
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>
);
