import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NetworkBackground from "./components/NetworkBackground";
import NetworkNotice from "./components/NetworkNotice";
import TxModal from "./components/TxModal";
import DemoWalletPanel from "./components/DemoWalletPanel";
import Home from "./pages/Home";
import ConnectWallet from "./pages/ConnectWallet";
import VotePage from "./pages/Vote";
import Results from "./pages/Results";
import HowItWorks from "./pages/HowItWorks";
import Admin from "./pages/Admin";
import Explorer from "./pages/Explorer";
import NotFound from "./pages/NotFound";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <NetworkBackground />
      <Navbar />
      <NetworkNotice />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wallet" element={<ConnectWallet />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/results" element={<Results />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <TxModal />
      {import.meta.env.VITE_DEMO_MODE === "true" && <DemoWalletPanel />}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: "rgba(14,14,40,0.95)", color: "#e5e7f5", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" },
          success: { iconTheme: { primary: "#34d399", secondary: "#0a0a24" } },
          error: { iconTheme: { primary: "#fb7185", secondary: "#0a0a24" }, duration: 6000 },
        }}
      />
    </div>
  );
}
