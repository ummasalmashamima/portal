import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { navigationItems } from "@/data/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps { collapsed: boolean; mobileOpen: boolean; onToggle: () => void; onClose: () => void; }

export function Sidebar({ collapsed, mobileOpen, onToggle, onClose }: SidebarProps) {
  const { can, session, logout } = useAuth();
  const visibleItems = navigationItems.filter((item) => can(item.permission));
  return <>
    <aside className={`fixed left-0 top-0 z-50 flex h-[100vh] flex-col overflow-hidden border-r border-white/10 bg-[var(--ea-primary)] transition-[width,transform] duration-200 lg:z-30 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${collapsed ? "w-[76px]" : "w-[258px]"}`}>
      <div className={`flex h-[78px] shrink-0 border-b border-white/10 ${collapsed ? "flex-col items-center justify-center gap-1 px-3" : "flex-row items-center justify-between px-5"}`}>
        <img
          src="/ecoassurance-logo.png"
          alt="EcoAssurance official logo"
          className={`h-auto max-w-full shrink-0 object-contain ${collapsed ? "w-[48px]" : "w-[176px]"}`}
          width="350"
          height="67"
        />
        <button type="button" aria-label={mobileOpen ? "Close navigation" : collapsed ? "Expand navigation" : "Collapse navigation"} onClick={mobileOpen ? onClose : onToggle} className="hidden h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10 hover:text-white lg:flex">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Close navigation" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10 hover:text-white lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <div className={`px-4 pt-5 ${collapsed ? "text-center" : ""}`}><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white">{collapsed ? "EA" : "Workspace"}</p></div>
      <nav aria-label="Main navigation" className="ea-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {visibleItems.map(({ label, path, icon: Icon, soon }) => <NavLink key={path} to={path} end={path === "/dashboard"} onClick={onClose} title={collapsed ? label : undefined} className={({ isActive }) => `group flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition ${collapsed ? "justify-center px-2" : ""} ${isActive ? "bg-white/15 text-white" : "text-white hover:bg-white/10"}`} style={{ color: "#FFFFFF" }}>
          <Icon className="h-[17px] w-[17px] shrink-0" /><span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{label}</span>{soon && !collapsed && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">Soon</span>}
        </NavLink>)}
      </nav>
      <div className={`shrink-0 border-t border-white/10 px-3 pt-3 pb-14 ${collapsed ? "flex flex-col items-center gap-2" : "space-y-2"}`}>
        {collapsed ? <span title={session?.user.role} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-[10px] font-extrabold text-white">{session?.user.initials ?? "EA"}</span> : <div className="rounded-lg bg-white/10 px-3 py-2.5"><p className="truncate text-xs font-bold text-white">{session?.user.name ?? "Workspace user"}</p><p className="mt-1 truncate text-[10px] text-white">{session?.user.role ?? ""}</p></div>}
        <button
          type="button"
          onClick={() => { logout(); onClose(); }}
          aria-label="Sign Out"
          title={collapsed ? "Sign Out" : undefined}
          className={`flex min-h-9 shrink-0 items-center rounded-lg border border-white/20 bg-white/10 text-xs font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${collapsed ? "h-9 w-9 justify-center p-0" : "w-full gap-3 px-3 py-2"}`}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : "min-w-0"}>Sign Out</span>
        </button>
      </div>
    </aside>
  </>;
}
