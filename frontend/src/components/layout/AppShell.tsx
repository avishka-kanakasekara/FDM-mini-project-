import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";

import { useServiceStatus } from "../../hooks/useServiceStatus";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { health, state } = useServiceStatus();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar open={open} onNavigate={() => setOpen(false)} state={state} health={health} />
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/60 bg-white/75 px-4 py-3 backdrop-blur-xl lg:hidden">
          <p className="font-serif text-xl tracking-tight">BankReach</p>
          <button
            type="button"
            className="rounded-xl border border-line bg-white p-2 shadow-sm"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={18} />
            <span className="sr-only">Open navigation</span>
          </button>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
