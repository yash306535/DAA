import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CircleSlash, Clock, Lock, ShieldX, Users, Wallet } from "lucide-react";
import CandidateCard from "../components/CandidateCard";
import ConfirmVoteModal from "../components/ConfirmVoteModal";
import ElectionStatusCard from "../components/ElectionStatusCard";
import { CopyButton, Dot, EmptyState, GlassCard, SectionTitle, Skeleton } from "../components/ui";
import { CONTRACT_CONFIG, networkName } from "../contracts/config";
import { useElection } from "../hooks/useElection";
import { useTransactions } from "../hooks/useTransactions";
import { useWallet } from "../hooks/useWallet";
import { getWriteContract } from "../services/votingService";
import type { Candidate } from "../types";
import { shortAddress } from "../utils/format";

/** Voter dashboard: eligibility, status and candidate list. */
export default function VotePage() {
  const { account, chainId, isCorrectNetwork, connect, status } = useWallet();
  const { election, candidates, voterStatus, loading } = useElection();
  const { runTx } = useTransactions();
  const [selected, setSelected] = useState<Candidate | null>(null);

  const confirmVote = async () => {
    const c = selected!;
    setSelected(null);
    await runTx("Cast vote", (signer) => getWriteContract(signer).vote(c.id), "Vote successfully recorded on blockchain ✓");
  };

  // Why the vote button is disabled (mirrors the contract checks for a clear UI message)
  let blocker: { icon: React.ReactNode; title: string; text: string } | null = null;
  if (!account) blocker = { icon: <Wallet />, title: "Wallet not connected", text: "Connect MetaMask to check your eligibility and vote." };
  else if (!isCorrectNetwork) blocker = { icon: <ShieldX />, title: "Wrong network", text: `Switch MetaMask to ${CONTRACT_CONFIG.chainName} to vote.` };
  else if (!election || election.phase === "none") blocker = { icon: <CircleSlash />, title: "No election yet", text: "The admin has not created an election." };
  else if (voterStatus && !voterStatus.registered) blocker = { icon: <Lock />, title: "Not registered", text: "Your wallet is not on the list of eligible voters for this election. Contact the election admin." };
  else if (election.phase === "setup") blocker = { icon: <Clock />, title: "Election not active", text: "Voting has not started yet. Candidates are shown below for review." };
  else if (election.phase === "ended" || election.phase === "expired") blocker = { icon: <Lock />, title: "Election ended", text: "Voting is closed. See the final results." };

  const hasVoted = !!voterStatus?.hasVoted;
  const canVote = !blocker && !hasVoted;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionTitle eyebrow="Voter dashboard" title={election?.title || "Cast your vote"} subtitle="All data on this page is read live from the Voting smart contract." />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Voter panel */}
          <GlassCard>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Connected wallet">
                {account ? (
                  <span className="flex items-center gap-1 font-mono">{shortAddress(account)} <CopyButton text={account} /></span>
                ) : (
                  <button onClick={connect} disabled={status === "connecting"} className="text-violet-300 hover:underline">Connect wallet</button>
                )}
              </Field>
              <Field label="Network">
                <span className="flex items-center gap-2"><Dot ok={isCorrectNetwork} /> {account ? networkName(chainId) : "—"}</span>
              </Field>
              <Field label="Eligibility">
                {!account ? "—" : !voterStatus ? <Skeleton className="h-5 w-24" /> : voterStatus.registered ? (
                  <span className="flex items-center gap-1 text-emerald-300"><BadgeCheck size={16} /> Registered voter</span>
                ) : (
                  <span className="text-rose-300">Not registered</span>
                )}
              </Field>
              <Field label="Voting status">
                {!account || !voterStatus ? "—" : hasVoted ? <span className="text-emerald-300">Voted ✓</span> : <span className="text-amber-200">Not voted yet</span>}
              </Field>
            </div>
          </GlassCard>

          {hasVoted && (
            <GlassCard glow className="text-center">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <BadgeCheck size={34} />
              </div>
              <h3 className="font-display text-2xl font-semibold text-white">You have already voted ✓</h3>
              <p className="mt-2 text-sm text-slate-400">Your vote is stored on-chain and cannot be changed. Each wallet can vote once.</p>
              <div className="mt-5 flex justify-center gap-3">
                <Link to="/results" className="btn-primary">View live results</Link>
                <Link to="/explorer" className="btn-ghost">See your transaction</Link>
              </div>
            </GlassCard>
          )}

          {!hasVoted && blocker && (
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">{blocker.icon}</div>
              <div>
                <p className="font-semibold text-white">{blocker.title}</p>
                <p className="text-slate-400">{blocker.text}</p>
              </div>
            </div>
          )}

          {/* Candidates */}
          {!hasVoted &&
            (loading && !candidates.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <GlassCard key={i} className="space-y-4">
                    <Skeleton className="h-16 w-16 !rounded-2xl" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-11 w-full" />
                  </GlassCard>
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <EmptyState icon={<Users />} title="No candidates yet">The admin has not added candidates to this election.</EmptyState>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {candidates.map((c, i) => (
                  <CandidateCard key={c.id} index={i} candidate={c} canVote={canVote} disabledReason={blocker?.title} onVote={setSelected} />
                ))}
              </div>
            ))}
        </div>

        <aside className="space-y-6">
          <ElectionStatusCard />
          <GlassCard>
            <h3 className="font-display font-semibold text-white">Before you vote</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>• One registered wallet = one vote.</li>
              <li>• MetaMask shows the gas fee before you sign.</li>
              <li>• After confirmation the vote is final and public on-chain.</li>
              <li>• Your address is visible on the blockchain; your name is not.</li>
            </ul>
          </GlassCard>
        </aside>
      </div>

      <ConfirmVoteModal candidate={selected} onCancel={() => setSelected(null)} onConfirm={confirmVote} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}
