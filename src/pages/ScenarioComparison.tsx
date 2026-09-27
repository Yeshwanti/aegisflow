import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend as ReLegend } from "recharts";
import { Loader2, Sparkles } from "lucide-react";
import { DemoTag, Panel, RiskBadge } from "../components/ui";
import { useAppStore } from "../store/useAppStore";
import { compareScenarioInsights } from "../engine/insights";
import type { SimulationResult } from "../types";

export default function ScenarioComparison() {
  const scenarios = useAppStore((s) => s.scenarios);
  const results = useAppStore((s) => s.results);
  const compareIds = useAppStore((s) => s.compareIds);
  const setCompareIds = useAppStore((s) => s.setCompareIds);
  const runStatus = useAppStore((s) => s.runStatus);
  const [runningAll, setRunningAll] = useState(false);
  const runningRef = useRef(false);

  const predefined = scenarios.filter((s) => s.label !== "Custom");

  useEffect(() => {
    async function ensureAll() {
      const store = useAppStore.getState();
      const missing = compareIds.filter((id) => !store.results[id]);
      if (missing.length === 0 || store.runStatus.running || runningRef.current) return;
      runningRef.current = true;
      setRunningAll(true);
      try {
        for (const id of missing) {
          await store.runScenario(id);
        }
      } finally {
        runningRef.current = false;
        setRunningAll(false);
      }
    }
    ensureAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareIds, results, runStatus.running]);

  const comparisonData = compareIds
    .map((id) => ({ id, scenario: scenarios.find((s) => s.id === id), result: results[id] }))
    .filter((x) => x.scenario && x.result) as { id: string; scenario: any; result: SimulationResult }[];

  const chartData = useMemo(
    () =>
      comparisonData.map((c) => ({
        name: c.scenario.label,
        "Flooded Area (km²)": Number(c.result.summary.floodedAreaKm2.toFixed(1)),
        "Population Exposed": c.result.summary.populationExposed,
        "Max Depth (m)": Number(c.result.summary.maxDepth.toFixed(1)),
      })),
    [comparisonData]
  );

  const insights = useMemo(
    () =>
      compareScenarioInsights(
        comparisonData.map((c) => ({ name: c.scenario.label as string, result: c.result }))
      ),
    [comparisonData]
  );

  const isBusy = runningAll || runStatus.running;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Scenario Comparison</h1>
          <p className="text-xs text-slate-500">Compare breach severity scenarios side-by-side</p>
        </div>
        <div className="flex items-center gap-3">
          {isBusy && (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <Loader2 size={13} className="animate-spin" /> Computing scenarios…
            </span>
          )}
          <DemoTag />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex gap-3">
          {predefined.map((s) => (
            <label
              key={s.id}
              className={`flex-1 border rounded-lg p-3.5 cursor-pointer transition-colors ${
                compareIds.includes(s.id) ? "border-accent/40 bg-accent/10" : "border-base-700 bg-base-850 hover:border-base-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-100">{s.label}</span>
                <input
                  type="checkbox"
                  checked={compareIds.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) setCompareIds([...compareIds, s.id]);
                    else setCompareIds(compareIds.filter((id) => id !== s.id));
                  }}
                  className="accent-accent"
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Width {s.breachWidth_m}m · Depth {s.breachDepth_m}m · Formation {s.breachFormationTime_min}min
              </div>
            </label>
          ))}
        </div>

        {comparisonData.length >= 2 && (
          <>
            <Panel title="AI Comparison Insights" right={<Sparkles size={14} className="text-accent" />}>
              <div className="p-4 space-y-2.5">
                {insights.map((line, i) => (
                  <div key={i} className="text-xs text-slate-300 bg-base-800/50 border border-base-700 rounded-md p-2.5">
                    {line}
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid grid-cols-2 gap-5">
              <Panel title="Flooded Area & Max Depth">
                <div className="h-64 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#182333" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #22314a", fontSize: 12 }} />
                      <ReLegend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Flooded Area (km²)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Max Depth (m)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Population Exposed">
                <div className="h-64 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#182333" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #22314a", fontSize: 12 }} />
                      <Bar dataKey="Population Exposed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel title="Side-by-Side Summary">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-base-800/60 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="text-left px-4 py-2.5">Metric</th>
                      {comparisonData.map((c) => (
                        <th key={c.id} className="text-left px-4 py-2.5">
                          {c.scenario.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-700">
                    <Row label="Flooded Area (km²)" data={comparisonData} get={(r) => r.summary.floodedAreaKm2.toFixed(1)} />
                    <Row label="Max Depth (m)" data={comparisonData} get={(r) => r.summary.maxDepth.toFixed(2)} />
                    <Row label="Max Velocity (m/s)" data={comparisonData} get={(r) => r.summary.maxVelocity.toFixed(2)} />
                    <Row label="Population Exposed" data={comparisonData} get={(r) => r.summary.populationExposed.toLocaleString()} />
                    <Row label="Roads Affected (km)" data={comparisonData} get={(r) => r.summary.roadsAffectedKm.toFixed(1)} />
                    <Row label="Critical Facilities Affected" data={comparisonData} get={(r) => String(r.summary.criticalFacilitiesAffected)} />
                    <Row
                      label="Earliest Arrival (min)"
                      data={comparisonData}
                      get={(r) => (r.summary.earliestArrivalMin !== null ? String(r.summary.earliestArrivalMin) : "N/A")}
                    />
                    <tr>
                      <td className="px-4 py-2.5 text-slate-400 font-medium">Critical-Risk Locations</td>
                      {comparisonData.map((c) => (
                        <td key={c.id} className="px-4 py-2.5">
                          <RiskBadge level="CRITICAL" size="sm" />
                          <span className="ml-2 text-slate-300 font-semibold">
                            {c.result.impacts.filter((i) => i.riskLevel === "CRITICAL").length}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {comparisonData.length < 2 && !isBusy && (
          <div className="text-center py-16 text-sm text-slate-500">Select at least two scenarios above to compare.</div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  data,
  get,
}: {
  label: string;
  data: { id: string; result: SimulationResult }[];
  get: (r: SimulationResult["summary"] extends any ? SimulationResult : never) => string;
}) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-slate-400 font-medium">{label}</td>
      {data.map((c) => (
        <td key={c.id} className="px-4 py-2.5 text-slate-200 font-semibold tabular-nums">
          {get(c.result)}
        </td>
      ))}
    </tr>
  );
}
