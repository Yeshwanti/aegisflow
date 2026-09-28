import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Droplets,
  Users,
  Route as RouteIcon,
  Building2,
  Gauge,
  Waves,
  Timer,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { DemoTag, MetricCard, Panel, Button, RiskBadge } from "../components/ui";
import MapView from "../components/MapView";
import { useActiveResult, useActiveScenario, useEnsureDemoRun } from "../hooks/useSim";
import { useAppStore } from "../store/useAppStore";
import { DAM, SETTLEMENTS, FACILITIES, BRIDGES } from "../data/demoData";
import { generateInsights } from "../engine/insights";

export default function CommandCenter() {
  useEnsureDemoRun();
  const navigate = useNavigate();
  const scenario = useActiveScenario();
  const result = useActiveResult();
  const runStatus = useAppStore((s) => s.runStatus);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const [selected, setSelected] = useState<{ type: string; id: string } | null>(null);

  const frame = result?.frames[result.frames.length - 1];

  const priorityLocations = useMemo(() => {
    if (!result) return [];
    return [...result.impacts]
      .filter((i) => i.riskLevel === "CRITICAL" || i.riskLevel === "HIGH")
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [result]);

  const insights = useMemo(() => (result ? generateInsights(result).slice(0, 3) : []), [result]);

  function nameFor(type: string, id: string) {
    if (type === "settlement") return SETTLEMENTS.find((s) => s.id === id)?.name;
    if (type === "facility") return FACILITIES.find((f) => f.id === id)?.name;
    if (type === "bridge") return BRIDGES.find((b) => b.id === id)?.name;
    return id;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Command Center</h1>
          <p className="text-xs text-slate-500">Real-time scenario overview and decision-support summary</p>
        </div>
        <div className="flex items-center gap-3">
          <DemoTag />
          <Button size="sm" onClick={() => navigate("/scenario-lab")}>
            Open Scenario Lab <ArrowRight size={14} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Active scenario strip */}
        <Panel className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center">
              <Waves size={20} className="text-accent" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Active Scenario</div>
              <div className="text-sm font-bold text-white">
                {DAM.id} · {DAM.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {scenario.label} · Simulation window {scenario.durationMin} minutes
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {runStatus.running ? (
              <div className="flex items-center gap-2 text-xs text-accent">
                <Loader2 size={14} className="animate-spin" />
                {runStatus.stageLabel} ({runStatus.progress}%)
              </div>
            ) : (
              <RiskBadge level={result && priorityLocations.length > 0 ? "HIGH" : "LOW"} size="sm" />
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-safe/10 text-safe border border-safe/25 font-medium">
              {result ? "Simulation Complete" : runStatus.running ? "Running" : "Idle"}
            </span>
            <Button size="sm" variant="secondary" onClick={() => navigate("/simulation")}>
              View Simulation
            </Button>
          </div>
        </Panel>

        {/* Key metrics */}
        <div className="grid grid-cols-4 xl:grid-cols-7 gap-3">
          <MetricCard
            label="Flooded Area"
            value={result ? result.summary.floodedAreaKm2.toFixed(1) : "—"}
            unit="km²"
            icon={<Droplets size={16} />}
            accent="cyan"
          />
          <MetricCard
            label="Population Exposed"
            value={result ? result.summary.populationExposed.toLocaleString() : "—"}
            icon={<Users size={16} />}
            accent="amber"
          />
          <MetricCard
            label="Roads Affected"
            value={result ? result.summary.roadsAffectedKm.toFixed(1) : "—"}
            unit="km"
            icon={<RouteIcon size={16} />}
            accent="slate"
          />
          <MetricCard
            label="Critical Facilities"
            value={result ? result.summary.criticalFacilitiesAffected : "—"}
            icon={<Building2 size={16} />}
            accent="red"
          />
          <MetricCard
            label="Maximum Depth"
            value={result ? result.summary.maxDepth.toFixed(1) : "—"}
            unit="m"
            icon={<Gauge size={16} />}
            accent="cyan"
          />
          <MetricCard
            label="Maximum Velocity"
            value={result ? result.summary.maxVelocity.toFixed(1) : "—"}
            unit="m/s"
            icon={<Waves size={16} />}
            accent="amber"
          />
          <MetricCard
            label="Earliest Arrival"
            value={result?.summary.earliestArrivalMin ?? "—"}
            unit="min"
            icon={<Timer size={16} />}
            accent="red"
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <Panel title="Flood Extent Overview" subtitle="Command Center map — final simulated state" className="col-span-2 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-[420px] relative">
              <MapView
                grid={result?.grid}
                frame={frame}
                cellResults={result?.cellResults}
                maxDurationMin={scenario.durationMin}
                activeLayers={{ ...activeLayers, depth: false, velocity: false, arrival: false, flood: true }}
                impacts={result?.impacts}
                onSelectAsset={(type, id) => setSelected({ type, id })}
              />
              {selected && (
                <div className="absolute bottom-3 left-3 right-3 bg-base-900/95 border border-base-600 rounded-lg p-3 backdrop-blur">
                  <div className="text-xs text-slate-500">{selected.type.toUpperCase()}</div>
                  <div className="text-sm font-semibold text-white">{nameFor(selected.type, selected.id)}</div>
                </div>
              )}
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel title="AI Risk Assistant" subtitle="Decision-support analysis" right={<Sparkles size={15} className="text-accent" />}>
              <div className="p-4 space-y-3">
                {insights.length === 0 && <p className="text-xs text-slate-500">Run a simulation to generate structured observations.</p>}
                {insights.map((line, i) => (
                  <div key={i} className="text-xs text-slate-300 leading-relaxed bg-base-800/60 border border-base-700 rounded-md p-2.5">
                    {line}
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="w-full" onClick={() => navigate("/priorities")}>
                  View Full Risk Priorities
                </Button>
              </div>
            </Panel>

            <Panel title="Top Priority Locations">
              <div className="divide-y divide-base-700">
                {priorityLocations.length === 0 && (
                  <div className="p-4 text-xs text-slate-500">No elevated-risk locations identified yet.</div>
                )}
                {priorityLocations.map((loc, i) => (
                  <button
                    key={loc.assetId}
                    onClick={() => navigate("/priorities")}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-base-800/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-600 w-4">{i + 1}</span>
                      <div>
                        <div className="text-xs font-medium text-slate-200">{nameFor(loc.assetType, loc.assetId)}</div>
                        <div className="text-[10px] text-slate-500">
                          Arrival {loc.arrivalMin !== null ? `${Math.round(loc.arrivalMin)} min` : "N/A"}
                        </div>
                      </div>
                    </div>
                    <RiskBadge level={loc.riskLevel} size="sm" />
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
