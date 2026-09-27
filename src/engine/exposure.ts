import type { AssetImpact, Bridge, Facility, GridCellResult, RoadSeg, Settlement, SimulationGrid } from "../types";
import { latLngToGrid } from "./terrain";
import { computeRisk, DEFAULT_RISK_WEIGHTS, type RiskWeights } from "./risk";
import { BRIDGES, FACILITIES, ROADS, SETTLEMENTS } from "../data/demoData";

function cellLookup(cellResults: GridCellResult[], cols: number) {
  const map = new Map<number, GridCellResult>();
  for (const c of cellResults) map.set(c.row * cols + c.col, c);
  return map;
}

// Sample the max depth/velocity/arrival within a small radius around a point
// (represents a point asset sitting within a broader terrain cell footprint)
function sampleAt(
  lat: number,
  lng: number,
  grid: SimulationGrid,
  lookup: Map<number, GridCellResult>,
  radius = 1
) {
  const { row, col } = latLngToGrid(lat, lng, grid.originLat, grid.originLng);
  let best: GridCellResult | null = null;
  for (let dr = -radius; dr <= radius; dr += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;
      const hit = lookup.get(r * grid.cols + c);
      if (hit && (!best || hit.maxDepth > best.maxDepth)) best = hit;
    }
  }
  return best;
}

function sampleAlongLine(
  coords: [number, number][],
  grid: SimulationGrid,
  lookup: Map<number, GridCellResult>
) {
  let best: GridCellResult | null = null;
  let floodedVertices = 0;
  for (const [lng, lat] of coords) {
    const hit = sampleAt(lat, lng, grid, lookup, 1);
    if (hit) {
      floodedVertices += 1;
      if (!best || hit.maxDepth > best.maxDepth) best = hit;
    }
  }
  return { best, floodedFraction: coords.length ? floodedVertices / coords.length : 0 };
}

export function computeExposure(
  grid: SimulationGrid,
  cellResults: GridCellResult[],
  maxDurationMin: number,
  riskWeights: RiskWeights = DEFAULT_RISK_WEIGHTS
): AssetImpact[] {
  const lookup = cellLookup(cellResults, grid.cols);
  const impacts: AssetImpact[] = [];

  for (const s of SETTLEMENTS as Settlement[]) {
    const hit = sampleAt(s.lat, s.lng, grid, lookup, 2);
    const risk = computeRisk({
      depth: hit?.maxDepth ?? 0,
      velocity: hit?.maxVelocity ?? 0,
      arrivalMin: hit?.arrivalMin ?? null,
      populationOrImportance: s.population,
      isCriticalFacility: false,
      maxDurationMin,
    }, riskWeights);
    impacts.push({
      assetId: s.id,
      assetType: "settlement",
      flooded: !!hit,
      maxDepth: hit?.maxDepth ?? 0,
      maxVelocity: hit?.maxVelocity ?? 0,
      arrivalMin: hit?.arrivalMin ?? null,
      riskLevel: risk.level,
      riskScore: risk.score,
      riskReasons: risk.reasons,
    });
  }

  for (const r of ROADS as RoadSeg[]) {
    const { best, floodedFraction } = sampleAlongLine(r.coords, grid, lookup);
    const risk = computeRisk({
      depth: best?.maxDepth ?? 0,
      velocity: best?.maxVelocity ?? 0,
      arrivalMin: best?.arrivalMin ?? null,
      populationOrImportance: r.className === "highway" ? 6000 : r.className === "state" ? 3000 : 900,
      isCriticalFacility: r.className === "highway",
      maxDurationMin,
    }, riskWeights);
    impacts.push({
      assetId: r.id,
      assetType: "road",
      flooded: floodedFraction > 0,
      maxDepth: best?.maxDepth ?? 0,
      maxVelocity: best?.maxVelocity ?? 0,
      arrivalMin: best?.arrivalMin ?? null,
      riskLevel: risk.level,
      riskScore: risk.score,
      riskReasons: risk.reasons,
    });
  }

  for (const b of BRIDGES as Bridge[]) {
    const hit = sampleAt(b.lat, b.lng, grid, lookup, 1);
    const risk = computeRisk({
      depth: hit?.maxDepth ?? 0,
      velocity: hit?.maxVelocity ?? 0,
      arrivalMin: hit?.arrivalMin ?? null,
      populationOrImportance: 4500,
      isCriticalFacility: true,
      maxDurationMin,
    }, riskWeights);
    impacts.push({
      assetId: b.id,
      assetType: "bridge",
      flooded: !!hit,
      maxDepth: hit?.maxDepth ?? 0,
      maxVelocity: hit?.maxVelocity ?? 0,
      arrivalMin: hit?.arrivalMin ?? null,
      riskLevel: risk.level,
      riskScore: risk.score,
      riskReasons: risk.reasons,
    });
  }

  for (const f of FACILITIES as Facility[]) {
    const hit = sampleAt(f.lat, f.lng, grid, lookup, 1);
    const isCritical = f.type === "hospital" || f.type === "power" || f.type === "police";
    const risk = computeRisk({
      depth: hit?.maxDepth ?? 0,
      velocity: hit?.maxVelocity ?? 0,
      arrivalMin: hit?.arrivalMin ?? null,
      populationOrImportance: f.capacity ?? 2000,
      isCriticalFacility: isCritical,
      maxDurationMin,
    }, riskWeights);
    impacts.push({
      assetId: f.id,
      assetType: "facility",
      flooded: !!hit,
      maxDepth: hit?.maxDepth ?? 0,
      maxVelocity: hit?.maxVelocity ?? 0,
      arrivalMin: hit?.arrivalMin ?? null,
      riskLevel: risk.level,
      riskScore: risk.score,
      riskReasons: risk.reasons,
    });
  }

  return impacts;
}
