import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, ChevronDown, Leaf, LockKeyhole, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Button, Input, PasswordInput } from "@/components/ui/Primitives";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/auth";
import { demoUsers } from "@/data/mockAuth";

const officeLocations = [
  {
    name: "Bangladesh Office",
    address: [
      "Saleh Tower (7th Floor), Plot No. 1,",
      "Road No. 13, Sector No. 13,",
      "Uttara Model Town, DHAKA-1230, Bangladesh.",
    ],
    phone: "+8801974687119",
    email: "info@ecoassurance.org",
  },
  {
    name: "United Kingdom Office",
    address: ["128 City Road,", "London EC1V 2NX,", "United Kingdom."],
    phone: "+447988584827",
    email: "info@ecoassurance.org",
  },
  {
    name: "Myanmar Office",
    phone: "+959785496660",
    email: "myanmar@ecoassurance.org",
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("jisan.khan@ecoassurance.org");
  const [password, setPassword] = useState("demo123");
  const [role, setRole] = useState<UserRole>("Super Admin");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    if (password === "invalid") {
      setError("We could not sign you in with those details.");
      return;
    }
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await login(role, remember);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from || "/dashboard", { replace: true });
  };

  return (
    <div id="login-page" className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-rows-1 lg:grid-cols-[minmax(320px,38%)_minmax(0,1fr)]">
      <style>{`@media (min-height: 760px) and (max-width: 1023px) { #login-page .login-content-stack { justify-content: center; } }`}</style>
      <aside className="flex min-h-0 flex-col justify-center overflow-hidden bg-[var(--ea-primary)] px-3 py-1.5 text-white lg:h-full lg:justify-between lg:px-7 lg:py-8 xl:px-10 xl:py-9">
        <div className="w-full max-w-md text-center lg:text-left">
          <img
            src="/ecoassurance-logo.png"
            alt="EcoAssurance official logo"
            className="mx-auto mb-0.5 h-auto w-[110px] object-contain sm:w-[120px] lg:mx-0 lg:mb-2 lg:w-[176px] xl:w-[190px]"
            width="350"
            height="67"
          />
          <p className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[.16em] text-[var(--ea-accent)] lg:justify-start lg:text-[10px] lg:tracking-[.18em]">
            <span className="h-px w-5 bg-[var(--ea-accent)] lg:w-7" />Sustainability, assured
          </p>
          <h2 className="mt-0.5 max-w-none font-display text-[13px] font-extrabold leading-4 tracking-[-.035em] lg:mt-7 lg:max-w-[11ch] lg:text-[clamp(2.2rem,3.6vw,3.6rem)] lg:leading-[1.02] lg:tracking-[-.06em]">
            Confidence in every <span className="text-[var(--ea-accent)]">decision.</span>
          </h2>
          <p className="mt-0.5 max-w-none text-[8px] leading-3 text-white/75 lg:mt-4 lg:max-w-sm lg:text-xs lg:leading-5 lg:text-white/70">
            A connected workspace for certification teams, auditors and businesses building better systems.
          </p>
        </div>
        <div className="hidden lg:block">
          <div className="mb-5 grid max-w-sm grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[.05] p-3">
              <ShieldCheck className="h-4 w-4 text-[var(--ea-accent)]" />
              <p className="mt-3 text-[9px] text-white/55">Trusted workflows</p>
              <p className="mt-0.5 font-display text-base font-bold">1,240+</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[.05] p-3">
              <Leaf className="h-4 w-4 text-[var(--ea-accent)]" />
              <p className="mt-3 text-[9px] text-white/55">Regions connected</p>
              <p className="mt-0.5 font-display text-base font-bold">03 countries</p>
            </div>
          </div>
          <p className="text-[9px] text-white/45">© 2026 EcoAssurance. Built for responsible growth.</p>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-[var(--ea-background)] px-3 py-1.5 sm:px-5 sm:py-2 lg:h-full lg:px-6 xl:px-8">
        <header className="flex h-4 shrink-0 items-center justify-end">
          <Link to="/" className="flex items-center gap-1 text-[10px] font-semibold text-[var(--ea-text-soft)] transition hover:text-[var(--ea-primary)]">
            EcoAssurance Portal <ArrowRight className="h-3 w-3" />
          </Link>
        </header>

        <div className="login-content-stack mx-auto flex min-h-0 w-full max-w-[900px] flex-1 flex-col justify-start gap-1 py-0.5 lg:justify-center lg:gap-2">
          <div className="mx-auto w-full max-w-[430px] shrink-0">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--ea-secondary)]">Welcome Back</p>
              <h1 className="mt-0.5 font-display text-[21px] font-extrabold leading-tight tracking-[-.045em] text-[var(--ea-primary)] sm:text-[24px] lg:text-[26px]">
                Sign in to your workspace
              </h1>
              <p className="login-description mt-1 hidden text-[11px] leading-4 text-[var(--ea-text-soft)] sm:block">
                Access your certification, audit and compliance activities in one place.
              </p>
            </div>

            <form onSubmit={submit} className="mt-2.5 space-y-1.5">
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-bold text-[var(--ea-text)]">Email address <span className="text-[var(--ea-danger)]">*</span></span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ea-text-soft)]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="!h-9 !px-3 !pl-9 !text-xs"
                    placeholder="you@company.com"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-bold text-[var(--ea-text)]">Password <span className="text-[var(--ea-danger)]">*</span></span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ea-text-soft)]" />
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="!h-9 !pl-9 !text-xs"
                  />
                </div>
              </label>
              <div className="flex min-h-5 items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--ea-text-soft)]">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--ea-primary)]" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-[var(--ea-secondary)] hover:text-[var(--ea-primary)]">Forgot password?</Link>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--ea-surface-soft)] p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ea-secondary)]">Demo workspace role</span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[8px] font-bold text-[var(--ea-text-soft)]">Frontend demo</span>
                </div>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as UserRole);
                      const user = demoUsers.find((item) => item.role === e.target.value);
                      if (user) setEmail(user.email);
                    }}
                    className="ea-focus h-8 w-full appearance-none rounded-md border border-[var(--border)] bg-white px-2.5 pr-8 text-[11px] font-semibold text-[var(--ea-primary)] outline-none"
                  >
                    <option value="">Select role</option>
                    {demoUsers.map((user) => <option key={user.role} value={user.role}>{user.role}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ea-text-soft)]" />
                </div>
              </div>
              {error && <div className="rounded-lg border border-[var(--ea-danger-soft)] bg-[var(--ea-danger-soft)] px-2.5 py-2 text-[10px] font-semibold text-[var(--ea-danger)]">{error}</div>}
              <Button type="submit" size="sm" loading={loading} className="!h-9 w-full">Sign in <ArrowRight className="h-3.5 w-3.5" /></Button>
            </form>

            <div className="mt-1 flex items-center gap-1.5 border-t border-[var(--border)] pt-1 text-[8px] leading-3 text-[var(--ea-text-soft)]">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--ea-success-soft)] text-[var(--ea-success)]"><Check className="h-2 w-2" /></span>
              Demo authentication only. Real access control will be enforced by the Laravel backend.
            </div>
          </div>

          <section aria-labelledby="office-locations-title" className="w-full shrink-0">
            <div className="mb-1 flex items-center justify-between">
              <h2 id="office-locations-title" className="font-display text-[13px] font-extrabold tracking-[-.025em] text-[var(--ea-primary)] sm:text-sm">Office Locations</h2>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-1.5 lg:grid-cols-3">
              {officeLocations.map((office) => (
                <article key={office.name} className="min-w-0 rounded-lg border border-[var(--border)] bg-white p-1.5 shadow-[var(--shadow-soft)] sm:p-2.5 lg:p-3">
                  <h3 className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold leading-3.5 text-[var(--ea-primary)] sm:text-xs sm:leading-4">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--ea-secondary)]" />
                    <span className="min-w-0 break-words">{office.name}</span>
                  </h3>
                  {office.address && (
                    <address className="mt-0.5 min-w-0 break-words text-[9.5px] not-italic leading-3 text-[var(--ea-text-soft)] sm:mt-1.5 sm:text-[11px] sm:leading-4">
                      {office.address.join(" ")}
                    </address>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] leading-3 sm:mt-2 sm:gap-x-3 sm:border-t sm:border-[var(--border)] sm:pt-1.5 sm:text-[10px] sm:leading-4">
                    <a href={`tel:${office.phone}`} className="flex min-w-0 items-center gap-1 text-[var(--ea-text)] hover:text-[var(--ea-secondary)]">
                      <Phone aria-hidden="true" className="h-2.5 w-2.5 shrink-0 text-[var(--ea-secondary)]" />
                      <span className="min-w-0 whitespace-nowrap">{office.phone}</span>
                    </a>
                    <a href={`mailto:${office.email}`} className="flex min-w-0 items-center gap-1 text-[var(--ea-text)] hover:text-[var(--ea-secondary)]">
                      <Mail aria-hidden="true" className="h-2.5 w-2.5 shrink-0 text-[var(--ea-secondary)]" />
                      <span className="min-w-0 whitespace-nowrap">{office.email}</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-center gap-1.5 pt-1 text-[9px] leading-3 text-[var(--ea-text-soft)]">
          <CheckCircle2 className="h-3 w-3 shrink-0 text-[var(--ea-success)]" />
          Secure workspace access · Demo environment
        </footer>
      </section>
    </div>
  );
}
