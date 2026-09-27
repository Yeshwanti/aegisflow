import type { RiskLevel } from "../types";

export interface RiskWeights {
  depth: number;
  velocity: number;
  arrival: number;
  population: number;
  infrastructure: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  depth: 0.30,
  velocity: 0.20,
  arrival: 0.20,
  population: 0.15,
  infrastructure: 0.15,
};

export const RISK_THRESHOLDS = {
  MODERATE: 35,
  HIGH: 60,
  CRITICAL: 80,
};

export interface RiskInput {
  depth: number; // m
  velocity: number; // m/s
  arrivalMin: number | null;
  populationOrImportance: number; // people, or a normalized importance score for infra
  isCriticalFacility: boolean;
  maxDurationMin: number;
}

export interface RiskOutput {
  score: number;
  level: RiskLevel;
  reasons: string[];
  factors: { label: string; value: string; contribution: number }[];
}

function norm(v: number, max: number) {
  return Math.max(0, Math.min(1, v / max));
}

export function computeRisk(input: RiskInput, weights: RiskWeights = DEFAULT_RISK_WEIGHTS): RiskOutput {
  const depthScore = norm(input.depth, 5) * 100;
  const velocityScore = norm(input.velocity, 4) * 100;
  const arrivalScore =
    input.arrivalMin === null
      ? 0
      : (1 - norm(input.arrivalMin, input.maxDurationMin)) * 100;
  const populationScore = norm(input.populationOrImportance, 7000) * 100;
  const infraScore = input.isCriticalFacility ? 100 : 25;

  const score =
    depthScore * weights.depth +
    velocityScore * weights.velocity +
    arrivalScore * weights.arrival +
    populationScore * weights.population +
    infraScore * weights.infrastructure;

  let level: RiskLevel = "LOW";
  if (score >= RISK_THRESHOLDS.CRITICAL) level = "CRITICAL";
  else if (score >= RISK_THRESHOLDS.HIGH) level = "HIGH";
  else if (score >= RISK_THRESHOLDS.MODERATE) level = "MODERATE";

  const reasons: string[] = [];
  if (depthScore > 55) reasons.push("High simulated flood depth");
  if (velocityScore > 55) reasons.push("High flow velocity");
  if (arrivalScore > 55) reasons.push("Short flood arrival time");
  if (populationScore > 55) reasons.push("Large exposed population");
  if (input.isCriticalFacility) reasons.push("Critical infrastructure present");
  if (reasons.length === 0) reasons.push("Exposure below elevated-risk criteria on all factors");

  return {
    score: Math.round(score * 10) / 10,
    level,
    reasons,
    factors: [
      { label: "Depth", value: `${input.depth.toFixed(2)} m`, contribution: Math.round(depthScore * weights.depth) },
      { label: "Velocity", value: `${input.velocity.toFixed(2)} m/s`, contribution: Math.round(velocityScore * weights.velocity) },
      {
        label: "Arrival",
        value: input.arrivalMin === null ? "Not reached" : `${Math.round(input.arrivalMin)} min`,
        contribution: Math.round(arrivalScore * weights.arrival),
      },
      {
        label: "Population / Importance",
        value: input.populationOrImportance.toLocaleString(),
        contribution: Math.round(populationScore * weights.population),
      },
      {
        label: "Critical Infrastructure",
        value: input.isCriticalFacility ? "Yes" : "No",
        contribution: Math.round(infraScore * weights.infrastructure),
      },
    ],
  };
}
