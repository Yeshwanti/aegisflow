import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, Waves, Activity, MapPinned } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { Button } from "../components/ui";

export default function Login() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (login(email, password)) {
      navigate("/");
    } else {
      setError("Invalid credentials. Use the demo authority account shown below.");
    }
  }

  function demoAccess() {
    login("authority@aegisflow.local", "Aegis@2026");
    navigate("/");
  }

  return (
    <div className="min-h-screen w-full bg-base-950 flex relative overflow-hidden">
      <div className="absolute inset-0 scanline-bg opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-accent-dim/10 rounded-full blur-3xl" />

      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 border-r border-base-700 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center">
            <ShieldCheck size={22} className="text-base-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-extrabold text-white tracking-tight">AegisFlow</div>
            <div className="text-[10px] text-slate-500 tracking-widest">DISASTER DECISION SUPPORT</div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Dynamic Dam-Break
            <br />
            Inundation Intelligence
          </h1>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Scenario-based hydrodynamic simulation, GIS exposure analysis and transparent risk
            prioritization for dam-break disaster preparedness and response planning.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-10 max-w-md">
            {[
              { icon: Waves, label: "Hydrodynamic\nSimulation" },
              { icon: MapPinned, label: "GIS Exposure\nAnalysis" },
              { icon: Activity, label: "Risk\nPrioritization" },
            ].map((f) => (
              <div key={f.label} className="bg-base-850/60 border border-base-700 rounded-lg p-3.5">
                <f.icon size={18} className="text-accent mb-2" />
                <div className="text-[11px] text-slate-400 leading-snug whitespace-pre-line">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-600">
          Smart India Hackathon 2026 · Problem Statement SIH26161 · Prototype Build
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center">
              <ShieldCheck size={18} className="text-base-950" strokeWidth={2.5} />
            </div>
            <div className="text-lg font-extrabold text-white">AegisFlow</div>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Authority Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Access the disaster decision-support console</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email / Username</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="authority@aegisflow.local"
                className="w-full bg-base-850 border border-base-600 rounded-md px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-base-850 border border-base-600 rounded-md px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="text-xs text-crit bg-crit/10 border border-crit/25 rounded-md px-3 py-2">{error}</div>}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-accent" />
                Remember me
              </label>
              <span className="text-slate-600">Local authentication (prototype)</span>
            </div>

            <Button type="submit" className="w-full" size="md">
              Sign In
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={demoAccess}>
              Launch Demonstration Access
            </Button>
          </form>

          <div className="mt-6 bg-base-850 border border-base-700 rounded-md p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Demo Authority Account
            </div>
            <div className="text-xs text-slate-500 font-mono">authority@aegisflow.local</div>
            <div className="text-xs text-slate-500 font-mono">Aegis@2026</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
