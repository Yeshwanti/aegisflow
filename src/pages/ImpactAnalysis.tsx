import { useMemo, useState } from "react";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { DemoTag, Panel, RiskBadge, Button } from "../components/ui";
import { useActiveResult, useActiveScenario, useEnsureDemoRun } from "../hooks/useSim";
import { SETTLEMENTS, ROADS, BRIDGES, FACILITIES } from "../data/demoData";
import type { AssetImpact, RiskLevel } from "../types";

type Tab = "settlements" | "roads" | "bridges" | "facilities";

export default function ImpactAnalysis() {
  useEnsureDemoRun();
  const result = useActiveResult();
  const scenario = useActiveScenario();
  const [tab, setTab] = useState<Tab>("settlements");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<"risk" | "arrival" | "name">("risk");

  const impacts = result?.impacts ?? [];

  const rows = useMemo(() => {
    const typeMap: Record<Tab, AssetImpact["assetType"]> = {
      settlements: "settlement",
      roads: "road",
      bridges: "bridge",
      facilities: "facility",
    };
    let filtered = impacts.filter((i) => i.assetType === typeMap[tab]);
    if (riskFilter !== "ALL") filtered = filtered.filter((i) => i.riskLevel === riskFilter);

    const withNames = filtered.map((i) => ({ ...i, name: nameFor(i) }));
    const q = query.toLowerCase();
    const searched = q ? withNames.filter((i) => i.name.toLowerCase().includes(q)) : withNames;

    return searched.sort((a, b) => {
      if (sortKey === "risk") return b.riskScore - a.riskScore;
      if (sortKey === "arrival") return (a.arrivalMin ?? 9999) - (b.arrivalMin ?? 9999);
      return a.name.localeCompare(b.name);
    });
  }, [impacts, tab, query, riskFilter, sortKey]);

  function exportCsv() {
    const header = "Name,Flooded,MaxDepth(m),MaxVelocity(m/s),Arrival(min),Risk,RiskScore\n";
    const body = rows
      .map(
        (r) =>
          `${r.name},${r.flooded},${r.maxDepth.toFixed(2)},${r.maxVelocity.toFixed(2)},${r.arrivalMin ?? "N/A"},${r.riskLevel},${r.riskScore}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegisflow-impact-${tab}-${scenario.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Impact Analysis</h1>
          <p className="text-xs text-slate-500">{scenario.name} · Exposure across settlements, roads, bridges and facilities</p>
        </div>
        <DemoTag />
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <Panel>
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex gap-1 bg-base-800 rounded-lg p-1">
              {(["settlements", "roads", "bridges", "facilities"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                    tab === t ? "bg-accent text-base-950" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              <Download size={13} /> Export CSV
            </Button>
          </div>

          <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${tab}...`}
                className="w-full bg-base-800 border border-base-600 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent/50"
              />
            </div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="bg-base-800 border border-base-600 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
            <button
              onClick={() => setSortKey(sortKey === "risk" ? "arrival" : sortKey === "arrival" ? "name" : "risk")}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-base-600 rounded-md px-2.5 py-1.5"
            >
              <ArrowUpDown size={12} /> Sort: {sortKey}
            </button>
            <span className="ml-auto text-xs text-slate-500">{rows.length} results</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-base-800/60 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  {tab === "settlements" && <th className="text-left px-4 py-2.5 font-medium">Population</th>}
                  <th className="text-left px-4 py-2.5 font-medium">Flooded</th>
                  <th className="text-left px-4 py-2.5 font-medium">Depth</th>
                  <th className="text-left px-4 py-2.5 font-medium">Velocity</th>
                  <th className="text-left px-4 py-2.5 font-medium">Arrival</th>
                  <th className="text-left px-4 py-2.5 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-700">
                {rows.map((r) => (
                  <tr key={r.assetId} className="hover:bg-base-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-200">{r.name}</td>
                    {tab === "settlements" && (
                      <td className="px-4 py-2.5 text-slate-400">{populationFor(r.assetId).toLocaleString()}</td>
                    )}
                    <td className="px-4 py-2.5">
                      <span className={r.flooded ? "text-crit font-medium" : "text-slate-500"}>{r.flooded ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 tabular-nums">{r.maxDepth.toFixed(2)} m</td>
                    <td className="px-4 py-2.5 text-slate-300 tabular-nums">{r.maxVelocity.toFixed(2)} m/s</td>
                    <td className="px-4 py-2.5 text-slate-300 tabular-nums">
                      {r.arrivalMin !== null ? `${Math.round(r.arrivalMin)} min` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <RiskBadge level={r.riskLevel} size="sm" />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No results match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function nameFor(i: AssetImpact): string {
  if (i.assetType === "settlement") return SETTLEMENTS.find((s) => s.id === i.assetId)?.name ?? i.assetId;
  if (i.assetType === "road") return ROADS.find((r) => r.id === i.assetId)?.name ?? i.assetId;
  if (i.assetType === "bridge") return BRIDGES.find((b) => b.id === i.assetId)?.name ?? i.assetId;
  return FACILITIES.find((f) => f.id === i.assetId)?.name ?? i.assetId;
}

function populationFor(id: string) {
  return SETTLEMENTS.find((s) => s.id === id)?.population ?? 0;
}
