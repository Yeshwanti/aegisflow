# AegisFlow

### AI-Enabled Dynamic Dam-Break Inundation Modelling and Disaster Decision-Support System

Problem Statement: **SIH26161**

AegisFlow is a scenario-based, terrain-aware dam-break inundation and disaster
decision-support platform. It transforms configurable breach scenarios and
geospatial terrain data into time-dependent flood propagation, arrival-time
intelligence, infrastructure exposure and risk-prioritization information
through an integrated hydrodynamic–GIS–AI workflow.

It is **not** just a flood map, an "AI that predicts floods", or an "AI that
decides evacuation." It is a complete decision-support platform that lets
authorities simulate, visualize, quantify, assess and prioritize the
consequences of different dam-break scenarios.

---

## 1. Architecture decision (read this first)

The brief called for a Python/FastAPI backend with PostgreSQL/PostGIS and a
separate simulation service. This prototype instead runs the **entire
pipeline client-side** (TypeScript, in the browser):

- terrain generation, hydrodynamic simulation, GIS exposure joins, risk
  scoring, and the AI insights engine are all real, executable code in
  `src/engine/`
- there is **no server to start, no database to provision, and no key
  required for the core demo** — `npm install && npm run dev` is the base
  setup

This was a deliberate choice to satisfy the brief's own hard requirement
("the evaluator must not need to configure a database, wait for external
APIs, or perform complicated setup — the core application must work
completely offline/local"). The trade-off is that Section 26/27's
FastAPI/PostgreSQL/NumPy/GeoPandas stack is **not** what's running — see
"Migrating to a real backend" below for how the same engine code maps onto
that architecture if you need it for the full SIH submission.

Every simulation number on screen is computed from the bundled demo dataset
through real algorithms — there is no hard-coded fake data standing in for
computed results. See §4 for exactly which algorithms.

### Technology stack

- React 19, TypeScript 6, and Vite 8 for the client application
- React Router for page navigation
- Zustand with browser `localStorage` persistence for demo/session settings
- MapLibre GL JS for raster and vector GIS layers
- Recharts for analytics/comparison charts; jsPDF for downloadable reports
- Tailwind CSS, Lucide icons, and Framer Motion for the existing interface

---

## 2. Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). Sign in with
the demo authority account shown on the login screen, or click
**"Launch Demonstration Access."**

```
Username: authority@aegisflow.local
Password: Aegis@2026
```

To build a production bundle:

```bash
npm run build
npm run preview
```

No environment variables, API keys, backend, or external services are
required for the core demo. MapLibre GL JS renders the map; optional
background tiles are fetched from the public CARTO basemap CDN for context
only. If tiles are unavailable or the machine is offline, the map uses its
local dark background and still renders the locally generated terrain,
inundation, river, study-area boundary, and asset layers. No `.env` file is
needed for local simulation. To remove CARTO's tile watermark and load its
optional background tiles, create `.env.local` in the project root:

```env
VITE_CARTO_BASEMAP_KEY=your_carto_basemaps_key
```

Request this key from [CARTO Basemaps](https://carto.com/basemaps/apikey/),
then restart the Vite dev server. This is a public browser key because tile
requests originate in the browser; never put a broadly privileged API
access token or private data credential in a `VITE_` variable. Restrict the
basemap key where CARTO allows, and do not commit `.env.local`.

---

## 3. Demo credentials

| Field | Value |
|---|---|
| Username | `authority@aegisflow.local` |
| Password | `Aegis@2026` |

This is local, in-browser authentication for prototype purposes only (see
§8 Security).

---

## 4. How the simulation actually works

All of this is real, running code — not animation or a canned sequence.

### Terrain (`src/engine/terrain.ts`)
A seeded procedural generator (`mulberry32` PRNG) builds a 130×95 cell
elevation grid (160 m cells, ~21 km downstream × ~15 km cross-valley)
representing a meandering river channel, floodplain terraces, valley walls,
and upland terrain, with the channel path following a multi-frequency sine
meander. This is clearly a **synthetic demonstration DEM**, not measured
elevation data — the UI labels it as such throughout.

### Hydrodynamic engine (`src/engine/simulation.ts`)
1. **Breach discharge** — peak outflow estimated with a broad-crested-weir
   approximation `Qp = 1.7 · b · h^1.5`, then shaped into a hydrograph that
   rises linearly to peak over the configured formation time and decays
   exponentially afterward (decay constant scaled to reservoir capacity).
2. **Propagation** — a diffusive-wave cellular-automata scheme. Each
   substep, every wet cell computes its water-surface elevation, finds
   downhill neighbors, and transfers a CFL-limited fraction of its volume
   (bounded by the shallow-water gravity wave speed `√(g·depth)`) toward
   them, weighted by head difference.
3. **Velocity** — estimated per cell via Manning's equation using local
   depth and the steepest downhill water-surface slope.
4. **Arrival time** — first timestep at which a cell's depth crosses the
   configurable threshold (default 0.10 m).

Internal timestep is 8–25 seconds depending on the selected resolution
(Fast/Standard/Detailed); results are captured as 7 output frames across
the configured simulation duration (default 60 min → frames at 0,10,…,60).

This is explicitly a **prototype hydrodynamic approximation** — described
that way in the app's Methodology page — not a validated full
shallow-water-equations (St. Venant) solver such as HEC-RAS.

### GIS exposure (`src/engine/exposure.ts`)
Each settlement/road/bridge/facility is spatially sampled against the
simulation grid (nearest-cell search with a small radius, or per-vertex
sampling for road lines) to compute flooded status, max depth, max
velocity, and arrival time.

### Risk engine (`src/engine/risk.ts`)
A transparent, configurable weighted model:

```
score = depth·w1 + velocity·w2 + arrival·w3 + population·w4 + infrastructure·w5
```

with default weights and LOW/MODERATE/HIGH/CRITICAL thresholds editable
under **System Settings → Risk Model Weights**. Every risk badge in the app
can be traced back to its per-factor point contribution on the **Risk
Priorities** page. Weight edits immediately recalculate the cached exposure
scores; the active and comparison dashboards read those shared results.

### AI decision-support (`src/engine/insights.ts`)
A deterministic local analysis engine — no cloud LLM call — that reads the
computed `SimulationResult` and produces structured, human-readable
observations ("Village X shows the earliest estimated arrival…"). It is
explicitly labeled "Decision-support analysis" everywhere it appears, never
claims to predict floods or issue evacuation orders, and always ends with a
disclaimer that authorities retain operational responsibility.

---

## 5. Bundled demo dataset

| Asset type | Count |
|---|---|
| Dam | 1 — Mettur Demonstration Dam (`DAM-001`) |
| Settlements | 12 |
| Roads | 15 segments |
| Bridges | 5 |
| Hospitals | 3 |
| Schools | 5 |
| Police / power facilities | 4 |
| Predefined breach scenarios | 3 (Minor / Moderate / Severe) |

All names, coordinates and populations are synthetic and generated for
demonstration purposes; the UI displays a persistent **"Demo Simulation
Data"** badge so this is never presented as real-world measured data.

The seeded A/B breach presets are intentionally distinct. Under the default
arrival threshold and risk settings, the deterministic local engine produces
the following representative results (the values update when settings
change):

| Scenario | Breach width × depth | Formation | Flooded area | Max depth | Population exposed | Flooded critical facilities |
|---|---:|---:|---:|---:|---:|---:|
| A — Minor | 30 m × 12 m | 25 min | 6.1 km² | 3.82 m | 13,500 | 3 |
| B — Moderate | 50 m × 20 m | 10 min | 12.8 km² | 9.65 m | 18,980 | 7 |

---

## 6. Project structure

```
src/
  types.ts                shared TypeScript interfaces
  data/demoData.ts        bundled dam, settlements, roads, bridges, facilities, scenarios
  engine/
    terrain.ts             synthetic DEM generator
    simulation.ts          hydrodynamic solver
    exposure.ts             GIS spatial join / impact computation
    risk.ts                  weighted risk scoring
    insights.ts              deterministic decision-support text generator
    raster.ts                canvas raster generation for map overlays
    orchestrate.ts           ties the pipeline together into a SimulationResult
  store/useAppStore.ts     zustand global state (auth, scenarios, results, layers, settings)
  hooks/useSim.ts          convenience hooks (active scenario/result, auto-run demo)
  components/
    AppShell.tsx            sidebar + layout
    MapView.tsx              MapLibre GL map with raster + vector overlays
    ui.tsx                   shared UI primitives (Panel, MetricCard, RiskBadge, Button…)
  pages/                   one file per navigation item (see below)
```

## 7. Navigation / feature map

| Page | Route | What it does |
|---|---|---|
| Command Center | `/` | Live metrics, flood-extent map, AI insights, top priorities |
| Dam & Study Areas | `/dams` | Dam profile, reservoir stats, terrain preview |
| Scenario Lab | `/scenario-lab` | Configure/save/duplicate/run breach scenarios |
| Live Simulation | `/simulation` | Time-stepped playback, layer control, click-to-inspect |
| Impact Analysis | `/impact` | Sortable/filterable tables per asset type, CSV export |
| Risk Priorities | `/priorities` | Ranked list with map fly-to and risk explainability |
| Scenario Comparison | `/comparison` | Side-by-side A/B/C comparison, charts, AI comparison insights |
| GIS Explorer | `/gis` | Full layer control, search, asset inspection drawer |
| Reports | `/reports` | Generates a downloadable PDF report (jsPDF) |
| System Settings | `/settings` | Simulation defaults, risk weights, system status, reset demo data |
| Methodology | `/about` | Scientific transparency / scope disclaimer |

## 8. Security notes (prototype scope)

- Authentication is a local, in-memory check against a single demo account
  — **not** production-grade auth. A real deployment needs a proper
  identity provider and hashed/salted credential storage server-side.
- No secrets are committed. There is nothing to put in a `.env` file for
  the core demo since no external API is called.
- All computation happens client-side; there is currently no server-side
  input validation because there is no server.

## 9. Persistence, settings, and reset

The Zustand app store persists authentication state, active scenario,
custom scenarios, comparison selection, map layer visibility, risk weights,
the arrival-depth threshold, and the default duration for new scenarios in
browser `localStorage`. Large simulation rasters/results are intentionally
not serialized; after a page refresh the selected scenario is recomputed
locally, so the dashboard returns with current results without storing
typed-array grids as JSON.

The arrival-depth threshold is used by the simulation engine to identify
flooded cells and arrival times. Changing it clears cached runs so the next
simulation view computes with the new threshold. Risk-weight changes
re-score existing exposure records. Default duration applies to new custom
scenario drafts; existing scenarios retain their own duration.

**System Settings → Reset Demo Data** restores the original seeded
scenarios, default risk and simulation settings, comparison selection, and
map layer visibility. It clears locally saved custom scenarios/results but
preserves the current in-browser demonstration login.

## 10. GIS and map behavior

The map uses the installed MapLibre GL JS library. The simulation raster is
generated locally from the synthetic terrain grid. Vector layers include
the dam, a generated downstream river centerline, the study-area boundary,
settlements, roads, bridges, facilities, and high/critical-risk locations.
Layer checkboxes control these layers; the selected scenario/result drives
flood extent, depth, velocity, arrival time, and risk symbology. Facility
and other supported asset clicks open the corresponding simulation impact
details. The CARTO basemap is optional visual context and requires internet
access; it does not require a key and is not part of the simulation.

## 11. Migrating to a real backend (Sections 26–27 of the brief)

The engine functions in `src/engine/` are pure, side-effect-free TypeScript
(`grid + scenario -> result`). To migrate to the FastAPI/PostgreSQL/
GeoPandas/Rasterio architecture originally specified:

1. Port `terrain.ts`/`simulation.ts` logic to NumPy/SciPy (the algorithm —
   weir discharge hydrograph -> CFL-limited diffusive routing -> Manning
   velocity — translates directly).
2. Replace `src/data/demoData.ts` with PostGIS tables (`Dam`, `Settlement`,
   `Road`, `Bridge`, `Facility`) and `src/engine/exposure.ts`'s spatial
   sampling with GeoPandas/Shapely spatial joins.
3. Expose the REST endpoints listed in the original brief
   (`/api/dams`, `/api/scenarios`, `/api/simulations`, …) around the same
   functions, and stream progress over WebSocket/SSE instead of the current
   in-process `onStage` callback.
4. Point `src/store/useAppStore.ts`'s `runActiveScenario` at those
   endpoints instead of calling `executeScenario` directly.

## 12. Known limitations

- Single study area (one dam) is bundled; the data layer is structured to
  add more but no multi-dam picker UI exists yet.
- The hydrodynamic model is a simplified 2D diffusive-wave approximation,
  not a full shallow-water-equations solver — appropriate for a decision-
  support prototype and scenario comparison, not for certified engineering
  analysis.
- No offline basemap tiles are bundled; CARTO tiles require internet for
  background context. Local simulation and GIS layers remain available
  without tiles.
- No automated test suite is included in this build.
- Authentication and persistence are browser-local prototype mechanisms,
  not secure multi-user identity or server-side storage.

## 13. Future enhancements

- Real DEM (SRTM/Bhuwan) and OpenStreetMap ingestion pipeline
- Reservoir telemetry / live river-level integration
- Multi-dam study area picker
- Full shallow-water-equations (2D St. Venant) solver option for
  higher-fidelity runs
- Server-side simulation queue with WebSocket progress streaming
