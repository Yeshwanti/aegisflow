import type { SimulationGrid } from "../types";

// Deterministic seeded PRNG (mulberry32) so terrain + demo data are reproducible
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GRID_ROWS = 130;
export const GRID_COLS = 95;
export const CELL_SIZE_M = 160; // ~20.8km downstream x ~15.2km cross-valley

// Downstream direction (unit vector in lat/lng-ish local plane, row axis = downstream)
// Row increases downstream (south-southeast), col increases across-valley (west->east)
const DOWN_LAT = -0.00092; // per row, degrees latitude change (heading south)
const DOWN_LNG = 0.00048; // per row, slight eastward drift (meander bias)
const CROSS_LAT = 0.00048; // per col
const CROSS_LNG = 0.00092; // per col (perpendicular-ish)

export function riverCenterlineCol(row: number): number {
  // Meandering centerline across the valley width as a function of downstream row
  const base = GRID_COLS * 0.5;
  const meander =
    9 * Math.sin(row / 14) + 4 * Math.sin(row / 6.5 + 1.3) + 2.5 * Math.sin(row / 3.1);
  return base + meander;
}

export function gridToLatLng(row: number, col: number, damLat: number, damLng: number) {
  const lat = damLat + row * DOWN_LAT + col * CROSS_LAT - (GRID_COLS / 2) * CROSS_LAT;
  const lng = damLng + row * DOWN_LNG + col * CROSS_LNG - (GRID_COLS / 2) * CROSS_LNG;
  return [lng, lat] as [number, number];
}

export function gridImageCorners(grid: {
  rows: number;
  cols: number;
  originLat: number;
  originLng: number;
}): [[number, number], [number, number], [number, number], [number, number]] {
  const { rows, cols, originLat, originLng } = grid;
  const tl = gridToLatLng(0, 0, originLat, originLng);
  const tr = gridToLatLng(0, cols - 1, originLat, originLng);
  const br = gridToLatLng(rows - 1, cols - 1, originLat, originLng);
  const bl = gridToLatLng(rows - 1, 0, originLat, originLng);
  return [tl, tr, br, bl];
}

export function latLngToGrid(lat: number, lng: number, damLat: number, damLng: number) {
  // Approximate inverse via search over row range (small grid, cheap) for demo purposes
  let best = { row: 0, col: 0, d: Infinity };
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 4) {
      const [lng2, lat2] = gridToLatLng(row, col, damLat, damLng);
      const d = (lat2 - lat) ** 2 + (lng2 - lng) ** 2;
      if (d < best.d) best = { row, col, d };
    }
  }
  return { row: best.row, col: best.col };
}

export function generateTerrain(damLat: number, damLng: number, seed = 42): SimulationGrid {
  const rand = mulberry32(seed);
  const elevation = new Float32Array(GRID_ROWS * GRID_COLS);

  // Base longitudinal slope: dam sits high (~330m), valley descends over ~21km
  const damElev = 330;
  const outletElev = 178;

  for (let row = 0; row < GRID_ROWS; row += 1) {
    const t = row / (GRID_ROWS - 1);
    // gentle non-linear drop, steeper near the dam (energy grade)
    const longSlope = damElev - (damElev - outletElev) * (1 - Math.pow(1 - t, 1.35));
    const centerCol = riverCenterlineCol(row);

    for (let col = 0; col < GRID_COLS; col += 1) {
      const distFromCenter = Math.abs(col - centerCol);
      // Valley cross-section: narrow deep channel near river, rising banks, floodplain terrace, then hills
      let crossElev: number;
      if (distFromCenter < 2.2) {
        crossElev = -2.5 + distFromCenter * 1.1; // river channel, below floodplain
      } else if (distFromCenter < 14) {
        // floodplain - gently rising
        crossElev = 1.2 * (distFromCenter - 2.2);
      } else if (distFromCenter < 30) {
        // valley wall - rises more steeply
        crossElev = 14 + 3.1 * (distFromCenter - 14);
      } else {
        // upland
        crossElev = 63 + 1.4 * (distFromCenter - 30);
      }

      // low-frequency ridge/hill noise for realism
      const noise =
        3.2 * Math.sin(row / 9 + col / 11) +
        2.1 * Math.sin(col / 5.3 - row / 17) +
        (rand() - 0.5) * 1.8;

      elevation[row * GRID_COLS + col] = longSlope + crossElev + noise;
    }
  }

  return {
    rows: GRID_ROWS,
    cols: GRID_COLS,
    cellSizeM: CELL_SIZE_M,
    originLat: damLat,
    originLng: damLng,
    elevation,
  };
}
