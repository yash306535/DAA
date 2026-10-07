import { ArrowDown, Blocks, Code2, EyeOff, FileCode2, Globe, Lock, ShieldCheck, Wallet } from "lucide-react";
import { GlassCard, SectionTitle } from "../components/ui";

const LAYERS = [
  { icon: <Globe />, title: "Frontend (React + Vite + TypeScript)", text: "Pages, charts and forms. Holds no votes. Reads everything from the contract." },
  { icon: <Wallet />, title: "MetaMask", text: "Holds the private key, shows each transaction and signs it after the user approves." },
  { icon: <Code2 />, title: "ethers.js v6", text: "Encodes function calls with the ABI, sends transactions and decodes events and errors." },
  { icon: <Blocks />, title: "Ethereum-compatible blockchain", text: "Hardhat local node (chain 31337) or Sepolia testnet. Nodes run the contract and agree on its state." },
  { icon: <FileCode2 />, title: "Voting smart contract (Solidity)", text: "Stores voters, candidates, status and counts. Enforces every rule with modifiers and checks." },
];

const RULES = [
  ["onlyOwner", "createElection, addCandidate, registerVoter(s), startElection, endElection"],
  ["beforeStart", "Candidates can only be added before voting starts"],
  ["onlyWhileOpen", "vote() only between start and end (or deadline)"],
  ["NotRegistered", "Wallets not authorized by the admin cannot vote"],
  ["AlreadyVoted", "A wallet that voted once is rejected; it cannot vote for a second candidate"],
  ["InvalidCandidate", "Candidate id must be between 1 and the number of candidates"],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionTitle eyebrow="How it works" title="Architecture of VoteChain" subtitle="A request travels through five layers. Only the last one decides what is true." />

      <div className="mx-auto max-w-2xl space-y-2">
        {LAYERS.map((l, i) => (
          <div key={l.title}>
            <GlassCard className="flex items-start gap-4 !p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/20 text-violet-200 ring-1 ring-white/10">{l.icon}</div>
              <div>
                <h3 className="font-display font-semibold text-white">{l.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{l.text}</p>
              </div>
            </GlassCard>
            {i < LAYERS.length - 1 && <ArrowDown className="mx-auto my-1 text-violet-400/60" size={20} />}
          </div>
        ))}
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><ShieldCheck size={18} className="text-violet-300" /> Rules enforced on-chain</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {RULES.map(([k, v]) => (
              <li key={k} className="flex gap-3">
                <code className="h-fit shrink-0 rounded-md bg-violet-500/15 px-2 py-0.5 text-xs text-violet-200">{k}</code>
                <span className="text-slate-400">{v}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><Lock size={18} className="text-violet-300" /> Life of a vote</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-400">
            <li>You click <b className="text-slate-200">Vote</b> and confirm in the modal.</li>
            <li>ethers.js encodes <code className="text-violet-200">vote(candidateId)</code> and asks MetaMask to sign.</li>
            <li>MetaMask shows the gas fee; you approve and the signed transaction is broadcast.</li>
            <li>A node executes the contract: it checks status, registration, double voting and the candidate id.</li>
            <li>If all checks pass, the contract marks you as voted, adds 1 to the count and emits <code className="text-violet-200">VoteCast</code>.</li>
            <li>The transaction is mined into a block. The UI shows the hash, block number and explorer link.</li>
            <li>Results pages read the new counts from the contract.</li>
          </ol>
        </GlassCard>
      </div>

      <GlassCard className="mt-6 border-amber-400/20 !bg-amber-500/[0.05]">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-100"><EyeOff size={18} /> Transparency vs voter privacy</h3>
        <div className="mt-3 grid gap-4 text-sm leading-relaxed text-amber-50/80 md:grid-cols-2">
          <p>
            <b>Transparency</b> means anyone can audit the process: the candidate list, who is registered, how many votes each candidate has and that
            nobody voted twice. VoteChain provides this because all state lives on a public blockchain.
          </p>
          <p>
            <b>Privacy</b> (ballot secrecy) means nobody can link a voter to their choice. VoteChain does <b>not</b> provide this: the
            <code> vote()</code> transaction and the <code>VoteCast</code> event show which wallet voted for which candidate. Wallets are pseudonymous,
            but anyone who knows who owns an address can see their vote.
          </p>
          <p className="md:col-span-2">
            Real elections also need verified identity (one person, not one wallet), coercion resistance (no one can prove how you voted to a buyer),
            accessibility and a legal framework. Research systems use zero-knowledge proofs, commit-reveal or homomorphic tallying (e.g. MACI, Semaphore)
            to add privacy. <b>VoteChain is an academic demonstration only and not suitable for government elections.</b>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
