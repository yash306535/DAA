import { Vote, ShieldAlert } from "lucide-react";
import Modal from "./Modal";
import { Avatar } from "./ui";
import type { Candidate } from "../types";

export default function ConfirmVoteModal({ candidate, onConfirm, onCancel }: { candidate: Candidate | null; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={!!candidate} onClose={onCancel}>
      {candidate && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">Confirm your vote</p>
          <p className="mt-3 text-slate-300">You are about to cast your vote for:</p>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <Avatar name={candidate.name} size={52} />
            <div>
              <p className="font-display text-lg font-semibold text-white">{candidate.name}</p>
              <p className="text-sm text-slate-400">
                {candidate.party} · Candidate #{candidate.id}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p>
              This transaction will be recorded on the blockchain.
              <br />
              <b>Your vote cannot be changed after confirmation.</b>
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={onCancel} className="btn-ghost flex-1">
              Cancel
            </button>
            <button onClick={onConfirm} className="btn-primary flex-1">
              <Vote size={18} /> Confirm Vote
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
