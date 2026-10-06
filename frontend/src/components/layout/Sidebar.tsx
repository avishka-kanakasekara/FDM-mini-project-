import { BarChart3, ClipboardList, Compass, FileSpreadsheet, LayoutDashboard, Sparkles, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import type { ServiceState } from "../../hooks/useServiceStatus";
import type { HealthResponse } from "../../types/prediction";
import { useAuth } from "../../auth/AuthProvider";
import { useCallList } from "../../campaign/callList";

const LINKS = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/predict", label: "Prediction", icon: Sparkles },
  { to: "/campaign-file", label: "Campaign file", icon: FileSpreadsheet },
  { to: "/call-list", label: "Call list", icon: ClipboardList },
  { to: "/how-it-works", label: "How It Works", icon: Compass },
  { to: "/model", label: "Model Insights", icon: BarChart3 },
];

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
  state: ServiceState;
  health: HealthResponse | null;
}

export function Sidebar({ open, onNavigate, state, health }: SidebarProps) {
  const { items } = useCallList();
  const { user, signOut } = useAuth();
  const statusText =
    state === "loading"
      ? "Checking prediction service"
      : state === "online"
        ? "Prediction service operational"
        : "Prediction service unavailable";

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-spruce-deep/55 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
          onClick={onNavigate}
        />
      ) : null}
      <aside
        id="primary-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gradient-to-b from-[#12352e] via-spruce to-spruce-deep text-[#e7efe9] shadow-2xl shadow-black/20 transition-transform lg:static lg:w-auto lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_20%_0%,rgba(215,176,122,0.28),transparent_55%)]" />
        <div className="relative flex items-start justify-between px-5 pb-7 pt-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#f3d7a4] to-[#c48945] font-serif text-xl text-spruce-deep shadow-lg shadow-black/20">
              B
            </span>
            <div>
              <p className="font-serif text-2xl leading-none tracking-tight text-white">BankReach</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Campaign desk</p>
            </div>
          </div>
          <button type="button" className="relative rounded-lg p-1 text-white lg:hidden" onClick={onNavigate} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="relative flex-1 px-3" aria-label="Primary">
          <ul className="space-y-1.5">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-white/12 text-white shadow-inner shadow-white/5 ring-1 ring-white/15"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-xl ${
                            isActive ? "bg-[#d7b07a] text-spruce-deep" : "bg-white/8 text-white/80"
                          }`}
                        >
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        {link.label}
                        {link.to === "/call-list" && items.length > 0 ? (
                          <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-xs">{items.length}</span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative mx-4 mb-3 rounded-2xl border border-white/10 bg-white/8 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Signed in</p>
          <p className="mt-2 text-sm font-semibold text-white">{user?.name}</p>
          <p className="mt-1 truncate text-xs text-white/65">{user?.email}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-[#f0d3a4] underline-offset-4 hover:underline"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </button>
        </div>
        <div className="relative m-4 mt-0 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">System status</p>
          <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-white">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                state === "online"
                  ? "bg-[#7ddea8] shadow-[0_0_10px_rgba(125,222,168,0.8)]"
                  : state === "loading"
                    ? "bg-[#d7b07a]"
                    : "bg-[#e7a39a]"
              }`}
              aria-hidden="true"
            />
            <span>{statusText}</span>
          </p>
          <p className="mt-2 text-xs leading-5 text-white/65">
            {state === "online"
              ? `Model loaded · ${health?.model_name ?? "Logistic Regression"}`
              : state === "offline"
                ? "Prediction failed to connect. Scores are unavailable until the API responds."
                : "Waiting for the health check."}
          </p>
        </div>
      </aside>
    </>
  );
}
