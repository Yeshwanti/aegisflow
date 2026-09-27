import { useMemo, useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { DemoTag, Panel, RiskBadge } from "../components/ui";
import MapView from "../components/MapView";
import { useActiveResult, useActiveScenario, useEnsureDemoRun } from "../hooks/useSim";
import { useAppStore } from "../store/useAppStore";
import { SETTLEMENTS, ROADS, BRIDGES, FACILITIES } from "../data/demoData";
import type { AssetImpact } from "../types";
import { computeRisk } from "../engine/risk";

function nameFor(i: AssetImpact): string {
  if (i.assetType === "settlement") return SETTLEMENTS.find((s) => s.id === i.assetId)?.name ?? i.assetId;
  if (i.assetType === "road") return ROADS.find((r) => r.id === i.assetId)?.name ?? i.assetId;
  if (i.assetType === "bridge") return BRIDGES.find((b) => b.id === i.assetId)?.name ?? i.assetId;
  return FACILITIES.find((f) => f.id === i.assetId)?.name ?? i.assetId;
}

function coordsFor(i: AssetImpact): { lat: number; lng: number } | null {
  if (i.assetType === "settlement") {
    const s = SETTLEMENTS.find((x) => x.id === i.assetId);
    return s ? { lat: s.lat, lng: s.lng } : null;
  }
  if (i.assetType === "bridge") {
    const b = BRIDGES.find((x) => x.id === i.assetId);
    return b ? { lat: b.lat, lng: b.lng } : null;
  }
  if (i.assetType === "facility") {
    const f = FACILITIES.find((x) => x.id === i.assetId);
    return f ? { lat: f.lat, lng: f.lng } : null;
  }
  return null;
}

export default function RiskPriorities() {
  useEnsureDemoRun();
  const result = useActiveResult();
  const scenario = useActiveScenario();
  const activeLayers = useAppStore((s) => s.activeLayers);
  const riskWeights = useAppStore((s) => s.riskWeights);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const priorities = useMemo(() => {
    if (!result) return [];
    return [...result.impacts].sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
  }, [result]);

  const selected = priorities.find((p) => p.assetId === selectedId) ?? priorities[0];
  const selectedCoords = selected ? coordsFor(selected) : null;

  const populationOrImportance = (i: AssetImpact) => {
    if (i.assetType === "settlement") return SETTLEMENTS.find((s) => s.id === i.assetId)?.population ?? 0;
    if (i.assetType === "facility") return FACILITIES.find((f) => f.id === i.assetId)?.capacity ?? 2000;
    if (i.assetType === "road") {
      const road = ROADS.find((item) => item.id === i.assetId);
      return road?.className === "highway" ? 6000 : road?.className === "state" ? 3000 : 900;
    }
    return 4000;
  };

  const isCritical = (i: AssetImpact) => {
    if (i.assetType === "bridge") return true;
    if (i.assetType === "road") return ROADS.find((road) => road.id === i.assetId)?.className === "highway";
    if (i.assetType === "facility") {
      const type = FACILITIES.find((facility) => facility.id === i.assetId)?.type;
      return type === "hospital" || type === "power" || type === "police";
    }
    return false;
  };

  const factors = selected
    ? computeRisk(
        {
          depth: selected.maxDepth,
          velocity: selected.maxVelocity,
          arrivalMin: selected.arrivalMin,
          populationOrImportance: populationOrImportance(selected),
          isCriticalFacility: isCritical(selected),
          maxDurationMin: scenario.durationMin,
        },
        riskWeights
      ).factors
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Risk Priorities</h1>
          <p className="text-xs text-slate-500">Ranked locations by simulated exposure and configured risk criteria</p>
        </div>
        <DemoTag />
      </header>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-[420px] shrink-0 border-r border-base-700 overflow-y-auto">
          {priorities.map((p, i) => {
            return (
              <button
                key={p.assetId}
                onClick={() => setSelectedId(p.assetId)}
                className={`w-full text-left px-4 py-3 border-b border-base-700 flex items-center gap-3 transition-colors ${
                  selected?.assetId === p.assetId ? "bg-accent/10" : "hover:bg-base-800/50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    i < 3 ? "bg-crit/20 text-crit" : "bg-base-700 text-slate-400"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{nameFor(p)}</div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    {p.assetType} · {p.arrivalMin !== null ? `Arrival ${Math.round(p.arrivalMin)} min` : "Not reached"}
                  </div>
                </div>
                <RiskBadge level={p.riskLevel} size="sm" />
                <ChevronRight size={14} className="text-slate-600 shrink-0" />
              </button>
            );
          })}
          {priorities.length === 0 && <div className="p-6 text-xs text-slate-500">Run a simulation to generate risk priorities.</div>}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <MapView
              grid={result?.grid}
              frame={result?.frames[result.frames.length - 1]}
              cellResults={result?.cellResults}
              maxDurationMin={scenario.durationMin}
              activeLayers={{ ...activeLayers, flood: true }}
              impacts={result?.impacts}
              flyTo={selectedCoords ? { ...selectedCoords, zoom: 13.5 } : null}
              onSelectAsset={(_, id) => setSelectedId(id)}
            />
          </div>

          {selected && (
            <Panel className="m-4 mt-0" title={`Risk Explainability — ${nameFor(selected)}`} right={<RiskBadge level={selected.riskLevel} />}>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                  <Info size={13} /> Risk = weighted combination of depth, velocity, arrival time, exposure and
                  infrastructure importance
                </div>
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {factors.map((f) => (
                    <div key={f.label} className="bg-base-800/60 rounded-md p-2.5">
                      <div className="text-[10px] text-slate-500">{f.label}</div>
                      <div className="text-sm font-bold text-slate-100">{f.value}</div>
                      <div className="text-[10px] text-accent mt-0.5">+{f.contribution} pts</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-base-800/40 rounded-md p-3">
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">Reasoning:</span> {selected.riskReasons.join(", ")}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">Risk Score</div>
                    <div className="text-lg font-extrabold text-accent tabular-nums">{selected.riskScore.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
