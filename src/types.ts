export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface Dam {
  id: string;
  name: string;
  river: string;
  state: string;
  lat: number;
  lng: number;
  height_m: number;
  length_m: number;
  reservoirCapacity_mcm: number;
  fullReservoirLevel_m: number;
  yearBuilt: number;
  purpose: string;
}

export interface Settlement {
  id: string;
  name: string;
  type: "village" | "town";
  population: number;
  lat: number;
  lng: number;
  elevation_m: number;
}

export interface RoadSeg {
  id: string;
  name: string;
  className: "highway" | "state" | "rural";
  coords: [number, number][]; // lng,lat
  lengthKm: number;
}

export interface Bridge {
  id: string;
  name: string;
  lat: number;
  lng: number;
  road: string;
  spanM: number;
}

export interface Facility {
  id: string;
  name: string;
  type: "hospital" | "school" | "police" | "power";
  lat: number;
  lng: number;
  capacity?: number;
}

export interface BreachScenario {
  id: string;
  name: string;
  label: "Minor Breach" | "Moderate Breach" | "Severe Breach" | "Custom";
  damId: string;
  reservoirLevel_m: number;
  breachWidth_m: number;
  breachDepth_m: number;
  breachFormationTime_min: number;
  breachLat: number;
  breachLng: number;
  durationMin: 30 | 60 | 90 | 120;
  resolution: "Fast" | "Standard" | "Detailed";
  createdAt: number;
}

export interface GridCellResult {
  row: number;
  col: number;
  elevation: number;
  maxDepth: number;
  maxVelocity: number;
  arrivalMin: number | null; // null = never flooded
}

export interface TimestepFrame {
  tMin: number;
  depth: Float32Array; // flattened rows*cols
  velocity: Float32Array;
  floodedCount: number;
  floodedAreaKm2: number;
  maxDepth: number;
  maxVelocity: number;
}

export interface SimulationGrid {
  rows: number;
  cols: number;
  cellSizeM: number;
  originLat: number;
  originLng: number;
  elevation: Float32Array;
}

export interface AssetImpact {
  assetId: string;
  assetType: "settlement" | "road" | "bridge" | "facility";
  flooded: boolean;
  maxDepth: number;
  maxVelocity: number;
  arrivalMin: number | null;
  riskLevel: RiskLevel;
  riskScore: number;
  riskReasons: string[];
}

export interface SimulationResult {
  id: string;
  scenarioId: string;
  status: "idle" | "running" | "complete" | "failed";
  progress: number;
  stageLabel: string;
  grid: SimulationGrid;
  frames: TimestepFrame[];
  cellResults: GridCellResult[];
  impacts: AssetImpact[];
  summary: {
    floodedAreaKm2: number;
    populationExposed: number;
    roadsAffectedKm: number;
    criticalFacilitiesAffected: number;
    maxDepth: number;
    maxVelocity: number;
    earliestArrivalMin: number | null;
  };
  runAt: number;
}
