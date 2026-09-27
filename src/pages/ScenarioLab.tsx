import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Trash2, Play, Save, FlaskConical, Info } from "lucide-react";
import { DemoTag, Button, Panel, SectionHeading } from "../components/ui";
import { useAppStore } from "../store/useAppStore";
import type { BreachScenario } from "../types";
import { DAM } from "../data/demoData";

const emptyDraft = (durationMin: 30 | 60 | 90 | 120 = 60): BreachScenario => ({
  id: `SCN-${Date.now()}`,
  name: "New Custom Scenario",
  label: "Custom",
  damId: DAM.id,
  reservoirLevel_m: 310,
  breachWidth_m: 45,
  breachDepth_m: 18,
  breachFormationTime_min: 12,
  breachLat: DAM.lat,
  breachLng: DAM.lng,
  durationMin,
  resolution: "Standard",
  createdAt: Date.now(),
});

export default function ScenarioLab() {
  const navigate = useNavigate();
  const { scenarios, upsertScenario, deleteScenario, setActiveScenario, activeScenarioId, runActiveScenario, runStatus } =
    useAppStore();
  const defaultDurationMin = useAppStore((s) => s.defaultDurationMin);
  const [draft, setDraft] = useState<BreachScenario>(
    scenarios.find((s) => s.id === activeScenarioId) ?? emptyDraft(defaultDurationMin)
  );

  function loadForEdit(s: BreachScenario) {
    setDraft({ ...s });
  }

  function saveDraft() {
    upsertScenario(draft);
    setActiveScenario(draft.id);
  }

  function duplicate(s: BreachScenario) {
    const copy = { ...s, id: `SCN-${Date.now()}`, name: `${s.name} (Copy)`, label: "Custom" as const, createdAt: Date.now() };
    upsertScenario(copy);
    setDraft(copy);
  }

  async function runAndGo() {
    saveDraft();
    setActiveScenario(draft.id);
    await runActiveScenario();
    navigate("/simulation");
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Scenario Lab</h1>
          <p className="text-xs text-slate-500">Configure breach parameters and manage simulation scenarios</p>
        </div>
        <DemoTag />
      </header>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Panel title="Breach Scenario Configuration" subtitle={`Editing: ${draft.name}`}>
            <div className="p-5 grid grid-cols-2 gap-5">
              <Field label="Scenario Name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Dam">
                <input value={DAM.name} disabled className="input opacity-60" />
              </Field>

              <SliderField
                label="Reservoir Level"
                value={draft.reservoirLevel_m}
                min={290}
                max={325}
                step={0.5}
                unit="m"
                onChange={(v) => setDraft({ ...draft, reservoirLevel_m: v })}
              />
              <SliderField
                label="Breach Width"
                value={draft.breachWidth_m}
                min={10}
                max={120}
                step={1}
                unit="m"
                onChange={(v) => setDraft({ ...draft, breachWidth_m: v })}
              />
              <SliderField
                label="Breach Depth"
                value={draft.breachDepth_m}
                min={4}
                max={35}
                step={1}
                unit="m"
                onChange={(v) => setDraft({ ...draft, breachDepth_m: v })}
              />
              <SliderField
                label="Breach Formation Time"
                value={draft.breachFormationTime_min}
                min={2}
                max={45}
                step={1}
                unit="min"
                onChange={(v) => setDraft({ ...draft, breachFormationTime_min: v })}
              />

              <Field label="Simulation Duration">
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDraft({ ...draft, durationMin: d as 30 | 60 | 90 | 120 })}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold border transition-colors ${
                        draft.durationMin === d
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "bg-base-800 border-base-600 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Simulation Resolution">
                <div className="flex gap-2">
                  {(["Fast", "Standard", "Detailed"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setDraft({ ...draft, resolution: r })}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold border transition-colors ${
                        draft.resolution === r
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "bg-base-800 border-base-600 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="px-5 pb-5 flex items-center gap-2 text-[11px] text-slate-500 bg-base-800/40 mx-5 rounded-md p-2.5 border border-base-700">
              <Info size={13} className="shrink-0" />
              Higher resolution reduces the internal integration timestep for a more detailed
              propagation calculation, at the cost of additional computation time.
            </div>

            <div className="px-5 pb-5 flex items-center gap-2.5 border-t border-base-700 pt-4">
              <Button onClick={runAndGo} disabled={runStatus.running}>
                <Play size={14} /> Run Simulation
              </Button>
              <Button variant="secondary" onClick={saveDraft}>
                <Save size={14} /> Save Scenario
              </Button>
              <Button variant="ghost" onClick={() => duplicate(draft)}>
                <Copy size={14} /> Duplicate
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <SectionHeading title="" />
          <Panel title="Predefined Scenarios" subtitle="Baseline severity presets">
            <div className="divide-y divide-base-700">
              {scenarios
                .filter((s) => s.label !== "Custom")
                .map((s) => (
                  <ScenarioRow key={s.id} s={s} onEdit={loadForEdit} onDuplicate={duplicate} onDelete={deleteScenario} />
                ))}
            </div>
          </Panel>

          <Panel title="Custom Scenarios">
            <div className="divide-y divide-base-700">
              {scenarios.filter((s) => s.label === "Custom").length === 0 && (
                <div className="p-4 text-xs text-slate-500 flex items-center gap-2">
                  <FlaskConical size={14} /> No custom scenarios saved yet.
                </div>
              )}
              {scenarios
                .filter((s) => s.label === "Custom")
                .map((s) => (
                  <ScenarioRow key={s.id} s={s} onEdit={loadForEdit} onDuplicate={duplicate} onDelete={deleteScenario} />
                ))}
            </div>
          </Panel>
        </div>
      </div>

      <style>{`.input { width:100%; background:#111a28; border:1px solid #22314a; border-radius:6px; padding:8px 12px; font-size:13px; color:#e2e8f0; } .input:focus { outline:none; border-color:#22d3ee80; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <span className="text-xs font-semibold text-accent tabular-nums">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

function ScenarioRow({
  s,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  s: BreachScenario;
  onEdit: (s: BreachScenario) => void;
  onDuplicate: (s: BreachScenario) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="p-3.5 flex items-center justify-between hover:bg-base-800/50 transition-colors">
      <button className="text-left" onClick={() => onEdit(s)}>
        <div className="text-xs font-semibold text-slate-200">{s.name}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Width {s.breachWidth_m}m · Depth {s.breachDepth_m}m · {s.durationMin}min
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button onClick={() => onDuplicate(s)} className="p-1.5 text-slate-500 hover:text-accent rounded" title="Duplicate">
          <Copy size={13} />
        </button>
        {s.label === "Custom" && (
          <button onClick={() => onDelete(s.id)} className="p-1.5 text-slate-500 hover:text-crit rounded" title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
