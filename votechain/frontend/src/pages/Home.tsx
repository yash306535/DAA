import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Blocks, Eye, Fingerprint, Lock, ShieldCheck, UserCheck, Vote, Wallet, Zap } from "lucide-react";
import ElectionStatusCard from "../components/ElectionStatusCard";
import { GlassCard, SectionTitle } from "../components/ui";
import { useWallet } from "../hooks/useWallet";

const STEPS = [
  { icon: <Wallet />, title: "Connect wallet", text: "Connect MetaMask. Your wallet address is your voter identity on-chain." },
  { icon: <UserCheck />, title: "Eligibility check", text: "The contract checks whether the admin registered your address for this election." },
  { icon: <Vote />, title: "Cast one vote", text: "Pick a candidate and sign the transaction. The contract rejects any second vote." },
  { icon: <BarChart3 />, title: "Verify results", text: "Vote counts live in contract storage. Anyone can read and verify them." },
];

const FEATURES = [
  { icon: <Lock />, title: "Tamper-resistant", text: "Votes are state changes in a smart contract. Once a block is final, no one can edit or delete them." },
  { icon: <Eye />, title: "Publicly verifiable", text: "Every vote emits a VoteCast event. Results come straight from the chain, not from a server." },
  { icon: <ShieldCheck />, title: "One wallet, one vote", text: "On-chain checks block unregistered wallets, double voting and invalid candidate ids." },
  { icon: <Fingerprint />, title: "Admin access control", text: "Only the contract owner (OpenZeppelin Ownable) can add candidates, register voters, start or end." },
  { icon: <Blocks />, title: "No central database", text: "Voters, candidates, status and counts are stored on the blockchain, the single source of truth." },
  { icon: <Zap />, title: "Live updates", text: "Dashboards poll the contract and update within seconds of each confirmed vote." },
];

export default function Home() {
  const { account, connect, status } = useWallet();

  return (
    <div>
      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            <Blocks size={14} /> Ethereum smart-contract voting
          </span>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl">
            Decentralized Voting.
            <br />
            <span className="text-gradient">Transparent Results.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            VoteChain runs the whole election inside a Solidity smart contract: who may vote, who has voted and every vote count. No hidden
            database, no edited tallies. Results anyone can check.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {account ? (
              <Link to="/vote" className="btn-primary">
                Go to voting <ArrowRight size={18} />
              </Link>
            ) : (
              <button onClick={connect} className="btn-primary" disabled={status === "connecting"}>
                <Wallet size={18} /> {status === "no-wallet" ? "Install MetaMask" : "Connect Wallet"}
              </button>
            )}
            <Link to="/results" className="btn-ghost">
              <BarChart3 size={18} /> Live results
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" /> 24 contract tests passing</span>
            <span className="flex items-center gap-2"><Lock size={16} className="text-violet-400" /> OpenZeppelin Ownable</span>
          </div>
        </div>

        <div className="relative animate-fade-up [animation-delay:150ms]">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-violet-600/20 to-blue-600/10 blur-2xl" />
          <ElectionStatusCard />
          <ChainStrip />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="How it works" title="From wallet to verified result in four steps" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <GlassCard key={s.title} className="relative overflow-hidden transition hover:-translate-y-1 hover:border-violet-400/30">
              <span className="absolute top-4 right-5 font-display text-5xl font-bold text-white/5">0{i + 1}</span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/20 text-violet-200 ring-1 ring-white/10">{s.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionTitle
          eyebrow="Security & transparency"
          title="Rules enforced by code, not by trust"
          subtitle="Every rule below is checked by the Voting.sol contract itself. The frontend only shows the result."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} className="group transition hover:border-violet-400/30">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-violet-300 ring-1 ring-white/10 transition group-hover:bg-violet-500/20">{f.icon}</div>
                <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.text}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mt-8 border-amber-400/20 !bg-amber-500/[0.06]">
          <p className="text-sm leading-relaxed text-amber-100/90">
            <b>Transparency is not the same as privacy.</b> Wallet addresses and transactions on a public blockchain are visible to anyone, so a vote is
            pseudonymous, not anonymous. VoteChain is an academic demonstration and is <b>not</b> suitable for government elections, which need verified
            identity, ballot secrecy, coercion resistance and a legal framework. <Link to="/how-it-works" className="underline">Read more</Link>
          </p>
        </GlassCard>
      </section>
    </div>
  );
}

/** Decorative animated chain of blocks under the status card. */
function ChainStrip() {
  return (
    <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="grid h-10 w-10 animate-float place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 font-mono text-[10px] text-violet-200"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            #{i + 1}
          </div>
          {i < 5 && <div className="h-px w-4 bg-gradient-to-r from-violet-400/60 to-blue-400/60" />}
        </div>
      ))}
    </div>
  );
}
