import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Crown, Percent, RefreshCw, Users, Vote } from "lucide-react";
import { Avatar, EmptyState, GlassCard, SectionTitle, Skeleton, StatCard, StatusPill } from "../components/ui";
import { useElection } from "../hooks/useElection";
import { percent } from "../utils/format";

const COLORS = ["#8b5cf6", "#3b82f6", "#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#a855f7", "#ef4444"];

/** Live results. Every number on this page is read from the smart contract. */
export default function Results() {
  const { election, candidates, winners, loading, lastUpdated, refresh } = useElection();

  if (loading && !election)
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );

  if (!election || election.phase === "none")
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState icon={<BarChart3 />} title="No election results yet">Results appear here once the admin creates an election.</EmptyState>
      </div>
    );

  const total = election.totalVotes;
  const ranked = [...candidates].sort((a, b) => b.voteCount - a.voteCount || a.id - b.id);
  const data = candidates.map((c, i) => ({ name: c.name, short: c.name.split(" ")[0], votes: c.voteCount, color: COLORS[i % COLORS.length] }));
  const winnerIds = election.ended && total > 0 ? winners?.ids ?? [] : [];
  const leaderVotes = ranked[0]?.voteCount ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="Live results" title={election.title} subtitle="Read directly from the Voting smart contract. Anyone can verify these numbers on-chain." />
        <div className="mb-8 flex items-center gap-3">
          <StatusPill phase={election.phase} />
          <button onClick={refresh} className="btn-ghost !py-1.5 text-sm" title="Refresh from chain">
            <RefreshCw size={14} /> {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="Registered voters" value={election.registeredVoters} />
        <StatCard icon={<Vote size={18} />} label="Total votes cast" value={total} />
        <StatCard icon={<Percent size={18} />} label="Voter turnout" value={`${percent(total, election.registeredVoters)}%`} hint={`${election.registeredVoters - total} yet to vote`} />
        <StatCard icon={<BarChart3 size={18} />} label="Candidates" value={candidates.length} />
      </div>

      {/* Winner banner */}
      {election.ended && (
        <GlassCard glow className="mt-6 flex flex-wrap items-center gap-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30">
            <Crown size={28} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">{winnerIds.length > 1 ? "Result: tie" : "Winner"}</p>
            <p className="font-display text-2xl font-semibold text-white">
              {total === 0 ? "No votes were cast" : winnerIds.map((id) => candidates.find((c) => c.id === id)?.name).join(" & ")}
            </p>
            {total > 0 && (
              <p className="text-sm text-slate-400">
                {votesLabel(winners?.highestVotes ?? 0)} · {percent(winners?.highestVotes ?? 0, total)}% of votes cast
              </p>
            )}
          </div>
        </GlassCard>
      )}

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Votes per candidate</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="short" stroke="#8b8fb0" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#8b8fb0" tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(139,92,246,0.08)" }} contentStyle={tooltipStyle} itemStyle={tooltipText} labelStyle={tooltipText} formatter={(v: number) => [votesLabel(v), "Votes"]} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""} />
                <Bar dataKey="votes" radius={[10, 10, 0, 0]} maxBarSize={70}>
                  {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Vote share</h3>
          <div className="relative h-72">
            {total === 0 ? (
              <div className="grid h-full place-items-center text-sm text-slate-500">No votes cast yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="votes" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3} stroke="none">
                    {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipText} formatter={(v: number, n: string) => [`${votesLabel(v)} (${percent(v, total)}%)`, n]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {total > 0 && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="font-display text-3xl font-semibold text-white">{total}</p>
                  <p className="text-xs text-slate-500">votes</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-400">
            {data.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name}</span>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Ranking with progress bars */}
      <GlassCard className="mt-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-white">Ranking</h3>
        <div className="space-y-4">
          {ranked.map((c, i) => {
            const share = percent(c.voteCount, total);
            const color = COLORS[candidates.findIndex((x) => x.id === c.id) % COLORS.length];
            const leading = total > 0 && c.voteCount === leaderVotes;
            return (
              <div key={c.id} className={`flex items-center gap-4 rounded-2xl border p-3 ${leading ? "border-violet-400/30 bg-violet-500/[0.07]" : "border-white/5 bg-white/[0.02]"}`}>
                <span className="w-6 text-center font-display text-lg font-semibold text-slate-500">{i + 1}</span>
                <Avatar name={c.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-white">
                      {c.name} <span className="text-sm text-slate-500">· {c.party}</span>
                      {leading && election.ended && <Crown size={14} className="ml-1.5 inline text-amber-300" />}
                    </p>
                    <p className="font-mono text-sm text-slate-300">
                      {votesLabel(c.voteCount)} · {share}%
                    </p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

const tooltipStyle = { background: "rgba(10,10,36,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#e5e7f5" };
const tooltipText = { color: "#e5e7f5" };
const votesLabel = (n: number) => `${n} vote${n === 1 ? "" : "s"}`;
