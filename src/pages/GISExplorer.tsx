import { useState } from "react";
import { Search, Layers, MapPin } from "lucide-react";
import { DemoTag, RiskBadge } from "../components/ui";
import MapView from "../components/MapView";
import { useActiveResult, useActiveScenario, useEnsureDemoRun } from "../hooks/useSim";
import { useAppStore, type MapLayerKey } from "../store/useAppStore";
import { SETTLEMENTS, ROADS, BRIDGES, FACILITIES, DAM } from "../data/demoData";

const LAYER_GROUPS: { title: string; items: { key: MapLayerKey; label: string }[] }[] = [
  { title: "Simulation", items: [{ key: "terrain", label: "Terrain" }, { key: "flood", label: "Flood Extent" }, { key: "depth", label: "Water Depth" }, { key: "velocity", label: "Flow Velocity" }, { key: "arrival", label: "Arrival Time" }, { key: "risk", label: "High-Risk Locations" }] },
  { title: "Assets", items: [{ key: "dam", label: "Dam" }, { key: "river", label: "River" }, { key: "studyArea", label: "Study Area Boundary" }, { key: "settlements", label: "Settlements / Population" }, { key: "roads", label: "Roads" }, { key: "bridges", label: "Bridges" }, { key: "facilities", label: "Facilities" }] },
];

type SearchItem = { type: string; id: string; name: string; lat: number; lng: number };

export default function GISExplorer() {
  useEnsureDemoRun();
  const result = useActiveResult();
  const scenario = useActiveScenario();
  const activeLayers = useAppStore((s) => s.activeLayers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const runStatus = useAppStore((s) => s.runStatus);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ type: string; id: string } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [opacity, setOpacity] = useState(0.9);

  const allAssets: SearchItem[] = [
    { type: "dam", id: DAM.id, name: DAM.name, lat: DAM.lat, lng: DAM.lng },
    ...SETTLEMENTS.map((s) => ({ type: "settlement", id: s.id, name: s.name, lat: s.lat, lng: s.lng })),
    ...BRIDGES.map((b) => ({ type: "bridge", id: b.id, name: b.name, lat: b.lat, lng: b.lng })),
    ...FACILITIES.map((f) => ({ type: "facility", id: f.id, name: f.name, lat: f.lat, lng: f.lng })),
  ];

  const searchResults = query.length > 0 ? allAssets.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];

  const selectedImpact = selected && result ? result.impacts.find((i) => i.assetId === selected.id) : null;
  const selectedFacility = selected?.type === "facility" ? FACILITIES.find((facility) => facility.id === selected.id) : null;

  function nameFor(type: string, id: string) {
    if (type === "settlement") return SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
    if (type === "road") return ROADS.find((r) => r.id === id)?.name ?? id;
    if (type === "bridge") return BRIDGES.find((b) => b.id === id)?.name ?? id;
    return FACILITIES.find((f) => f.id === id)?.name ?? id;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">GIS Explorer</h1>
          <p className="text-xs text-slate-500">{scenario.name} · Synthetic demonstration study data</p>
        </div>
        <DemoTag />
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 shrink-0 border-r border-base-700 overflow-y-auto p-4 space-y-5">
          <div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search location or asset..."
                className="w-full bg-base-800 border border-base-600 rounded-md pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent/50"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-base-700 rounded-md overflow-hidden">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setFlyTo({ lat: r.lat, lng: r.lng, zoom: 13.5 });
                      setSelected({ type: r.type, id: r.id });
                      setQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-base-800 border-b border-base-700 last:border-0 flex items-center gap-2"
                  >
                    <MapPin size={12} className="text-accent" /> {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {LAYER_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <Layers size={12} /> {group.title}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <label key={item.key} className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeLayers[item.key]}
                        onChange={() => toggleLayer(item.key)}
                        className="accent-accent w-3.5 h-3.5"
                      />
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Layer Opacity</div>
            <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-accent" />
          </div>
        </div>

        <div className="flex-1 relative">
          <MapView
            grid={result?.grid}
            frame={result?.frames[result.frames.length - 1]}
            cellResults={result?.cellResults}
            maxDurationMin={scenario.durationMin}
            activeLayers={activeLayers}
            impacts={result?.impacts}
            opacity={opacity}
            flyTo={flyTo}
            onSelectAsset={(type, id) => setSelected({ type, id })}
          />
          <div className="absolute bottom-3 left-3 rounded-md border border-base-600 bg-base-900/90 px-3 py-2 text-[10px] text-slate-400">
            {scenario.label} · Synthetic study data · Depth and extent from active simulation
          </div>
          <div className="absolute bottom-3 right-3 rounded-md border border-base-600 bg-base-900/90 p-3 text-[10px] text-slate-300">
            <div className="mb-1.5 font-semibold">Map Legend</div>
            <LegendRow color="#2584cf" label="Inundation extent" />
            <LegendRow color="#38bdf8" label="River reach" />
            <LegendRow color="#7dd3fc" label="Study boundary" />
            <LegendRow color="#ef4444" label="High / critical risk" />
          </div>
        </div>

        {selected && (
          <div className="w-80 shrink-0 border-l border-base-700 overflow-y-auto p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{selected.type}</div>
            <div className="text-base font-bold text-white mb-3">{nameFor(selected.type, selected.id)}</div>
            {selectedFacility && (
              <div className="mb-2 space-y-1 text-xs text-slate-400">
                <div>Facility type: <span className="capitalize text-slate-200">{selectedFacility.type}</span></div>
                {selectedFacility.capacity !== undefined && <div>Service capacity: <span className="text-slate-200">{selectedFacility.capacity.toLocaleString()}</span></div>}
                {selectedImpact && <div className="pt-1 text-slate-300">{selectedImpact.riskLevel === "HIGH" || selectedImpact.riskLevel === "CRITICAL" ? "Recommended action: prioritize evacuation planning and maintain emergency access." : "Recommended action: monitor conditions and retain emergency access."}</div>}
              </div>
            )}
            {selectedImpact ? (
              <div className="space-y-2">
                <DrawerRow label="Flooded" value={selectedImpact.flooded ? "Yes" : "No"} />
                <DrawerRow label="Max Depth" value={`${selectedImpact.maxDepth.toFixed(2)} m`} />
                <DrawerRow label="Max Velocity" value={`${selectedImpact.maxVelocity.toFixed(2)} m/s`} />
                <DrawerRow label="Arrival Time" value={selectedImpact.arrivalMin !== null ? `${Math.round(selectedImpact.arrivalMin)} min` : "N/A"} />
                <div className="flex items-center justify-between py-2 border-b border-base-700">
                  <span className="text-xs text-slate-500">Risk Level</span>
                  <RiskBadge level={selectedImpact.riskLevel} size="sm" />
                </div>
                <div className="text-xs text-slate-400 pt-2">{selectedImpact.riskReasons.join(" · ")}</div>
              </div>
            ) : selected.type === "dam" ? (
              <div className="text-xs text-slate-500">Dam reference point for the selected downstream study area.</div>
            ) : (
              <div className="text-xs text-slate-500">
                {runStatus.running ? "Simulation impacts are being calculated for this scenario." : "No simulation impact is available for this asset."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-base-700">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2 py-0.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />{label}</div>;
}
