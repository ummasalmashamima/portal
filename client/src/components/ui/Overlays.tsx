import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Popover({ open, onClose, children, className = "" }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(); const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }; document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick); return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); }; }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className={`ea-fade absolute z-50 ${className}`}>{children}</div>;
}

export function Drawer({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => { if (!open) return; const old = document.body.style.overflow; document.body.style.overflow = "hidden"; const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", onKey); return () => { document.body.style.overflow = old; document.removeEventListener("keydown", onKey); }; }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex"><button className="absolute inset-0 bg-[rgba(16,45,38,.44)] ea-fade" aria-label="Close drawer" onClick={onClose} /><aside className="relative ml-auto flex h-full w-[min(88vw,380px)] flex-col bg-white shadow-[-18px_0_45px_rgba(26,60,52,.14)] ea-rise"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><h2 className="font-display text-sm font-extrabold text-[var(--ea-primary)]">{title}</h2><button className="rounded-lg p-2 text-[var(--ea-text-soft)] hover:bg-[var(--ea-surface-soft)]" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button></div><div className="ea-scrollbar flex-1 overflow-y-auto">{children}</div></aside></div>;
}
