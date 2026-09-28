import { Waves, MapPinned, Activity, Sparkles, ShieldCheck } from "lucide-react";
import { DemoTag, Panel } from "../components/ui";

export default function About() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-base-700 flex items-center justify-between px-6 bg-base-900">
        <div>
          <h1 className="text-base font-bold text-white">Methodology &amp; About</h1>
          <p className="text-xs text-slate-500">How AegisFlow works, and what it is not</p>
        </div>
        <DemoTag />
      </header>

      <div className="mx-auto w-full max-w-screen-2xl flex-1 overflow-y-auto p-6 space-y-5">
        <Panel className="p-6">
          <h2 className="text-lg font-bold text-white mb-2">What AegisFlow Does</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            AegisFlow is a scenario-based, terrain-aware dam-break inundation and disaster
            decision-support platform. It transforms configurable breach scenarios and geospatial
            terrain data into time-dependent flood propagation, arrival-time intelligence,
            infrastructure exposure and risk-prioritization information through an integrated
            hydrodynamic–GIS–AI workflow.
          </p>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-lg font-bold text-white mb-2">Why It Matters</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Static flood maps communicate where water might reach, but not how or when flooding
            evolves. Emergency authorities need to understand arrival sequencing, depth and velocity
            progression, and which specific settlements, roads, bridges and facilities are exposed at
            each stage of an unfolding breach — not just a final inundation footprint.
          </p>
        </Panel>

        <div className="grid grid-cols-2 gap-5">
          <TechCard
            icon={Waves}
            title="Hydrodynamic Modelling"
            body="A structured, simplified diffusive-wave cellular-automata solver estimates breach outflow using a broad-crested-weir discharge approximation, then routes water across a terrain grid using shallow-water wave-speed-limited transfer and Manning's-equation velocity estimation. This is a prototype hydrodynamic approximation — not a certified full shallow-water-equations solver."
          />
          <TechCard
            icon={MapPinned}
            title="GIS Exposure"
            body="Simulation grid results are spatially joined against settlement, road, bridge and critical-facility datasets to compute per-asset flooded status, maximum depth, maximum velocity and arrival time."
          />
          <TechCard
            icon={Activity}
            title="Risk Analysis"
            body="A transparent, configurable weighted model combines depth, velocity, arrival time, population/importance and infrastructure criticality into a risk score and LOW–CRITICAL classification, with visible per-factor contributions."
          />
          <TechCard
            icon={Sparkles}
            title="AI-Assisted Prioritization"
            body="A deterministic local analysis engine summarizes simulation and risk output into structured, human-readable observations. It analyzes computed results — it does not predict floods or issue evacuation decisions."
          />
        </div>

        <Panel className="p-6 border-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-white">Scientific Transparency &amp; Scope</h2>
          </div>
          <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
            <li>This is a decision-support prototype, not a certified operational flood forecasting system.</li>
            <li>Hydrodynamic modelling provides a structured, simplified physical simulation layer for demonstration and planning discussion purposes.</li>
            <li>Bundled terrain and asset data is clearly labelled demonstration data unless configured with validated real-world datasets.</li>
            <li>AI-assisted output is a decision-support analysis of computed results — it does not independently predict floods or decide evacuations.</li>
            <li>Human authorities remain fully responsible for all operational emergency-management decisions.</li>
            <li>No validation results, emergency certification, or regulatory compliance claims are made by this prototype.</li>
          </ul>
        </Panel>

        <div className="text-center text-xs text-slate-600 pb-6">
          Smart India Hackathon 2026 · Problem Statement SIH26161 · AegisFlow Prototype
        </div>
      </div>
    </div>
  );
}

function TechCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <Panel className="p-5">
      <Icon size={20} className="text-accent mb-3" />
      <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
    </Panel>
  );
}
