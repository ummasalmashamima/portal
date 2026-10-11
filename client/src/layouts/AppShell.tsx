import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Topbar } from "@/components/navigation/Topbar";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100vh] overflow-hidden bg-[var(--ea-background)]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed(!collapsed)}
        onClose={() => setMobileOpen(false)}
      />
      <div className={`flex h-full min-w-0 flex-1 flex-col ${collapsed ? "lg:ml-[76px]" : "lg:ml-[258px]"}`}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="ea-app-grid min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[rgba(16,45,38,.42)] lg:hidden"
        />
      )}
    </div>
  );
}
