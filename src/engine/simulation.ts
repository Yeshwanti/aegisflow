import type { BreachScenario, GridCellResult, SimulationGrid, TimestepFrame } from "../types";
import { latLngToGrid } from "./terrain";

export interface SimStageUpdate {
  progress: number; // 0-100
  stageLabel: string;
}

export interface RawSimOutput {
  grid: SimulationGrid;
  frames: TimestepFrame[];
  cellResults: GridCellResult[];
}

const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const G = 9.81;
const MANNING_N = 0.045; // natural floodplain/channel composite roughness
// Simplified broad-crested-weir peak breach discharge estimate:
// Qp = Cw * b * h^1.5  (Cw ~ 1.7 typical broad-crested weir coefficient)
function peakDischarge(breachWidth: number, breachDepth: number) {
  return 1.7 * breachWidth * Math.pow(Math.max(breachDepth, 0.1), 1.5);
}

// Breach outflow hydrograph: linear rise to peak over formation time,
// then exponential recession as the reservoir drains.
function dischargeAtTime(tMin: number, scenario: BreachScenario, reservoirCapacityMcm: number) {
  const Qp = peakDischarge(scenario.breachWidth_m, scenario.breachDepth_m);
  const tf = Math.max(scenario.breachFormationTime_min, 1);
  if (tMin <= tf) {
    return Qp * (tMin / tf);
  }
  const decayConst = Math.min(90, Math.max(15, reservoirCapacityMcm / 50));
  return Qp * Math.exp(-(tMin - tf) / decayConst);
}

export async function runSimulation(
  grid: SimulationGrid,
  scenario: BreachScenario,
  reservoirCapacityMcm: number,
  arrivalThresholdM: number,
  onStage: (u: SimStageUpdate) => void
): Promise<RawSimOutput> {
  const { rows, cols, cellSizeM, elevation } = grid;
  const cellArea = cellSizeM * cellSizeM;
  const n = rows * cols;

  onStage({ progress: 4, stageLabel: "Loading terrain grid" });
  await tick();

  const depth = new Float32Array(n);
  const maxDepth = new Float32Array(n);
  const maxVelocity = new Float32Array(n);
  const arrivalMin = new Float32Array(n).fill(-1);
  const velocitySnapshot = new Float32Array(n);

  onStage({ progress: 10, stageLabel: "Preparing breach hydrograph" });
  await tick();

  const { row: breachRow, col: breachCol } = latLngToGrid(
    scenario.breachLat,
    scenario.breachLng,
    grid.originLat,
    grid.originLng
  );
  const breachIdx = clampIdx(breachRow, breachCol, rows, cols);

  onStage({ progress: 16, stageLabel: "Initializing water state" });
  await tick();

  // Resolution controls internal integration timestep (stability/detail tradeoff)
  const dtSec = scenario.resolution === "Detailed" ? 8 : scenario.resolution === "Fast" ? 25 : 15;
  const durationMin = scenario.durationMin;
  const totalSteps = Math.ceil((durationMin * 60) / dtSec);

  const outputIntervalMin = durationMin / 6;
  const frames: TimestepFrame[] = [];

  let simMin = 0;
  const substepsPerTick = Math.max(1, Math.floor(totalSteps / 40)); // batch substeps between yields

  const depthBuf = new Float32Array(n);

  const totalStages = 6; // approx run stages for progress mapping
  let framesCaptured = 0;

  for (let step = 0; step < totalSteps; step += 1) {
    simMin = (step * dtSec) / 60;

    // --- inject breach discharge into breach cell ---
    const Q = dischargeAtTime(simMin, scenario, reservoirCapacityMcm); // m3/s
    const volumeIn = Q * dtSec; // m3 this substep
    depth[breachIdx] += volumeIn / cellArea;

    // --- diffusive-wave cellular automata routing ---
    depthBuf.set(depth);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const idx = r * cols + c;
        const d = depth[idx];
        if (d < 0.002) continue;

        const wse = elevation[idx] + d;
        let dhSum = 0;
        const dhs = [0, 0, 0, 0];
        let maxSlope = 0;

        for (let k = 0; k < 4; k += 1) {
          const nr = r + NEIGHBORS[k][0];
          const nc = c + NEIGHBORS[k][1];
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const nIdx = nr * cols + nc;
          const nWse = elevation[nIdx] + depth[nIdx];
          const dh = wse - nWse;
          if (dh > 0) {
            dhs[k] = dh;
            dhSum += dh;
            const slope = dh / cellSizeM;
            if (slope > maxSlope) maxSlope = slope;
          }
        }

        if (dhSum <= 0) continue;

        // shallow-water gravity wave speed governs CFL-limited transferable fraction
        const waveSpeed = Math.sqrt(G * Math.max(d, 0.02));
        const travelFraction = Math.min(0.5, (waveSpeed * dtSec) / cellSizeM);
        const outflowVol = d * cellArea * travelFraction;

        for (let k = 0; k < 4; k += 1) {
          if (dhs[k] <= 0) continue;
          const nr = r + NEIGHBORS[k][0];
          const nc = c + NEIGHBORS[k][1];
          const nIdx = nr * cols + nc;
          const share = (dhs[k] / dhSum) * outflowVol;
          depthBuf[nIdx] += share / cellArea;
          depthBuf[idx] -= share / cellArea;
        }

        // Manning-based velocity estimate for reporting
        const v = (1 / MANNING_N) * Math.pow(d, 2 / 3) * Math.sqrt(Math.max(maxSlope, 0.0004));
        velocitySnapshot[idx] = Math.min(v, 12); // physically-reasonable cap for floodplain/channel flow
      }
    }

    for (let i = 0; i < n; i += 1) {
      if (depthBuf[i] < 0) depthBuf[i] = 0;
    }
    depth.set(depthBuf);

    // --- track maxima + arrival time ---
    for (let i = 0; i < n; i += 1) {
      const d = depth[i];
      if (d > maxDepth[i]) maxDepth[i] = d;
      const v = velocitySnapshot[i];
      if (v > maxVelocity[i]) maxVelocity[i] = v;
      if (arrivalMin[i] < 0 && d >= arrivalThresholdM) {
        arrivalMin[i] = simMin;
      }
    }

    // --- capture output frame ---
    if (simMin >= framesCaptured * outputIntervalMin - 1e-6 && framesCaptured <= 6) {
      let floodedCount = 0;
      let fMaxDepth = 0;
      let fMaxVel = 0;
      for (let i = 0; i < n; i += 1) {
        if (depth[i] >= arrivalThresholdM) floodedCount += 1;
        if (depth[i] > fMaxDepth) fMaxDepth = depth[i];
        if (velocitySnapshot[i] > fMaxVel) fMaxVel = velocitySnapshot[i];
      }
      frames.push({
        tMin: Math.round(simMin),
        depth: depth.slice(),
        velocity: velocitySnapshot.slice(),
        floodedCount,
        floodedAreaKm2: (floodedCount * cellArea) / 1e6,
        maxDepth: fMaxDepth,
        maxVelocity: fMaxVel,
      });
      framesCaptured += 1;
    }

    if (step % substepsPerTick === 0) {
      const stageIdx = Math.min(totalStages - 1, Math.floor((step / totalSteps) * totalStages));
      const labels = [
        `Running timestep ${framesCaptured}/7`,
        `Running timestep ${framesCaptured}/7`,
        `Propagating flood wave`,
        `Propagating flood wave`,
        `Calculating arrival time`,
        `Processing GIS exposure`,
      ];
      onStage({
        progress: 20 + Math.round((step / totalSteps) * 65),
        stageLabel: labels[stageIdx],
      });
      await tick();
    }
  }

  // ensure final frame captured
  if (frames.length < 7) {
    let floodedCount = 0;
    let fMaxDepth = 0;
    let fMaxVel = 0;
    for (let i = 0; i < n; i += 1) {
      if (depth[i] >= arrivalThresholdM) floodedCount += 1;
      if (depth[i] > fMaxDepth) fMaxDepth = depth[i];
      if (velocitySnapshot[i] > fMaxVel) fMaxVel = velocitySnapshot[i];
    }
    frames.push({
      tMin: durationMin,
      depth: depth.slice(),
      velocity: velocitySnapshot.slice(),
      floodedCount,
      floodedAreaKm2: (floodedCount * cellArea) / 1e6,
      maxDepth: fMaxDepth,
      maxVelocity: fMaxVel,
    });
  }

  onStage({ progress: 90, stageLabel: "Calculating risk" });
  await tick();

  const cellResults: GridCellResult[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const idx = r * cols + c;
      if (maxDepth[idx] >= arrivalThresholdM) {
        cellResults.push({
          row: r,
          col: c,
          elevation: elevation[idx],
          maxDepth: maxDepth[idx],
          maxVelocity: maxVelocity[idx],
          arrivalMin: arrivalMin[idx] >= 0 ? arrivalMin[idx] : null,
        });
      }
    }
  }

  onStage({ progress: 97, stageLabel: "Finalizing results" });
  await tick();

  return { grid, frames, cellResults };
}

function clampIdx(row: number, col: number, rows: number, cols: number) {
  const r = Math.max(0, Math.min(rows - 1, row));
  const c = Math.max(0, Math.min(cols - 1, col));
  return r * cols + c;
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
