import { useState } from "react";
import { CheckCircle2, CircleHelp, RotateCcw, Database, Server, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { DemoTag, Panel, Button } from "../components/ui";
import { useAppStore } from "../store/useAppStore";
import { DEFAULT_RISK_WEIGHTS } from "../engine/risk";
import { useNavigate } from "react-router-dom";

export default function SystemSettings() {
  const navigate = useNavigate();
  const riskWeights = useAppStore((s) => s.riskWeights);
  const setRiskWeights = useAppStore((s) => s.setRiskWeights);
  const arrivalThresholdM = useAppStore((s) => s.arrivalThresholdM);
  const setArrivalThresholdM = useAppStore((s) => s.setArrivalThresholdM);
  const defaultDurationMin = useAppStore((s) => s.defaultDurationMin);
  const setDefaultDurationMin = useAppStore((s) => s.setDefaultDurationMin);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleResetDemo() {
    resetDemo();
    navigate("/");
  }

  const total = Object.values(riskWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">System Settings</h1>
          <p className="text-xs text-slate-500">Configure simulation, risk model, map and system defaults</p>
        </div>
        <DemoTag />
      </header>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-5">
        <Panel title="Simulation Defaults" right={<SlidersHorizontal size={14} className="text-accent" />}>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Default Duration</span>
                <span className="text-accent font-semibold">{defaultDurationMin} min</span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                step={30}
                value={defaultDurationMin}
                onChange={(e) => setDefaultDurationMin(Number(e.target.value) as 30 | 60 | 90 | 120)}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Flood Arrival Depth Threshold</span>
                <span className="text-accent font-semibold">{arrivalThresholdM.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.05}
                value={arrivalThresholdM}
                onChange={(e) => setArrivalThresholdM(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Minimum simulated depth at which a grid cell is considered "flooded" for arrival-time
                and exposure calculations. Changing it reruns the active scenario when you return to a simulation view.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Risk Model Weights" subtitle={`Total: ${(total * 100).toFixed(0)}%`}>
          <div className="p-4 space-y-3">
            {Object.entries(riskWeights).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 capitalize">{key}</span>
                  <span className="text-accent font-semibold">{(val * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={val}
                  onChange={(e) => setRiskWeights({ ...riskWeights, [key]: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setRiskWeights(DEFAULT_RISK_WEIGHTS)}>
              Reset to Default Weights
            </Button>
            <p className="text-[10px] text-slate-500">
              Risk thresholds — LOW &lt; 35, MODERATE 35–60, HIGH 60–80, CRITICAL ≥ 80 — are configured
              severity bands, not universal scientific classifications.
            </p>
          </div>
        </Panel>

        <Panel title="Map Defaults" right={<MapIcon size={14} className="text-accent" />}>
          <div className="p-4 space-y-3 text-xs">
            <SettingRow label="Default Map Style" value="Dark Command (CARTO tiles optional)" />
            <SettingRow label="Default Layer Opacity" value="90%" />
            <SettingRow label="Default Basemap Zoom" value="10.3" />
          </div>
        </Panel>

        <Panel title="System Status" right={<Server size={14} className="text-accent" />}>
          <div className="p-4 space-y-2.5">
            <StatusRow label="Simulation Engine" status="Operational · local" />
            <StatusRow label="GIS Renderer" status="Operational · local" />
            <StatusRow label="Demo Dataset" status="Loaded · synthetic" />
            <StatusRow label="External Basemap Tiles" status="Optional · network dependent" optional />
          </div>
        </Panel>

        <Panel title="Demo Data" className="col-span-2" right={<Database size={14} className="text-accent" />}>
          <div className="p-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 max-w-lg">
              Resetting demo data restores seeded scenarios, simulation defaults and map layers, clears
              locally saved custom scenarios, and keeps the current demonstration login active.
            </p>
            {!confirmReset ? (
              <Button variant="danger" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={14} /> Reset Demo Data
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-crit">Confirm reset?</span>
                <Button variant="danger" size="sm" onClick={handleResetDemo}>
                  Yes, Reset
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

function StatusRow({ label, status, optional = false }: { label: string; status: string; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`flex items-center gap-1.5 font-medium ${optional ? "text-amber-400" : "text-safe"}`}>
        {optional ? <CircleHelp size={13} /> : <CheckCircle2 size={13} />} {status}
      </span>
    </div>
  );
}
