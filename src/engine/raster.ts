import type { GridCellResult, SimulationGrid, TimestepFrame } from "../types";

function makeCanvas(rows: number, cols: number) {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  return canvas;
}

export function terrainRasterURL(grid: SimulationGrid): string {
  const { rows, cols, elevation } = grid;
  const canvas = makeCanvas(rows, cols);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(cols, rows);

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < elevation.length; i += 1) {
    if (elevation[i] < min) min = elevation[i];
    if (elevation[i] > max) max = elevation[i];
  }
  const range = Math.max(1, max - min);

  // simple hypsometric ramp: deep valley (teal-green) -> floodplain (tan) -> hills (brown) -> peaks (light gray)
  const stops: [number, number, number, number][] = [
    [0.0, 30, 58, 56],
    [0.18, 61, 92, 74],
    [0.35, 122, 130, 84],
    [0.55, 150, 120, 82],
    [0.75, 110, 84, 66],
    [1.0, 214, 208, 198],
  ];

  function ramp(t: number): [number, number, number] {
    for (let i = 0; i < stops.length - 1; i += 1) {
      const [t0, r0, g0, b0] = stops[i];
      const [t1, r1, g1, b1] = stops[i + 1];
      if (t >= t0 && t <= t1) {
        const f = (t - t0) / (t1 - t0 || 1);
        return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
      }
    }
    return [stops[stops.length - 1][1], stops[stops.length - 1][2], stops[stops.length - 1][3]];
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const idx = r * cols + c;
      const t = (elevation[idx] - min) / range;
      // crude hillshade using east/south neighbor gradient
      const eIdx = c < cols - 1 ? r * cols + (c + 1) : idx;
      const sIdx = r < rows - 1 ? (r + 1) * cols + c : idx;
      const dx = elevation[eIdx] - elevation[idx];
      const dy = elevation[sIdx] - elevation[idx];
      const shade = Math.max(-1, Math.min(1, -(dx + dy) * 0.15));

      let [rr, gg, bb] = ramp(t);
      const shadeFactor = 1 + shade * 0.25;
      rr = Math.max(0, Math.min(255, rr * shadeFactor));
      gg = Math.max(0, Math.min(255, gg * shadeFactor));
      bb = Math.max(0, Math.min(255, bb * shadeFactor));

      const p = idx * 4;
      img.data[p] = rr;
      img.data[p + 1] = gg;
      img.data[p + 2] = bb;
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

const DEPTH_STOPS: [number, [number, number, number]][] = [
  [0.5, [186, 230, 253]],
  [1, [125, 211, 252]],
  [2, [56, 165, 230]],
  [3, [37, 99, 210]],
  [4, [30, 64, 175]],
  [Infinity, [49, 26, 120]],
];

const VELOCITY_STOPS: [number, [number, number, number]][] = [
  [0.5, [74, 222, 128]],
  [1.0, [163, 230, 53]],
  [1.5, [250, 204, 21]],
  [2.5, [251, 146, 60]],
  [3.5, [239, 68, 68]],
  [Infinity, [190, 18, 60]],
];

function colorForStops(v: number, stops: [number, [number, number, number]][]): [number, number, number] {
  for (const [t, c] of stops) {
    if (v <= t) return c;
  }
  return stops[stops.length - 1][1];
}

export function depthRasterURL(grid: SimulationGrid, frame: TimestepFrame): string {
  const { rows, cols } = grid;
  const canvas = makeCanvas(rows, cols);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < frame.depth.length; i += 1) {
    const d = frame.depth[i];
    const p = i * 4;
    if (d < 0.1) {
      img.data[p + 3] = 0;
      continue;
    }
    const [rr, gg, bb] = colorForStops(d, DEPTH_STOPS);
    img.data[p] = rr;
    img.data[p + 1] = gg;
    img.data[p + 2] = bb;
    img.data[p + 3] = 225;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function velocityRasterURL(grid: SimulationGrid, frame: TimestepFrame): string {
  const { rows, cols } = grid;
  const canvas = makeCanvas(rows, cols);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < frame.depth.length; i += 1) {
    const d = frame.depth[i];
    const v = frame.velocity[i];
    const p = i * 4;
    if (d < 0.1) {
      img.data[p + 3] = 0;
      continue;
    }
    const [rr, gg, bb] = colorForStops(v, VELOCITY_STOPS);
    img.data[p] = rr;
    img.data[p + 1] = gg;
    img.data[p + 2] = bb;
    img.data[p + 3] = 225;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function arrivalRasterURL(grid: SimulationGrid, cellResults: GridCellResult[], maxDurationMin: number): string {
  const { rows, cols } = grid;
  const canvas = makeCanvas(rows, cols);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < rows * cols; i += 1) {
    img.data[i * 4 + 3] = 0;
  }
  const ARRIVAL_STOPS: [number, [number, number, number]][] = [
    [15, [239, 68, 68]],
    [30, [251, 146, 60]],
    [45, [250, 204, 21]],
    [Infinity, [74, 222, 128]],
  ];
  for (const c of cellResults) {
    const idx = c.row * cols + c.col;
    const p = idx * 4;
    const t = c.arrivalMin ?? maxDurationMin;
    const [rr, gg, bb] = colorForStops(t, ARRIVAL_STOPS);
    img.data[p] = rr;
    img.data[p + 1] = gg;
    img.data[p + 2] = bb;
    img.data[p + 3] = 225;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function floodExtentRasterURL(grid: SimulationGrid, frame: TimestepFrame): string {
  const { rows, cols } = grid;
  const canvas = makeCanvas(rows, cols);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < frame.depth.length; i += 1) {
    const d = frame.depth[i];
    const p = i * 4;
    if (d < 0.1) {
      img.data[p + 3] = 0;
      continue;
    }
    img.data[p] = 34;
    img.data[p + 1] = 160;
    img.data[p + 2] = 210;
    img.data[p + 3] = 165;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}
