import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Loader2,
  Layers,
  Droplets,
  Users,
  Building2,
  Gauge,
} from "lucide-react";
import { DemoTag, Button, RiskBadge } from "../components/ui";
import MapView from "../components/MapView";
import { useActiveResult, useActiveScenario, useEnsureDemoRun } from "../hooks/useSim";
import { useAppStore, type MapLayerKey } from "../store/useAppStore";
import { DAM, SETTLEMENTS, FACILITIES, BRIDGES } from "../data/demoData";

const LAYER_OPTIONS: { key: MapLayerKey; label: string }[] = [
  { key: "terrain", label: "Terrain" },
  { key: "flood", label: "Flood Extent" },
  { key: "depth", label: "Water Depth" },
  { key: "velocity", label: "Flow Velocity" },
  { key: "arrival", label: "Arrival Time" },
  { key: "settlements", label: "Settlements" },
  { key: "roads", label: "Roads" },
  { key: "bridges", label: "Bridges" },
  { key: "facilities", label: "Facilities" },
  { key: "dam", label: "Dam" },
  { key: "river", label: "River" },
  { key: "studyArea", label: "Study Area Boundary" },
  { key: "risk", label: "High-Risk Locations" },
];

export default function LiveSimulation() {
  useEnsureDemoRun();
  const scenario = useActiveScenario();
  const result = useActiveResult();
  const runStatus = useAppStore((s) => s.runStatus);
  const runActiveScenario = useAppStore((s) => s.runActiveScenario);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const timestepIndex = useAppStore((s) => s.timestepIndex);
  const setTimestepIndex = useAppStore((s) => s.setTimestepIndex);
  const playing = useAppStore((s) => s.playing);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const [selected, setSelected] = useState<{ type: string; id: string } | null>(null);
  const [opacity, setOpacity] = useState(0.9);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (playing && result) {
      intervalRef.current = window.setInterval(() => {
        setTimestepIndex((useAppStore.getState().timestepIndex + 1) % result.frames.length);
      }, 900);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, result]);

  const frame = result?.frames[Math.min(timestepIndex, (result?.frames.length ?? 1) - 1)];

  const currentFloodedFacilities = useMemo(() => {
    if (!result || !frame) return 0;
    return result.impacts.filter((i) => i.assetType === "facility" && i.flooded && (i.arrivalMin ?? Infinity) <= frame.tMin)
      .length;
  }, [result, frame]);

  const currentPopulation = useMemo(() => {
    if (!result || !frame) return 0;
    const ids = new Set(
      result.impacts
        .filter((i) => i.assetType === "settlement" && i.flooded && (i.arrivalMin ?? Infinity) <= frame.tMin)
        .map((i) => i.assetId)
    );
    return SETTLEMENTS.filter((s) => ids.has(s.id)).reduce((sum, s) => sum + s.population, 0);
  }, [result, frame]);

  function nameFor(type: string, id: string) {
    if (type === "settlement") return SETTLEMENTS.find((s) => s.id === id);
    if (type === "facility") return FACILITIES.find((f) => f.id === id);
    if (type === "bridge") return BRIDGES.find((b) => b.id === id);
    return null;
  }

  const selectedImpact = selected && result ? result.impacts.find((i) => i.assetId === selected.id) : null;
  const selectedAsset = selected ? nameFor(selected.type, selected.id) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            Live Simulation
            {runStatus.running && <Loader2 size={14} className="animate-spin text-accent" />}
          </h1>
          <p className="text-xs text-slate-500">
            {scenario.name} · {DAM.name} ·{" "}
            {runStatus.running ? runStatus.stageLabel : result ? "Simulation Complete" : "Idle"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoTag />
          <Button size="sm" onClick={() => runActiveScenario()} disabled={runStatus.running}>
            {runStatus.running ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {runStatus.running ? `${runStatus.progress}%` : "Re-run Simulation"}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <MapView
              grid={result?.grid}
              frame={frame}
              cellResults={result?.cellResults}
              maxDurationMin={scenario.durationMin}
              activeLayers={activeLayers}
              impacts={result?.impacts}
              opacity={opacity}
              onSelectAsset={(type, id) => setSelected({ type, id })}
            />

            {/* Layer control */}
            <div className="absolute top-3 left-3 bg-base-900/95 border border-base-600 rounded-lg p-3 backdrop-blur w-52">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <Layers size={13} /> Map Layers
              </div>
              <div className="space-y-1">
                {LAYER_OPTIONS.map((l) => (
                  <label key={l.key} className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeLayers[l.key]}
                      onChange={() => toggleLayer(l.key)}
                      className="accent-accent w-3 h-3"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-base-700">
                <div className="text-[10px] text-slate-500 mb-1">Layer Opacity</div>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>

            {/* Legend */}
          {activeLayers.arrival ? (
  <Legend
    title="Arrival Time (min)"
    stops={["<15", "15–30", "30–45", "45+"]}
    colors={["#ef4444", "#fb923c", "#facc15", "#4ade80"]}
  />
) : activeLayers.velocity ? (
  <Legend
    title="Velocity (m/s)"
    stops={["<0.5", "0.5–1", "1–1.5", "1.5–2.5", "2.5–3.5", "3.5+"]}
    colors={["#4ade80", "#a3e635", "#facc15", "#fb923c", "#ef4444", "#be123c"]}
  />
) : activeLayers.depth ? (
  <Legend
    title="Water Depth (m)"
    stops={["0–0.5", "0.5–1", "1–2", "2–3", "3–4", "4+"]}
    colors={["#bae6fd", "#7dd3fc", "#38a5e6", "#2563d2", "#1e40af", "#311a78"]}
  />
) : activeLayers.flood ? (
  <Legend
    title="Flood Extent"
    stops={["Inundated area", "Study boundary", "River"]}
    colors={["#2584cf", "#f1f5f9", "#facc15"]}
  />
) : null}
            {/* Selected asset popup card */}
            {selectedAsset && selectedImpact && (
              <div className="absolute bottom-4 left-3 bg-base-900/97 border border-base-600 rounded-lg p-4 backdrop-blur w-72 shadow-panel">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{selected!.type}</div>
                    <div className="text-sm font-bold text-white">{(selectedAsset as any).name}</div>
                  </div>
                  <RiskBadge level={selectedImpact.riskLevel} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  {"population" in selectedAsset && (
                    <InfoStat label="Population" value={(selectedAsset as any).population.toLocaleString()} />
                  )}
                  <InfoStat label="Flooded" value={selectedImpact.flooded ? "Yes" : "No"} />
                  <InfoStat label="Max Depth" value={`${selectedImpact.maxDepth.toFixed(2)} m`} />
                  <InfoStat label="Velocity" value={`${selectedImpact.maxVelocity.toFixed(2)} m/s`} />
                  <InfoStat label="Arrival" value={selectedImpact.arrivalMin !== null ? `${Math.round(selectedImpact.arrivalMin)} min` : "N/A"} />
                  <InfoStat label="Risk Score" value={selectedImpact.riskScore.toFixed(0)} />
                </div>
                <div className="mt-2.5 text-[10px] text-slate-500">{selectedImpact.riskReasons.join(" · ")}</div>
              </div>
            )}
          </div>

          {/* Timeline controls */}
          <div className="shrink-0 border-t border-base-700 bg-base-900 px-6 py-3.5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <IconBtn onClick={() => setTimestepIndex(Math.max(0, timestepIndex - 1))} disabled={!result}>
                  <SkipBack size={15} />
                </IconBtn>
                <IconBtn onClick={() => setPlaying(!playing)} disabled={!result} primary>
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </IconBtn>
                <IconBtn
                  onClick={() => setTimestepIndex(Math.min((result?.frames.length ?? 1) - 1, timestepIndex + 1))}
                  disabled={!result}
                >
                  <SkipForward size={15} />
                </IconBtn>
                <IconBtn
                  onClick={() => {
                    setTimestepIndex(0);
                    setPlaying(false);
                  }}
                  disabled={!result}
                >
                  <RotateCcw size={15} />
                </IconBtn>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-slate-500 w-10 text-right tabular-nums">0 min</span>
                <input
                  type="range"
                  min={0}
                  max={(result?.frames.length ?? 1) - 1}
                  step={1}
                  value={timestepIndex}
                  onChange={(e) => setTimestepIndex(Number(e.target.value))}
                  disabled={!result}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs text-slate-500 w-16 tabular-nums">{scenario.durationMin} min</span>
              </div>

              <div className="text-sm font-bold text-accent tabular-nums w-24 text-right">
                T = {frame ? frame.tMin : 0} min
              </div>
            </div>
          </div>
        </div>

        {/* Right metrics panel */}
        <div className="w-72 shrink-0 border-l border-base-700 bg-base-900 overflow-y-auto p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Current Timestep Metrics</div>
          <StatCard icon={<Droplets size={14} />} label="Flooded Area" value={frame ? `${frame.floodedAreaKm2.toFixed(1)} km²` : "—"} />
          <StatCard icon={<Gauge size={14} />} label="Current Max Depth" value={frame ? `${frame.maxDepth.toFixed(2)} m` : "—"} />
          <StatCard icon={<Gauge size={14} />} label="Current Max Velocity" value={frame ? `${frame.maxVelocity.toFixed(2)} m/s` : "—"} />
          <StatCard icon={<Users size={14} />} label="Population Exposed So Far" value={currentPopulation.toLocaleString()} />
          <StatCard icon={<Building2 size={14} />} label="Facilities Affected So Far" value={String(currentFloodedFacilities)} />

          <div className="pt-3 border-t border-base-700">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Final Simulation Summary</div>
            {result && (
              <div className="space-y-2 text-xs">
                <SumRow label="Flooded Area" value={`${result.summary.floodedAreaKm2.toFixed(1)} km²`} />
                <SumRow label="Population Exposed" value={result.summary.populationExposed.toLocaleString()} />
                <SumRow label="Roads Affected" value={`${result.summary.roadsAffectedKm.toFixed(1)} km`} />
                <SumRow label="Critical Facilities" value={String(result.summary.criticalFacilitiesAffected)} />
                <SumRow label="Max Depth" value={`${result.summary.maxDepth.toFixed(2)} m`} />
                <SumRow label="Max Velocity" value={`${result.summary.maxVelocity.toFixed(2)} m/s`} />
                <SumRow
                  label="Earliest Arrival"
                  value={result.summary.earliestArrivalMin !== null ? `${result.summary.earliestArrivalMin} min` : "N/A"}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
        primary ? "bg-accent text-base-950 hover:bg-accent-soft" : "bg-base-700 text-slate-300 hover:bg-base-600"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-base-800/60 rounded px-2 py-1.5">
      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
      <div className="text-xs font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-base-850 border border-base-700 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-bold text-white tabular-nums">{value}</span>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Legend({ title, stops, colors }: { title: string; stops: string[]; colors: string[] }) {
  return (
    <div className="absolute bottom-4 right-3 bg-base-900/95 border border-base-600 rounded-lg p-3 backdrop-blur">
      <div className="text-[10px] font-semibold text-slate-300 mb-2">{title}</div>
      <div className="space-y-1">
        {stops.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: colors[i] }} />
            <span className="text-[10px] text-slate-400">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
