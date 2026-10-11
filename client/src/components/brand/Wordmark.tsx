import { Leaf } from "lucide-react";

export function Wordmark({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${inverse ? "text-white" : "text-[var(--ea-primary)]"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${inverse ? "bg-white/10 text-white" : "bg-[var(--ea-accent-soft)] text-[var(--ea-secondary)]"}`}>
        <Leaf className="h-[18px] w-[18px]" />
      </span>
      {!compact && <span className="leading-tight"><span className="block font-display text-sm font-extrabold tracking-[-.03em]">EcoAssurance</span><span className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-[.16em] ${inverse ? "text-white" : "text-[var(--ea-text-soft)]"}`}>Certification &amp; audit</span></span>}
    </span>
  );
}
