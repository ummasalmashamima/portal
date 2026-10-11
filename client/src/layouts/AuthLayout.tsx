import { Outlet, Link, useLocation } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Leaf, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";

export function AuthLayout() {
  const isLoginRoute = useLocation().pathname === "/login";
  if (isLoginRoute) {
    return (
      <main className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-[var(--ea-background)]">
        <Outlet />
      </main>
    );
  }

  return <main className="min-h-screen bg-[var(--ea-background)] lg:grid lg:grid-cols-[minmax(420px,44%)_1fr]">
    <section className="relative hidden overflow-hidden bg-[var(--ea-primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="absolute -right-32 -top-32 h-[430px] w-[430px] rounded-full border border-white/10" /><div className="absolute -right-16 -top-16 h-[300px] w-[300px] rounded-full border border-white/10" /><div className="absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full border border-white/10" />
      <div className="relative z-10"><Wordmark inverse /><div className="mt-20 max-w-md"><p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--ea-accent)]"><span className="h-px w-8 bg-[var(--ea-accent)]" />Sustainability, assured</p><h1 className="font-display text-[clamp(2.5rem,4vw,4.5rem)] font-extrabold leading-[.98] tracking-[-.065em]">Confidence in every <span className="text-[var(--ea-accent)]">decision.</span></h1><p className="mt-7 max-w-sm text-sm leading-6 text-white/64">A connected workspace for certification teams, auditors and businesses building better systems.</p></div></div>
      <div className="relative z-10 grid max-w-md grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm"><ShieldCheck className="h-5 w-5 text-[var(--ea-accent)]" /><p className="mt-8 text-[11px] text-white/55">Trusted workflows</p><p className="mt-1 font-display text-lg font-bold">1,240+</p></div><div className="rounded-xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm"><Leaf className="h-5 w-5 text-[var(--ea-accent)]" /><p className="mt-8 text-[11px] text-white/55">Regions connected</p><p className="mt-1 font-display text-lg font-bold">03 countries</p></div></div>
      <p className="relative z-10 text-[11px] text-white/40">© 2026 EcoAssurance. Built for responsible growth.</p>
    </section>
    <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-10 lg:bg-[var(--ea-background)] lg:px-12 xl:px-20"><div className="flex items-center justify-between lg:justify-end"><div className="lg:hidden"><Wordmark compact /></div><Link to="/" className="flex items-center gap-1 text-xs font-semibold text-[var(--ea-text-soft)] transition hover:text-[var(--ea-primary)]">EcoAssurance Portal <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="flex flex-1 items-center justify-center py-10"><div className="w-full max-w-[430px]"><Outlet /></div></div><div className="flex items-center justify-center gap-2 text-[11px] text-[var(--ea-text-soft)]"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--ea-success)]" />Secure workspace access · Demo environment</div></section>
  </main>;
}
