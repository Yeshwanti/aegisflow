import type { Bridge, Dam, Facility, RoadSeg, Settlement, BreachScenario } from "../types";
import { gridToLatLng, riverCenterlineCol } from "../engine/terrain";

export const DAM: Dam = {
  id: "DAM-001",
  name: "Mettur Demonstration Dam",
  river: "Cauvery (Demonstration Reach)",
  state: "Tamil Nadu",
  lat: 11.7898,
  lng: 77.7975,
  height_m: 65,
  length_m: 1700,
  reservoirCapacity_mcm: 2648,
  fullReservoirLevel_m: 120.1,
  yearBuilt: 1934,
  purpose: "Irrigation, Hydropower, Flood Moderation",
};

// Helper to place a point at a given downstream row, and lateral offset in cells from centerline
function place(row: number, lateralOffset: number, damLat = DAM.lat, damLng = DAM.lng) {
  const col = riverCenterlineCol(row) + lateralOffset;
  const [lng, lat] = gridToLatLng(row, col, damLat, damLng);
  return { lat, lng };
}

export const SETTLEMENTS: Settlement[] = [
  { id: "STL-01", name: "Periyakuppam", type: "village", population: 2400, elevation_m: 168, ...place(18, 3) },
  { id: "STL-02", name: "Vellaiyur", type: "village", population: 1850, elevation_m: 165, ...place(24, -6) },
  { id: "STL-03", name: "Karungal Nagar", type: "town", population: 6200, elevation_m: 160, ...place(31, 4) },
  { id: "STL-04", name: "Anaithottam", type: "village", population: 1120, elevation_m: 172, ...place(35, 12) },
  { id: "STL-05", name: "Sengunam", type: "village", population: 3050, elevation_m: 158, ...place(42, -3) },
  { id: "STL-06", name: "Then Vadakarai", type: "town", population: 5480, elevation_m: 152, ...place(50, 5) },
  { id: "STL-07", name: "Naduvattam", type: "village", population: 980, elevation_m: 176, ...place(54, -14) },
  { id: "STL-08", name: "Kombaiyur", type: "village", population: 1670, elevation_m: 148, ...place(63, 2) },
  { id: "STL-09", name: "Puthur East", type: "town", population: 4390, elevation_m: 145, ...place(72, -7) },
  { id: "STL-10", name: "Melur Junction", type: "town", population: 7150, elevation_m: 140, ...place(82, 3) },
  { id: "STL-11", name: "Odaiyur", type: "village", population: 1340, elevation_m: 143, ...place(88, 10) },
  { id: "STL-12", name: "Rajapalayam Colony", type: "village", population: 2010, elevation_m: 136, ...place(97, -4) },
];

function roadCoords(fromRow: number, toRow: number, lateral: number, step = 3): [number, number][] {
  const coords: [number, number][] = [];
  for (let r = fromRow; r <= toRow; r += step) {
    const p = place(r, lateral + Math.sin(r / 8) * 2);
    coords.push([p.lng, p.lat]);
  }
  return coords;
}

export const ROADS: RoadSeg[] = [
  { id: "RD-01", name: "NH-Demo 44 (Riverside Highway)", className: "highway", coords: roadCoords(5, 100, 6), lengthKm: 22.8 },
  { id: "RD-02", name: "SH-Demo 12", className: "state", coords: roadCoords(10, 70, -10), lengthKm: 15.4 },
  { id: "RD-03", name: "Periyakuppam Link Road", className: "rural", coords: roadCoords(14, 24, 3, 2), lengthKm: 3.1 },
  { id: "RD-04", name: "Karungal Approach Road", className: "rural", coords: roadCoords(27, 34, 4, 2), lengthKm: 2.4 },
  { id: "RD-05", name: "Sengunam Bypass", className: "state", coords: roadCoords(38, 48, -2, 2), lengthKm: 4.6 },
  { id: "RD-06", name: "Then Vadakarai Ring Road", className: "rural", coords: roadCoords(46, 56, 5, 2), lengthKm: 3.8 },
  { id: "RD-07", name: "Kombaiyur Feeder Road", className: "rural", coords: roadCoords(59, 67, 2, 2), lengthKm: 2.9 },
  { id: "RD-08", name: "Puthur Industrial Road", className: "state", coords: roadCoords(68, 78, -6, 2), lengthKm: 5.2 },
  { id: "RD-09", name: "Melur Junction Grid Road A", className: "rural", coords: roadCoords(78, 86, 3, 2), lengthKm: 2.7 },
  { id: "RD-10", name: "Melur Junction Grid Road B", className: "rural", coords: roadCoords(80, 88, -3, 2), lengthKm: 2.6 },
  { id: "RD-11", name: "Odaiyur Cross Road", className: "rural", coords: roadCoords(85, 92, 9, 2), lengthKm: 2.1 },
  { id: "RD-12", name: "Rajapalayam Access Road", className: "rural", coords: roadCoords(93, 100, -4, 2), lengthKm: 2.3 },
  { id: "RD-13", name: "Upstream Reservoir Road", className: "state", coords: roadCoords(0, 8, -12), lengthKm: 3.4 },
  { id: "RD-14", name: "Eastern Ridge Road", className: "rural", coords: roadCoords(20, 60, 24), lengthKm: 12.6 },
  { id: "RD-15", name: "Western Terrace Road", className: "rural", coords: roadCoords(15, 55, -26), lengthKm: 11.9 },
];

export const BRIDGES: Bridge[] = [
  { id: "BR-01", name: "Periyakuppam River Bridge", road: "NH-Demo 44", spanM: 180, ...place(19, 6) },
  { id: "BR-02", name: "Karungal Crossing", road: "SH-Demo 12", spanM: 140, ...place(30, 0) },
  { id: "BR-03", name: "Sengunam Causeway", road: "NH-Demo 44", spanM: 95, ...place(43, 5) },
  { id: "BR-04", name: "Then Vadakarai Bridge", road: "NH-Demo 44", spanM: 220, ...place(51, 6) },
  { id: "BR-05", name: "Melur Junction Bridge", road: "SH-Demo 12", spanM: 165, ...place(81, 5) },
];

export const FACILITIES: Facility[] = [
  { id: "FAC-01", name: "Karungal Government Hospital", type: "hospital", capacity: 120, ...place(31, 2) },
  { id: "FAC-02", name: "Then Vadakarai Community Hospital", type: "hospital", capacity: 80, ...place(50, 3) },
  { id: "FAC-03", name: "Melur Junction District Hospital", type: "hospital", capacity: 200, ...place(83, 1) },
  { id: "FAC-04", name: "Periyakuppam Primary School", type: "school", capacity: 340, ...place(18, 4) },
  { id: "FAC-05", name: "Karungal High School", type: "school", capacity: 610, ...place(32, 5) },
  { id: "FAC-06", name: "Sengunam Middle School", type: "school", capacity: 280, ...place(42, -1) },
  { id: "FAC-07", name: "Puthur East School Complex", type: "school", capacity: 520, ...place(73, -5) },
  { id: "FAC-08", name: "Melur Junction Central School", type: "school", capacity: 890, ...place(82, 6) },
  { id: "FAC-09", name: "Karungal Police Station", type: "police", ...place(31, 6) },
  { id: "FAC-10", name: "Melur Junction Police Station", type: "police", ...place(83, 4) },
  { id: "FAC-11", name: "Sengunam 33kV Substation", type: "power", ...place(41, 3) },
  { id: "FAC-12", name: "Melur Junction Grid Substation", type: "power", ...place(84, -2) },
];

const now = Date.now();

export const PREDEFINED_SCENARIOS: BreachScenario[] = [
  {
    id: "SCN-A",
    name: "Scenario A — Minor Breach",
    label: "Minor Breach",
    damId: DAM.id,
    reservoirLevel_m: 305.0,
    breachWidth_m: 30,
    breachDepth_m: 12,
    breachFormationTime_min: 25,
    breachLat: DAM.lat,
    breachLng: DAM.lng,
    durationMin: 60,
    resolution: "Standard",
    createdAt: now,
  },
  {
    id: "SCN-B",
    name: "Scenario B — Moderate Breach",
    label: "Moderate Breach",
    damId: DAM.id,
    reservoirLevel_m: 312.5,
    breachWidth_m: 50,
    breachDepth_m: 20,
    breachFormationTime_min: 10,
    breachLat: DAM.lat,
    breachLng: DAM.lng,
    durationMin: 60,
    resolution: "Standard",
    createdAt: now,
  },
  {
    id: "SCN-C",
    name: "Scenario C — Severe Breach",
    label: "Severe Breach",
    damId: DAM.id,
    reservoirLevel_m: 318.0,
    breachWidth_m: 80,
    breachDepth_m: 28,
    breachFormationTime_min: 6,
    breachLat: DAM.lat,
    breachLng: DAM.lng,
    durationMin: 60,
    resolution: "Standard",
    createdAt: now,
  },
];
