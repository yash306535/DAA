import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { CONTRACT_CONFIG } from "../contracts/config";
import { addressLink, blockLink, txLink } from "../utils/explorer";
import { formatDateTime, shortAddress, shortHash } from "../utils/format";
import { CopyButton, ExplorerLink } from "./ui";

export interface TxRow {
  hash: string;
  blockNumber?: number | null;
  status: "success" | "failed" | "pending";
  timestamp?: number;
  from?: string;
  to?: string | null;
}

/** Standard block of transaction facts shown everywhere a transaction appears. */
export default function TxDetails({ tx, compact = false }: { tx: TxRow; compact?: boolean }) {
  const status =
    tx.status === "success" ? (
      <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={14} /> Success</span>
    ) : tx.status === "failed" ? (
      <span className="inline-flex items-center gap-1 text-rose-300"><XCircle size={14} /> Failed</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-amber-300"><Clock size={14} /> Pending</span>
    );

  const rows: [string, React.ReactNode][] = [
    [
      "Transaction hash",
      <span className="flex items-center gap-1 font-mono">
        {compact ? shortHash(tx.hash) : <span className="break-all">{tx.hash}</span>} <CopyButton text={tx.hash} />
      </span>,
    ],
    ["Block number", tx.blockNumber != null ? <ExplorerLink href={blockLink(tx.blockNumber)} className="font-mono">#{tx.blockNumber}</ExplorerLink> : "—"],
    ["Status", status],
    ["Timestamp", formatDateTime(tx.timestamp)],
    ["From", tx.from ? <ExplorerLink href={addressLink(tx.from)} className="font-mono">{shortAddress(tx.from)}</ExplorerLink> : "—"],
    ["Contract", <ExplorerLink href={addressLink(tx.to ?? CONTRACT_CONFIG.address)} className="font-mono">{shortAddress(tx.to ?? CONTRACT_CONFIG.address)}</ExplorerLink>],
  ];

  return (
    <div className="space-y-3">
      <dl className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/20 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-3 py-2">
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className="text-right text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
      <ExplorerLink href={txLink(tx.hash)} className="btn-ghost w-full !text-violet-200">
        View on Explorer
      </ExplorerLink>
    </div>
  );
}
