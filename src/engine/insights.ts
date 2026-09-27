import type { AssetImpact, SimulationResult } from "../types";
import { SETTLEMENTS, FACILITIES, BRIDGES, ROADS } from "../data/demoData";

function assetName(a: AssetImpact): string {
  if (a.assetType === "settlement") return SETTLEMENTS.find((s) => s.id === a.assetId)?.name ?? a.assetId;
  if (a.assetType === "facility") return FACILITIES.find((f) => f.id === a.assetId)?.name ?? a.assetId;
  if (a.assetType === "bridge") return BRIDGES.find((b) => b.id === a.assetId)?.name ?? a.assetId;
  return ROADS.find((r) => r.id === a.assetId)?.name ?? a.assetId;
}

/**
 * Generates structured, human-readable observations from simulation output.
 * This is a deterministic local analysis engine — NOT a predictive or
 * decision-making model. It summarizes computed simulation results only.
 */
export function generateInsights(result: SimulationResult): string[] {
  const insights: string[] = [];
  const { impacts, summary } = result;

  const critical = impacts.filter((i) => i.riskLevel === "CRITICAL");
  const high = impacts.filter((i) => i.riskLevel === "HIGH");
  const floodedFacilities = impacts.filter((i) => i.assetType === "facility" && i.flooded);
  const floodedSettlements = impacts
    .filter((i) => i.assetType === "settlement" && i.flooded)
    .sort((a, b) => (a.arrivalMin ?? 9999) - (b.arrivalMin ?? 9999));

  if (critical.length > 0) {
    insights.push(
      `${critical.length} location${critical.length > 1 ? "s have" : " has"} been classified CRITICAL priority based on combined depth, velocity, arrival-time and exposure criteria.`
    );
  } else {
    insights.push("No locations reached CRITICAL classification under the current scenario configuration and risk thresholds.");
  }

  if (floodedSettlements.length > 0) {
    const earliest = floodedSettlements[0];
    insights.push(
      `${assetName(earliest)} shows the earliest estimated arrival among monitored settlements, at approximately ${Math.round(
        earliest.arrivalMin ?? 0
      )} minutes after breach initiation.`
    );
  }

  if (floodedFacilities.length > 0) {
    const criticalFac = floodedFacilities.filter((f) => f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH");
    insights.push(
      `${floodedFacilities.length} critical facilit${floodedFacilities.length > 1 ? "ies fall" : "y falls"} within the simulated inundation extent, of which ${criticalFac.length} ${criticalFac.length === 1 ? "is" : "are"} rated HIGH or CRITICAL priority.`
    );
  }

  if (high.length > 0) {
    insights.push(`${high.length} additional location${high.length > 1 ? "s are" : " is"} classified HIGH priority and warrant monitoring alongside CRITICAL sites.`);
  }

  const affectedRoads = impacts.filter((i) => i.assetType === "road" && i.flooded);
  if (affectedRoads.length > 0) {
    insights.push(
      `${affectedRoads.length} road segment${affectedRoads.length > 1 ? "s are" : " is"} intersected by the simulated flood extent, which may constrain evacuation routing — cross-reference with the GIS Explorer road layer before dispatching response routes.`
    );
  }

  const affectedBridges = impacts.filter((i) => i.assetType === "bridge" && i.flooded);
  if (affectedBridges.length > 0) {
    insights.push(
      `${affectedBridges.length} bridge${affectedBridges.length > 1 ? "s show" : " shows"} simulated inundation; structural passability should be field-verified before use as an evacuation crossing.`
    );
  }

  insights.push(
    `Simulated inundation extent reached ${summary.floodedAreaKm2.toFixed(1)} km² with a maximum recorded depth of ${summary.maxDepth.toFixed(
      1
    )} m and peak velocity of ${summary.maxVelocity.toFixed(1)} m/s across the modeled duration.`
  );

  insights.push(
    "This output is a decision-support analysis derived from the current simulation and configured risk model — it does not constitute an evacuation order or emergency directive. Final operational decisions remain with designated authorities."
  );

  return insights;
}

export function compareScenarioInsights(
  results: { name: string; result: SimulationResult }[]
): string[] {
  if (results.length < 2) return [];
  const insights: string[] = [];
  const sorted = [...results].sort((a, b) => b.result.summary.populationExposed - a.result.summary.populationExposed);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  if (highest.result.summary.populationExposed > lowest.result.summary.populationExposed) {
    insights.push(
      `${highest.name} produces the largest exposed population among compared scenarios (${highest.result.summary.populationExposed.toLocaleString()} people), versus ${lowest.result.summary.populationExposed.toLocaleString()} in ${lowest.name}.`
    );
  }

  const areaSorted = [...results].sort((a, b) => b.result.summary.floodedAreaKm2 - a.result.summary.floodedAreaKm2);
  insights.push(
    `${areaSorted[0].name} generates the largest simulated flooded area at ${areaSorted[0].result.summary.floodedAreaKm2.toFixed(1)} km².`
  );

  const arrivalSorted = [...results]
    .filter((r) => r.result.summary.earliestArrivalMin !== null)
    .sort((a, b) => (a.result.summary.earliestArrivalMin ?? 9999) - (b.result.summary.earliestArrivalMin ?? 9999));
  if (arrivalSorted.length > 0) {
    insights.push(
      `${arrivalSorted[0].name} has the shortest earliest-arrival time at ${arrivalSorted[0].result.summary.earliestArrivalMin} minutes, indicating the least available warning lead time.`
    );
  }

  const criticalSorted = [...results].sort(
    (a, b) =>
      b.result.impacts.filter((i) => i.riskLevel === "CRITICAL").length -
      a.result.impacts.filter((i) => i.riskLevel === "CRITICAL").length
  );
  const highestCriticalCount = criticalSorted[0].result.impacts.filter((i) => i.riskLevel === "CRITICAL").length;
  if (highestCriticalCount > 0) {
    insights.push(
      `${criticalSorted[0].name} has the most CRITICAL-priority locations (${highestCriticalCount}) among the compared scenarios.`
    );
  } else {
    insights.push("No compared scenario produces CRITICAL-priority locations under the current risk thresholds.");
  }

  return insights;
}
