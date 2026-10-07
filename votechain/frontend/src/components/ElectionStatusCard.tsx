import { CalendarClock, Users, Vote, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useElection } from "../hooks/useElection";
import { countdown, formatDateTime } from "../utils/format";
import { GlassCard, Skeleton, StatusPill } from "./ui";

/** Live election summary, read from the smart contract. */
export default function ElectionStatusCard() {
  const { election, candidates, winners, loading } = useElection();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading && !election)
    return (
      <GlassCard glow className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-16 w-full" />
      </GlassCard>
    );

  if (!election || election.phase === "none")
    return (
      <GlassCard glow>
        <StatusPill phase="none" />
        <p className="mt-4 font-display text-xl text-white">No election created yet</p>
        <p className="mt-1 text-sm text-slate-400">The admin will create one from the Admin dashboard.</p>
      </GlassCard>
    );

  const turnout = election.registeredVoters ? Math.round((election.totalVotes / election.registeredVoters) * 100) : 0;
  const winnerNames = winners?.ids.map((id) => candidates.find((c) => c.id === id)?.name).filter(Boolean) ?? [];

  return (
    <GlassCard glow>
      <div className="flex items-center justify-between">
        <StatusPill phase={election.phase} />
        <span className="font-mono text-xs text-slate-500">Election #{election.id}</span>
      </div>
      <h3 className="mt-4 font-display text-2xl font-semibold text-white">{election.title}</h3>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Metric icon={<Users size={16} />} label="Voters" value={election.registeredVoters} />
        <Metric icon={<Vote size={16} />} label="Votes" value={election.totalVotes} />
        <Metric icon={<span className="text-xs font-bold">%</span>} label="Turnout" value={`${turnout}%`} />
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700" style={{ width: `${turnout}%` }} />
      </div>

      <div className="mt-5 space-y-1.5 text-sm text-slate-400">
        <p className="flex items-center gap-2">
          <CalendarClock size={15} /> Started: <span className="text-slate-200">{formatDateTime(election.startTime)}</span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarClock size={15} /> {election.ended ? "Ended" : "Ends"}:{" "}
          <span className="text-slate-200">
            {election.endTime ? formatDateTime(election.endTime) : election.started ? "When admin closes voting" : "—"}
          </span>
        </p>
        {election.phase === "active" && election.endTime > 0 && (
          <p className="font-mono text-violet-200">Time left {countdown(election.endTime)}</p>
        )}
        {election.ended && winnerNames.length > 0 && (
          <p className="flex items-center gap-2 pt-1 text-amber-200">
            <Trophy size={15} /> {winnerNames.length > 1 ? "Tie: " : "Winner: "} {winnerNames.join(", ")}
          </p>
        )}
      </div>
    </GlassCard>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-300">{icon}</div>
      <p className="font-display text-xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
