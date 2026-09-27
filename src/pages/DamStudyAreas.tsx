import { Waves, Ruler, Droplets, Calendar, Target, MapPin } from "lucide-react";
import { DemoTag, MetricCard, Panel } from "../components/ui";
import MapView from "../components/MapView";
import { DAM } from "../data/demoData";
import { useAppStore } from "../store/useAppStore";
import { generateTerrain } from "../engine/terrain";
import { useMemo } from "react";

export default function DamStudyAreas() {
  const activeLayers = useAppStore((s) => s.activeLayers);
  const grid = useMemo(() => generateTerrain(DAM.lat, DAM.lng, 42), []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Dam &amp; Study Areas</h1>
          <p className="text-xs text-slate-500">Registered study areas available for scenario modelling</p>
        </div>
        <DemoTag />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <Panel className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center">
                <Waves size={26} className="text-accent" />
              </div>
              <div>
                <div className="text-[11px] text-accent font-semibold uppercase tracking-wider">{DAM.id} · Study Area</div>
                <div className="text-xl font-bold text-white">{DAM.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {DAM.river} · {DAM.state}
                </div>
              </div>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-safe/10 text-safe border border-safe/25 font-medium">
              Study Area Active
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 mt-5">
            <MetricCard label="Dam Height" value={DAM.height_m} unit="m" icon={<Ruler size={16} />} accent="cyan" />
            <MetricCard label="Dam Length" value={DAM.length_m.toLocaleString()} unit="m" icon={<Ruler size={16} />} accent="slate" />
            <MetricCard
              label="Reservoir Capacity"
              value={DAM.reservoirCapacity_mcm.toLocaleString()}
              unit="MCM"
              icon={<Droplets size={16} />}
              accent="cyan"
            />
            <MetricCard label="Full Reservoir Level" value={DAM.fullReservoirLevel_m} unit="m" icon={<Target size={16} />} accent="amber" />
            <MetricCard label="Commissioned" value={DAM.yearBuilt} icon={<Calendar size={16} />} accent="slate" />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={13} />
            {DAM.lat.toFixed(4)}° N, {DAM.lng.toFixed(4)}° E · Purpose: {DAM.purpose}
          </div>
        </Panel>

        <div className="grid grid-cols-3 gap-5">
          <Panel title="Study Area Terrain" subtitle="Synthetic demonstration DEM — river valley model" className="col-span-2 overflow-hidden">
            <div className="h-[440px]">
              <MapView
                grid={grid}
                activeLayers={{ ...activeLayers, terrain: true, flood: false, depth: false, velocity: false, arrival: false }}
              />
            </div>
          </Panel>

          <Panel title="Downstream Reach Summary">
            <div className="p-4 space-y-3 text-sm">
              <SummaryRow label="Settlements in reach" value="12" />
              <SummaryRow label="Roads mapped" value="15 segments" />
              <SummaryRow label="Bridges" value="5" />
              <SummaryRow label="Hospitals" value="3" />
              <SummaryRow label="Schools" value="5" />
              <SummaryRow label="Critical facilities" value="5" />
              <SummaryRow label="Downstream reach length" value="~21 km" />
              <SummaryRow label="Terrain resolution" value="160 m grid cells" />
            </div>
          </Panel>
        </div>

        <Panel title="Methodology Note" className="p-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            This study area uses a procedurally generated demonstration terrain model representing a
            realistic river-valley cross-section downstream of the dam, bundled with a complete synthetic
            asset dataset (settlements, roads, bridges and critical facilities). It is designed to
            demonstrate the full AegisFlow workflow without requiring external DEM or GIS data sources.
            Real elevation and asset datasets can be substituted through the same data pipeline for
            operational deployments.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-slate-200 font-medium text-xs">{value}</span>
    </div>
  );
}
