import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, children, dismissible = true }: { open: boolean; onClose: () => void; children: ReactNode; dismissible?: boolean }) {
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} />
      <div className="glass gradient-border relative w-full max-w-md animate-fade-up p-6">
        {dismissible && (
          <button onClick={onClose} className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
