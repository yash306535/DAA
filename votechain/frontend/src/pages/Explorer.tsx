import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Blocks, Search, X } from "lucide-react";
import TxDetails from "../components/TxDetails";
import { CopyButton, GlassCard, SectionTitle, Skeleton } from "../components/ui";
import { CONTRACT_CONFIG } from "../contracts/config";
import { useChainEvents } from "../hooks/useChainEvents";
import { useTransactions } from "../hooks/useTransactions";
import { fetchTxDetails, type TxDetails as TxInfo } from "../services/votingService";
import { hasPublicExplorer, txLink } from "../utils/explorer";
import { describeEvent } from "../utils/events";
import { formatDateTime, shortAddress, shortHash } from "../utils/format";
import { parseError } from "../utils/errors";

const FILTERS = ["All", "VoteCast", "VoterRegistered", "CandidateAdded", "ElectionCreated", "ElectionStarted", "ElectionEnded"];

/**
 * Built-in blockchain explorer. Lists every event of the Voting contract and shows full
 * transaction details. On Sepolia the "View on Explorer" links go to Etherscan instead.
 */
export default function Explorer() {
  const [params, setParams] = useSearchParams();
  const { events, loading, error } = useChainEvents();
  const { transactions } = useTransactions();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState(params.get("tx") ?? "");
  const [detail, setDetail] = useState<TxInfo | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedTx = params.get("tx");
  const addressFilter = params.get("address")?.toLowerCase();
  const blockFilter = params.get("block");

  useEffect(() => {
    if (!selectedTx) { setDetail(null); setDetailErr(null); return; }
    setDetailLoading(true);
    fetchTxDetails(selectedTx)
      .then((d) => { setDetail(d); setDetailErr(d ? null : "Transaction not found on this network."); })
      .catch((e) => setDetailErr(parseError(e)))
      .finally(() => setDetailLoading(false));
  }, [selectedTx]);

  const visible = useMemo(
    () =>
      events.filter(
        (e) =>
          (filter === "All" || e.name === filter) &&
          (!addressFilter || e.from?.toLowerCase() === addressFilter || Object.values(e.args).some((v) => v.toLowerCase() === addressFilter)) &&
          (!blockFilter || e.blockNumber === Number(blockFilter))
      ),
    [events, filter, addressFilter, blockFilter]
  );

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(q)) setParams({ tx: q });
    else if (/^0x[0-9a-fA-F]{40}$/.test(q)) setParams({ address: q });
    else if (/^\d+$/.test(q)) setParams({ block: q });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionTitle
        eyebrow="Blockchain explorer"
        title="Every action, on the record"
        subtitle={
          <>
            All events emitted by the Voting contract <span className="font-mono text-slate-300">{shortAddress(CONTRACT_CONFIG.address)}</span>
            <CopyButton text={CONTRACT_CONFIG.address} /> on {CONTRACT_CONFIG.chainName}.{" "}
            {hasPublicExplorer() ? "Links open the public block explorer." : "Local chain: details are fetched directly from the node."}
          </>
        }
      />

      <form onSubmit={search} className="glass mb-6 flex items-center gap-2 !rounded-2xl p-2">
        <Search size={18} className="ml-2 text-slate-500" />
        <input className="flex-1 bg-transparent px-2 py-2 font-mono text-sm outline-none placeholder:text-slate-600" placeholder="Search by tx hash, address or block number" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn-primary !py-2 text-sm">Search</button>
      </form>

      {(selectedTx || addressFilter || blockFilter) && (
        <div className="mb-6">
          <button onClick={() => { setParams({}); setQuery(""); }} className="btn-ghost !py-1.5 text-sm"><X size={14} /> Clear: {selectedTx ? `tx ${shortHash(selectedTx)}` : addressFilter ? `address ${shortAddress(addressFilter)}` : `block #${blockFilter}`}</button>
        </div>
      )}

      {selectedTx && (
        <GlassCard glow className="mb-6">
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Transaction details</h3>
          {detailLoading ? <Skeleton className="h-48" /> : detailErr ? <p className="text-sm text-rose-300">{detailErr}</p> : detail && (
            <div className="grid gap-6 lg:grid-cols-2">
              <TxDetails tx={detail} />
              <div className="space-y-3 text-sm">
                <p className="text-slate-500">Method</p>
                <p className="font-mono text-violet-200">{detail.method ?? "—"}</p>
                <p className="text-slate-500">Gas used</p>
                <p className="font-mono text-slate-200">{detail.gasUsed ?? "—"}</p>
                <p className="text-slate-500">Events emitted</p>
                {detail.events.length ? detail.events.map((e) => <p key={e} className="break-all rounded-lg bg-black/30 p-2 font-mono text-xs text-slate-300">{e}</p>) : <p>—</p>}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {transactions.some((t) => t.hash) && (
        <GlassCard className="mb-6">
          <h3 className="mb-3 font-display text-lg font-semibold text-white">Your transactions (this session)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {transactions.filter((t) => t.hash).map((t) => (
              <div key={t.createdAt}>
                <p className="mb-2 text-sm font-medium text-slate-300">{t.label}</p>
                <TxDetails compact tx={{ hash: t.hash!, blockNumber: t.blockNumber, status: t.state === "confirmed" ? "success" : t.state === "failed" ? "failed" : "pending", timestamp: t.timestamp, from: t.from }} />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-violet-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>{f}</button>
        ))}
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        {error && <p className="p-5 text-sm text-rose-300">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.03] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Event</th><th>Tx hash</th><th>Block</th><th>Status</th><th>Timestamp</th><th>From</th><th>Contract</th><th />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={8} className="px-5 py-3"><Skeleton className="h-6" /></td></tr>)
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500"><Blocks className="mx-auto mb-2" />No matching events</td></tr>
              ) : (
                visible.map((e) => (
                  <tr key={`${e.txHash}-${e.logIndex}`} className="transition hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-violet-500/15 px-2 py-0.5 font-mono text-xs text-violet-200">{e.name}</span>
                      <p className="mt-1 text-xs text-slate-500">{describeEvent(e.name, e.args)}</p>
                    </td>
                    <td className="font-mono text-slate-300">{shortHash(e.txHash)}</td>
                    <td className="font-mono text-slate-300">#{e.blockNumber}</td>
                    <td><span className="text-emerald-300">Success</span></td>
                    <td className="text-slate-400">{formatDateTime(e.timestamp)}</td>
                    <td className="font-mono text-slate-300">{shortAddress(e.from)}</td>
                    <td className="font-mono text-slate-400">{shortAddress(CONTRACT_CONFIG.address)}</td>
                    <td className="pr-5 text-right">
                      {hasPublicExplorer() ? (
                        <a className="text-xs text-violet-300 hover:underline" href={txLink(e.txHash)} target="_blank" rel="noreferrer">View on Explorer</a>
                      ) : (
                        <button className="text-xs text-violet-300 hover:underline" onClick={() => { setParams({ tx: e.txHash }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>View on Explorer</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
