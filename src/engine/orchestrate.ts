import type { BreachScenario, SimulationResult } from "../types";
import { generateTerrain } from "./terrain";
import { runSimulation } from "./simulation";
import { computeExposure } from "./exposure";
import { DAM, SETTLEMENTS } from "../data/demoData";
import type { RiskWeights } from "./risk";

export async function executeScenario(
  scenario: BreachScenario,
  arrivalThresholdM: number,
  riskWeights: RiskWeights,
  onStage: (progress: number, label: string) => void
): Promise<SimulationResult> {
  const grid = generateTerrain(DAM.lat, DAM.lng, 42);

  const raw = await runSimulation(grid, scenario, DAM.reservoirCapacity_mcm, arrivalThresholdM, (u) =>
    onStage(u.progress, u.stageLabel)
  );

  const impacts = computeExposure(grid, raw.cellResults, scenario.durationMin, riskWeights);

  const floodedAreaKm2 = raw.frames[raw.frames.length - 1]?.floodedAreaKm2 ?? 0;
  const maxDepth = Math.max(0, ...raw.cellResults.map((c) => c.maxDepth));
  const maxVelocity = Math.max(0, ...raw.cellResults.map((c) => c.maxVelocity));

  const floodedSettlementIds = new Set(
    impacts.filter((i) => i.assetType === "settlement" && i.flooded).map((i) => i.assetId)
  );
  const populationExposed = SETTLEMENTS.filter((s) => floodedSettlementIds.has(s.id)).reduce(
    (sum, s) => sum + s.population,
    0
  );

  const roadImpacts = impacts.filter((i) => i.assetType === "road" && i.flooded);
  const roadsAffectedKm = roadImpacts.length * 1.6; // approx affected length per flooded segment (demo heuristic)

  const criticalFacilitiesAffected = impacts.filter((impact) => impact.assetType === "facility" && impact.flooded).length;

  const arrivalTimes = impacts.map((i) => i.arrivalMin).filter((v): v is number => v !== null);
  const earliestArrivalMin = arrivalTimes.length > 0 ? Math.min(...arrivalTimes) : null;

  const result: SimulationResult = {
    id: `SIM-${scenario.id}-${Date.now()}`,
    scenarioId: scenario.id,
    status: "complete",
    progress: 100,
    stageLabel: "Simulation Complete",
    grid,
    frames: raw.frames,
    cellResults: raw.cellResults,
    impacts,
    summary: {
      floodedAreaKm2,
      populationExposed,
      roadsAffectedKm: Math.round(roadsAffectedKm * 10) / 10,
      criticalFacilitiesAffected,
      maxDepth,
      maxVelocity,
      earliestArrivalMin,
    },
    runAt: Date.now(),
  };

  return result;
}
