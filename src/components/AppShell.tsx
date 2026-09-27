import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Waves,
  FlaskConical,
  PlayCircle,
  ListChecks,
  Siren,
  GitCompareArrows,
  Map as MapIcon,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  Radio,
  Info,
} from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store/useAppStore";
import { DAM } from "../data/demoData";

const NAV = [
  { to: "/", label: "Command Center", icon: LayoutDashboard },
  { to: "/dams", label: "Dam & Study Areas", icon: Waves },
  { to: "/scenario-lab", label: "Scenario Lab", icon: FlaskConical },
  { to: "/simulation", label: "Live Simulation", icon: PlayCircle },
  { to: "/impact", label: "Impact Analysis", icon: ListChecks },
  { to: "/priorities", label: "Risk Priorities", icon: Siren },
  { to: "/comparison", label: "Scenario Comparison", icon: GitCompareArrows },
  { to: "/gis", label: "GIS Explorer", icon: MapIcon },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "System Settings", icon: SettingsIcon },
];

export default function AppShell() {
  const navigate = useNavigate();
  const { userName, logout } = useAppStore();

  return (
    <div className="flex h-screen w-screen bg-base-950 overflow-hidden">
      <aside className="w-60 shrink-0 bg-base-900 border-r border-base-700 flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-base-700">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-base-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-extrabold text-white tracking-tight">AegisFlow</div>
            <div className="text-[9.5px] text-slate-500 tracking-wide">DECISION SUPPORT</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-accent/12 text-accent border border-accent/25"
                    : "text-slate-400 hover:text-slate-100 hover:bg-base-800 border border-transparent"
                )
              }
            >
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/about"
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                isActive ? "bg-accent/12 text-accent border border-accent/25" : "text-slate-400 hover:text-slate-100 hover:bg-base-800 border border-transparent"
              )
            }
          >
            <Info size={16} strokeWidth={2} />
            Methodology
          </NavLink>
        </nav>

        <div className="border-t border-base-700 p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Radio size={12} className="text-safe" />
            <span>Local simulation demo ready</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-warn">
            <span className="w-1.5 h-1.5 rounded-full bg-warn" />
            <span>Demo dataset loaded — {DAM.id}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-base-700">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-base-700 flex items-center justify-center text-[11px] font-bold text-slate-300 shrink-0">
                {userName ? userName.slice(0, 2).toUpperCase() : "AU"}
              </div>
              <div className="text-xs text-slate-300 truncate">{userName || "Authority User"}</div>
            </div>
            <button
              title="Logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="p-1.5 rounded-md text-slate-500 hover:text-crit hover:bg-crit/10 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
