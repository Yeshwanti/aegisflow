import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AssetImpact, GridCellResult, SimulationGrid, TimestepFrame } from "../types";
import { gridImageCorners, gridToLatLng, GRID_COLS, GRID_ROWS, riverCenterlineCol } from "../engine/terrain";
import {
  arrivalRasterURL,
  depthRasterURL,
  floodExtentRasterURL,
  terrainRasterURL,
  velocityRasterURL,
} from "../engine/raster";
import { DAM, SETTLEMENTS, ROADS, BRIDGES, FACILITIES } from "../data/demoData";
import type { MapLayerKey } from "../store/useAppStore";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const CARTO_BASEMAP_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY?.trim();
const CARTO_TILE_URLS = ["a", "b", "c"].map(
  (subdomain) =>
    `https://${subdomain}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png?key=${encodeURIComponent(CARTO_BASEMAP_KEY ?? "")}`
);

const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: CARTO_BASEMAP_KEY ? {
    carto: {
      type: "raster",
      tiles: CARTO_TILE_URLS,
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  } : {},
  layers: [
    { id: "map-background", type: "background", paint: { "background-color": "#101923" } },
    ...(CARTO_BASEMAP_KEY
      ? [{ id: "carto-layer", type: "raster" as const, source: "carto", paint: { "raster-opacity": 0.55 } }]
      : []),
  ],
};

const RISK_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MODERATE: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

export interface MapViewProps {
  grid?: SimulationGrid;
  frame?: TimestepFrame;
  cellResults?: GridCellResult[];
  maxDurationMin?: number;
  activeLayers: Record<MapLayerKey, boolean>;
  impacts?: AssetImpact[];
  onSelectAsset?: (type: string, id: string) => void;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  opacity?: number;
  className?: string;
}

export default function MapView({
  grid,
  frame,
  cellResults,
  maxDurationMin = 60,
  activeLayers,
  impacts,
  onSelectAsset,
  flyTo,
  opacity = 1,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [DAM.lng, DAM.lat],
      zoom: 10.3,
      pitch: 0,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      loadedRef.current = true;
      buildStaticSources(map);
      applyLayerVisibility(map, activeLayers);
      buildRasterLayers(map, grid, frame, cellResults, maxDurationMin);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update raster overlays when data/layers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    buildRasterLayers(map, grid, frame, cellResults, maxDurationMin);
    applyLayerVisibility(map, activeLayers);
  }, [grid, frame, cellResults, maxDurationMin, activeLayers]);

  // opacity control
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    ["flood-layer", "depth-layer", "velocity-layer", "arrival-layer"].forEach((id) => {
      if (map.getLayer(id)) map.setPaintProperty(id, "raster-opacity", opacity);
    });
  }, [opacity]);

  // asset click bindings
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (layerId: string, type: string) => (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (features.length > 0) {
        const id = features[0].properties?.id;
        if (id && onSelectAsset) onSelectAsset(type, id);
      }
    };
    const layers: [string, string][] = [
      ["settlements-points", "settlement"],
      ["bridges-points", "bridge"],
      ["facilities-points", "facility"],
    ];
    const bound: [string, (e: maplibregl.MapMouseEvent) => void][] = [];
    layers.forEach(([layerId, type]) => {
      const fn = handler(layerId, type);
      map.on("click", layerId, fn);
      bound.push([layerId, fn]);
    });
    return () => {
      bound.forEach(([layerId, fn]) => {
        map.off("click", layerId, fn);
      });
    };
  }, [onSelectAsset]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom ?? 13, duration: 900 });
  }, [flyTo]);

  // update impact-based coloring
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !impacts) return;
    ["settlements-points", "bridges-points", "facilities-points"].forEach((layerId) => {
      if (!map.getLayer(layerId)) return;
    });
    updateRiskColors(map, impacts);
  }, [impacts]);

  return <div ref={containerRef} className={className ?? "w-full h-full"} />;
}

function buildStaticSources(map: maplibregl.Map) {
  const bounds = gridImageCorners({ rows: GRID_ROWS, cols: GRID_COLS, originLat: DAM.lat, originLng: DAM.lng });
  const riverCoords = Array.from({ length: GRID_ROWS }, (_, row) =>
    gridToLatLng(row, riverCenterlineCol(row), DAM.lat, DAM.lng)
  );

  map.addSource("study-area", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[...bounds, bounds[0]]] },
        properties: { name: "Synthetic downstream study area" },
      }],
    },
  });
  map.addSource("river", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "LineString", coordinates: riverCoords }, properties: { name: "Demonstration river reach" } }],
    },
  });
  map.addSource("risk-locations", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource("settlements", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: SETTLEMENTS.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: { id: s.id, name: s.name, population: s.population, risk: "LOW" },
      })),
    },
  });

  map.addSource("roads", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: ROADS.map((r) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: r.coords },
        properties: { id: r.id, name: r.name, className: r.className },
      })),
    },
  });

  map.addSource("bridges", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: BRIDGES.map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.lng, b.lat] },
        properties: { id: b.id, name: b.name, risk: "LOW" },
      })),
    },
  });

  map.addSource("facilities", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: FACILITIES.map((f) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.lng, f.lat] },
        properties: { id: f.id, name: f.name, type: f.type, risk: "LOW" },
      })),
    },
  });

  map.addSource("dam", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Point", coordinates: [DAM.lng, DAM.lat] }, properties: { id: DAM.id, name: DAM.name } },
      ],
    },
  });

  map.addLayer({
    id: "roads-line",
    type: "line",
    source: "roads",
    paint: {
      "line-color": ["match", ["get", "className"], "highway", "#94a3b8", "state", "#64748b", "#475569"],
      "line-width": ["match", ["get", "className"], "highway", 2.4, "state", 1.6, 1],
      "line-opacity": 0.85,
    },
  });

  map.addLayer({
    id: "bridges-points",
    type: "circle",
    source: "bridges",
    paint: {
      "circle-radius": 5,
      "circle-color": "#facc15",
      "circle-stroke-color": "#0a0f18",
      "circle-stroke-width": 1.5,
    },
  });

  map.addLayer({
    id: "facilities-points",
    type: "circle",
    source: "facilities",
    paint: {
      "circle-radius": 5.5,
      "circle-color": [
        "match",
        ["get", "type"],
        "hospital",
        "#f472b6",
        "school",
        "#a78bfa",
        "police",
        "#60a5fa",
        "#38bdf8",
      ],
      "circle-stroke-color": "#0a0f18",
      "circle-stroke-width": 1.5,
    },
  });

  map.addLayer({
    id: "settlements-points",
    type: "circle",
    source: "settlements",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "population"], 900, 6, 7000, 14],
      "circle-color": "#38bdf8",
      "circle-stroke-color": "#0a0f18",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.9,
    },
  });

  map.addLayer({
    id: "settlements-labels",
    type: "symbol",
    source: "settlements",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      "text-font": ["Noto Sans Regular"],
    },
    paint: { "text-color": "#cbd5e1", "text-halo-color": "#05080d", "text-halo-width": 1.2 },
  });

  map.addLayer({
    id: "dam-point",
    type: "circle",
    source: "dam",
    paint: {
      "circle-radius": 9,
      "circle-color": "#22d3ee",
      "circle-stroke-color": "#0a0f18",
      "circle-stroke-width": 2,
    },
  });

  map.addLayer({
    id: "dam-label",
    type: "symbol",
    source: "dam",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 12,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-font": ["Noto Sans Bold"],
    },
    paint: { "text-color": "#22d3ee", "text-halo-color": "#05080d", "text-halo-width": 1.4 },
  });

  map.addLayer({
    id: "study-area-fill",
    type: "fill",
    source: "study-area",
    paint: { "fill-color": "#38bdf8", "fill-opacity": 0.025 },
  });
  map.addLayer({
    id: "study-area-line",
    type: "line",
    source: "study-area",
    paint: { "line-color": "#7dd3fc", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": 0.75 },
  });
  map.addLayer({
    id: "river-line-casing",
    type: "line",
    source: "river",
    paint: { "line-color": "#082f49", "line-width": 5, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "river-line",
    type: "line",
    source: "river",
    paint: { "line-color": "#38bdf8", "line-width": 2.5, "line-opacity": 0.95 },
  });
  map.addLayer({
    id: "risk-locations-points",
    type: "circle",
    source: "risk-locations",
    paint: {
      "circle-radius": 7,
      "circle-color": ["match", ["get", "risk"], "CRITICAL", RISK_COLORS.CRITICAL, RISK_COLORS.HIGH],
      "circle-stroke-color": "#fff7ed",
      "circle-stroke-width": 1.5,
    },
  });

  [
    { src: "settlements", layer: "settlements-points" },
    { src: "bridges", layer: "bridges-points" },
    { src: "facilities", layer: "facilities-points" },
  ].forEach(({ layer }) => {
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
  });
}

function buildRasterLayers(
  map: maplibregl.Map,
  grid: SimulationGrid | undefined,
  frame: TimestepFrame | undefined,
  cellResults: GridCellResult[] | undefined,
  maxDurationMin: number
) {
  if (!grid) return;
  const corners = gridImageCorners(grid);

  const upsert = (id: string, url: string) => {
    const src = map.getSource(id) as maplibregl.ImageSource | undefined;
    if (src) {
      src.updateImage({ url });
    } else {
      map.addSource(id, { type: "image", url, coordinates: corners });
      map.addLayer(
        { id: `${id}-layer`, type: "raster", source: id, paint: { "raster-opacity": 1, "raster-fade-duration": 0 } },
        "roads-line"
      );
    }
  };

  upsert("terrain", terrainRasterURL(grid));

  if (frame) {
    upsert("flood", floodExtentRasterURL(grid, frame));
    upsert("depth", depthRasterURL(grid, frame));
    upsert("velocity", velocityRasterURL(grid, frame));
  }
  if (cellResults) {
    upsert("arrival", arrivalRasterURL(grid, cellResults, maxDurationMin));
  }
}

function applyLayerVisibility(map: maplibregl.Map, activeLayers: Record<MapLayerKey, boolean>) {
  const set = (id: string, on: boolean) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  };
  set("terrain-layer", activeLayers.terrain);
  set("flood-layer", activeLayers.flood && !activeLayers.depth && !activeLayers.velocity);
  set("depth-layer", activeLayers.depth);
  set("velocity-layer", activeLayers.velocity);
  set("arrival-layer", activeLayers.arrival);
  set("settlements-points", activeLayers.settlements);
  set("settlements-labels", activeLayers.settlements);
  set("roads-line", activeLayers.roads);
  set("bridges-points", activeLayers.bridges);
  set("facilities-points", activeLayers.facilities);
  set("dam-point", activeLayers.dam);
  set("dam-label", activeLayers.dam);
  set("river-line", activeLayers.river);
  set("river-line-casing", activeLayers.river);
  set("study-area-fill", activeLayers.studyArea);
  set("study-area-line", activeLayers.studyArea);
  set("risk-locations-points", activeLayers.risk);
}

function updateRiskColors(map: maplibregl.Map, impacts: AssetImpact[]) {
  const byId = new Map(impacts.map((i) => [i.assetId, i]));

  const riskFeatures = impacts
    .filter((impact) => impact.riskLevel === "HIGH" || impact.riskLevel === "CRITICAL")
    .flatMap((impact) => {
      const item = impact.assetType === "settlement"
        ? SETTLEMENTS.find((asset) => asset.id === impact.assetId)
        : impact.assetType === "bridge"
          ? BRIDGES.find((asset) => asset.id === impact.assetId)
          : impact.assetType === "facility"
            ? FACILITIES.find((asset) => asset.id === impact.assetId)
            : impact.assetType === "road"
              ? ROADS.find((asset) => asset.id === impact.assetId)
            : undefined;
      if (!item) return [];
      const coordinates = "coords" in item
        ? item.coords[Math.floor(item.coords.length / 2)]
        : [item.lng, item.lat];
      return [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates },
        properties: { id: impact.assetId, risk: impact.riskLevel, assetType: impact.assetType },
      }];
    });
  const riskSource = map.getSource("risk-locations") as maplibregl.GeoJSONSource | undefined;
  riskSource?.setData({ type: "FeatureCollection", features: riskFeatures });

  ["settlements", "bridges", "facilities"].forEach((srcId) => {
    const src = map.getSource(srcId) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const base = srcId === "settlements" ? SETTLEMENTS : srcId === "bridges" ? BRIDGES : FACILITIES;
    const features = base.map((item: any) => {
      const impact = byId.get(item.id);
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [item.lng, item.lat] },
        properties: {
          id: item.id,
          name: item.name,
          population: item.population,
          type: item.type,
          risk: impact?.riskLevel ?? "LOW",
        },
      };
    });
    src.setData({ type: "FeatureCollection", features });
  });

  if (map.getLayer("settlements-points")) {
    map.setPaintProperty("settlements-points", "circle-color", [
      "match",
      ["get", "risk"],
      "CRITICAL",
      RISK_COLORS.CRITICAL,
      "HIGH",
      RISK_COLORS.HIGH,
      "MODERATE",
      RISK_COLORS.MODERATE,
      "#38bdf8",
    ]);
  }
  if (map.getLayer("bridges-points")) {
    map.setPaintProperty("bridges-points", "circle-color", [
      "match",
      ["get", "risk"],
      "CRITICAL",
      RISK_COLORS.CRITICAL,
      "HIGH",
      RISK_COLORS.HIGH,
      "MODERATE",
      RISK_COLORS.MODERATE,
      "#facc15",
    ]);
  }
  if (map.getLayer("facilities-points")) {
    map.setPaintProperty("facilities-points", "circle-color", [
      "match",
      ["get", "risk"],
      "CRITICAL",
      RISK_COLORS.CRITICAL,
      "HIGH",
      RISK_COLORS.HIGH,
      "MODERATE",
      RISK_COLORS.MODERATE,
      "#a78bfa",
    ]);
  }
}
