import { useMemo, useState } from "react";
import { isAddress } from "ethers";
import { Activity, BarChart3, Flag, Play, PlusCircle, ShieldAlert, ShieldCheck, Square, UserPlus, Users, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ExplorerLink, GlassCard, SectionTitle, StatCard, StatusPill } from "../components/ui";
import { useChainEvents } from "../hooks/useChainEvents";
import { useElection } from "../hooks/useElection";
import { useTransactions } from "../hooks/useTransactions";
import { useWallet } from "../hooks/useWallet";
import { getWriteContract } from "../services/votingService";
import { txLink } from "../utils/explorer";
import { describeEvent } from "../utils/events";
import { percent, shortAddress, shortHash, timeAgo } from "../utils/format";

/**
 * Admin dashboard. The route is hidden for non-owners in the UI, but the real protection
 * is the onlyOwner modifier in Voting.sol: a forged request is rejected by the contract.
 */
export default function Admin() {
  const { account, connect } = useWallet();
  const { owner, isAdmin, election, loading } = useElection();

  if (!account)
    return (
      <Centered>
        <EmptyState icon={<ShieldCheck />} title="Admin access">
          Connect the wallet that deployed the contract (owner) to manage the election.
          <button onClick={connect} className="btn-primary mx-auto mt-5 flex">Connect Wallet</button>
        </EmptyState>
      </Centered>
    );

  if (!loading && owner && !isAdmin)
    return (
      <Centered>
        <EmptyState icon={<ShieldAlert />} title="Unauthorized">
          This page is restricted to the election admin. Connected wallet <span className="font-mono">{shortAddress(account)}</span> is not the contract owner (
          <span className="font-mono">{shortAddress(owner)}</span>). Admin functions are also enforced on-chain with <code>onlyOwner</code>.
          <Link to="/vote" className="btn-ghost mx-auto mt-5 flex w-fit">Go to voting</Link>
        </EmptyState>
      </Centered>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="Admin dashboard" title="Election control centre" subtitle="Every action below is a blockchain transaction signed by the contract owner." />
        {election && <div className="mb-8"><StatusPill phase={election.phase} /></div>}
      </div>
      <Stats />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ElectionControls />
        <AddCandidate />
        <RegisterVoters />
        <CandidateTable />
      </div>
      <EventFeed />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">{children}</div>;
}

function Stats() {
  const { election, candidates } = useElection();
  const e = election;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      <StatCard icon={<Flag size={18} />} label="Election" value={e && e.id ? `#${e.id}` : "—"} hint={e?.title || "Not created"} />
      <StatCard icon={<Users size={18} />} label="Registered voters" value={e?.registeredVoters ?? 0} />
      <StatCard icon={<Vote size={18} />} label="Votes cast" value={e?.totalVotes ?? 0} hint={`${percent(e?.totalVotes ?? 0, e?.registeredVoters ?? 0)}% turnout`} />
      <StatCard icon={<BarChart3 size={18} />} label="Candidates" value={candidates.length} />
    </div>
  );
}

function ElectionControls() {
  const { election } = useElection();
  const { runTx } = useTransactions();
  const [title, setTitle] = useState("Student Council Election 2026");
  const [duration, setDuration] = useState("0");
  const phase = election?.phase ?? "none";
  const canCreate = phase === "none" || phase === "ended";

  return (
    <GlassCard glow>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><Flag size={18} className="text-violet-300" /> Election lifecycle</h3>

      <div className="mt-4 space-y-2">
        <label className="text-sm text-slate-400">1 · Create election</label>
        <div className="flex gap-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Election title" disabled={!canCreate} />
          <button
            className="btn-primary shrink-0"
            disabled={!canCreate || !title.trim()}
            onClick={() => runTx("Create election", (s) => getWriteContract(s).createElection(title.trim()))}
          >
            Create
          </button>
        </div>
        {!canCreate && <p className="text-xs text-slate-500">End the current election before creating a new one.</p>}
      </div>

      <div className="mt-5 space-y-2">
        <label className="text-sm text-slate-400">2 · Start voting (optional duration in minutes, 0 = until ended manually)</label>
        <div className="flex gap-2">
          <input className="input" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} disabled={phase !== "setup"} />
          <button
            className="btn-primary shrink-0 !bg-none !bg-emerald-600 hover:!bg-emerald-500"
            disabled={phase !== "setup"}
            onClick={() => runTx("Start election", (s) => getWriteContract(s).startElection(BigInt(Math.max(0, Math.floor(Number(duration) || 0)) * 60)))}
          >
            <Play size={16} /> Start
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <label className="text-sm text-slate-400">3 · End election and freeze results</label>
        <button
          className="btn-ghost w-full !border-rose-400/30 !text-rose-200 hover:!bg-rose-500/10"
          disabled={phase !== "active" && phase !== "expired"}
          onClick={() => window.confirm("End the election? Voting will close permanently.") && runTx("End election", (s) => getWriteContract(s).endElection())}
        >
          <Square size={16} /> End election
        </button>
      </div>
    </GlassCard>
  );
}

function AddCandidate() {
  const { election } = useElection();
  const { runTx } = useTransactions();
  const [form, setForm] = useState({ name: "", party: "", manifesto: "" });
  const allowed = election?.phase === "setup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await runTx("Add candidate", (s) => getWriteContract(s).addCandidate(form.name.trim(), form.party.trim(), form.manifesto.trim()));
    if (ok) setForm({ name: "", party: "", manifesto: "" });
  };

  return (
    <GlassCard>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><PlusCircle size={18} className="text-violet-300" /> Add candidate</h3>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Candidate name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!allowed} required />
          <input className="input" placeholder="Party / group" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} disabled={!allowed} required />
        </div>
        <textarea className="input min-h-20" placeholder="Short manifesto" value={form.manifesto} onChange={(e) => setForm({ ...form, manifesto: e.target.value })} disabled={!allowed} maxLength={280} />
        <button className="btn-primary w-full" disabled={!allowed || !form.name.trim() || !form.party.trim()}>Add candidate on-chain</button>
        {!allowed && <p className="text-xs text-slate-500">Candidates can be added only after creating an election and before it starts.</p>}
      </form>
    </GlassCard>
  );
}

function RegisterVoters() {
  const { election } = useElection();
  const { runTx } = useTransactions();
  const [text, setText] = useState("");
  const addresses = useMemo(() => [...new Set(text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))], [text]);
  const invalid = addresses.filter((a) => !isAddress(a));
  const allowed = !!election && election.phase !== "none" && election.phase !== "ended";

  const submit = async () => {
    const ok = await runTx(
      addresses.length === 1 ? "Register voter" : `Register ${addresses.length} voters`,
      (s) => (addresses.length === 1 ? getWriteContract(s).registerVoter(addresses[0]) : getWriteContract(s).registerVoters(addresses))
    );
    if (ok) setText("");
  };

  return (
    <GlassCard>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><UserPlus size={18} className="text-violet-300" /> Register voters</h3>
      <p className="mt-1 text-sm text-slate-400">Paste one or more wallet addresses (comma, space or new line separated). A batch is a single transaction.</p>
      <textarea className="input mt-4 min-h-28 font-mono text-xs" placeholder={"0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"} value={text} onChange={(e) => setText(e.target.value)} disabled={!allowed} />
      {invalid.length > 0 && <p className="mt-2 text-xs text-rose-300">Invalid address: {invalid.slice(0, 2).join(", ")}{invalid.length > 2 ? "…" : ""}</p>}
      <button className="btn-primary mt-3 w-full" disabled={!allowed || addresses.length === 0 || invalid.length > 0} onClick={submit}>
        Register {addresses.length || ""} voter{addresses.length === 1 ? "" : "s"}
      </button>
      {!allowed && <p className="mt-2 text-xs text-slate-500">Create an election first. Registration closes when the election ends.</p>}
    </GlassCard>
  );
}

function CandidateTable() {
  const { candidates, election } = useElection();
  const total = election?.totalVotes ?? 0;
  return (
    <GlassCard>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><BarChart3 size={18} className="text-violet-300" /> Candidate vote counts</h3>
      {candidates.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No candidates yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">ID</th><th>Name</th><th>Party</th><th className="text-right">Votes</th><th className="text-right">%</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 font-mono text-slate-400">{c.id}</td>
                  <td className="text-white">{c.name}</td>
                  <td className="text-slate-400">{c.party}</td>
                  <td className="text-right font-mono text-white">{c.voteCount}</td>
                  <td className="text-right font-mono text-slate-400">{percent(c.voteCount, total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

function EventFeed() {
  const { events, loading } = useChainEvents();
  return (
    <GlassCard className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><Activity size={18} className="text-violet-300" /> Transaction history / events</h3>
        <Link to="/explorer" className="text-sm text-violet-300 hover:underline">Open explorer →</Link>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No events yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {events.slice(0, 12).map((e) => (
            <li key={`${e.txHash}-${e.logIndex}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="flex items-center gap-3">
                <span className="rounded-md bg-violet-500/15 px-2 py-0.5 font-mono text-xs text-violet-200">{e.name}</span>
                <span className="text-slate-400">{describeEvent(e.name, e.args)}</span>
              </span>
              <span className="flex items-center gap-3 text-xs text-slate-500">
                #{e.blockNumber} · {timeAgo(e.timestamp)}
                <ExplorerLink href={txLink(e.txHash)} className="font-mono">{shortHash(e.txHash)}</ExplorerLink>
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
