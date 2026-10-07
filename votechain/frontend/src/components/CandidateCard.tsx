import { Vote, Hash } from "lucide-react";
import type { Candidate } from "../types";
import { Avatar } from "./ui";

interface Props {
  candidate: Candidate;
  canVote: boolean;
  disabledReason?: string;
  onVote: (c: Candidate) => void;
  index?: number;
}

export default function CandidateCard({ candidate, canVote, disabledReason, onVote, index = 0 }: Props) {
  return (
    <article
      className="glass group flex animate-fade-up flex-col p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.55)]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between">
        <Avatar name={candidate.name} size={64} />
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300">
          <Hash size={12} /> ID {candidate.id}
        </span>
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-white">{candidate.name}</h3>
      <p className="mt-1 inline-flex w-fit rounded-md bg-gradient-to-r from-violet-500/20 to-blue-500/20 px-2 py-0.5 text-sm font-medium text-violet-200">
        {candidate.party}
      </p>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-400">{candidate.manifesto || "No manifesto provided."}</p>
      <button
        onClick={() => onVote(candidate)}
        disabled={!canVote}
        title={!canVote ? disabledReason : undefined}
        className="btn-primary mt-6 w-full"
      >
        <Vote size={18} /> Vote for {candidate.name.split(" ")[0]}
      </button>
    </article>
  );
}
