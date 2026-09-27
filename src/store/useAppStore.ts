import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BreachScenario, SimulationResult } from "../types";
import { PREDEFINED_SCENARIOS } from "../data/demoData";
import { executeScenario } from "../engine/orchestrate";
import { DEFAULT_RISK_WEIGHTS, type RiskWeights } from "../engine/risk";
import { computeExposure } from "../engine/exposure";

export type MapLayerKey =
  | "terrain"
  | "flood"
  | "depth"
  | "velocity"
  | "arrival"
  | "settlements"
  | "roads"
  | "bridges"
  | "facilities"
  | "risk"
  | "dam"
  | "river"
  | "studyArea";

interface AppState {
  // auth
  isAuthenticated: boolean;
  userName: string;
  login: (u: string, p: string) => boolean;
  logout: () => void;

  // scenarios
  scenarios: BreachScenario[];
  activeScenarioId: string;
  setActiveScenario: (id: string) => void;
  upsertScenario: (s: BreachScenario) => void;
  deleteScenario: (id: string) => void;

  // simulation results cache, keyed by scenario id
  results: Record<string, SimulationResult | undefined>;
  runStatus: { running: boolean; progress: number; stageLabel: string };
  runActiveScenario: () => Promise<void>;
  runScenario: (id: string) => Promise<void>;

  // simulation playback
  timestepIndex: number;
  setTimestepIndex: (i: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;

  // map layers
  activeLayers: Record<MapLayerKey, boolean>;
  toggleLayer: (k: MapLayerKey) => void;

  // comparison
  compareIds: string[];
  setCompareIds: (ids: string[]) => void;

  // settings
  riskWeights: RiskWeights;
  setRiskWeights: (w: RiskWeights) => void;
  arrivalThresholdM: number;
  setArrivalThresholdM: (value: number) => void;
  defaultDurationMin: 30 | 60 | 90 | 120;
  setDefaultDurationMin: (value: 30 | 60 | 90 | 120) => void;
  resetDemo: () => void;
  demoDataLoaded: boolean;
}

const initialLayers: Record<MapLayerKey, boolean> = {
  terrain: true,
  flood: true,
  depth: false,
  velocity: false,
  arrival: false,
  settlements: true,
  roads: true,
  bridges: true,
  facilities: true,
  risk: false,
  dam: true,
  river: true,
  studyArea: true,
};

export const useAppStore = create<AppState>()(persist((set, get) => ({
  isAuthenticated: false,
  userName: "",
  login: (u, p) => {
    if (u.trim().toLowerCase() === "authority@aegisflow.local" && p === "Aegis@2026") {
      set({ isAuthenticated: true, userName: "Authority User" });
      return true;
    }
    return false;
  },
  logout: () => set({ isAuthenticated: false, userName: "" }),

  scenarios: PREDEFINED_SCENARIOS,
  activeScenarioId: "SCN-B",
  setActiveScenario: (id) => set({ activeScenarioId: id, timestepIndex: 0, playing: false }),
  upsertScenario: (s) =>
    set((state) => {
      const idx = state.scenarios.findIndex((x) => x.id === s.id);
      const scenarios = [...state.scenarios];
      if (idx >= 0) scenarios[idx] = s;
      else scenarios.push(s);
      return { scenarios };
    }),
  deleteScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      results: { ...state.results, [id]: undefined },
    })),

  results: {},
  runStatus: { running: false, progress: 0, stageLabel: "" },
  runActiveScenario: async () => get().runScenario(get().activeScenarioId),
  runScenario: async (id) => {
    const scenario = get().scenarios.find((s) => s.id === id);
    if (!scenario || get().runStatus.running) return;
    set({ runStatus: { running: true, progress: 0, stageLabel: "Loading terrain" }, timestepIndex: 0, playing: false });
    try {
      const result = await executeScenario(scenario, get().arrivalThresholdM, get().riskWeights, (progress, stageLabel) => {
        set({ runStatus: { running: true, progress, stageLabel } });
      });
      set((state) => ({
        results: { ...state.results, [scenario.id]: result },
        timestepIndex: Math.max(0, result.frames.length - 1),
        runStatus: { running: false, progress: 100, stageLabel: "Simulation Complete" },
      }));
    } catch (error) {
      set({ runStatus: { running: false, progress: 0, stageLabel: "Simulation failed" } });
      console.error("AegisFlow simulation failed", error);
    }
  },

  timestepIndex: 6,
  setTimestepIndex: (i) => set({ timestepIndex: i }),
  playing: false,
  setPlaying: (p) => set({ playing: p }),

  activeLayers: initialLayers,
  toggleLayer: (k) =>
    set((state) => ({ activeLayers: { ...state.activeLayers, [k]: !state.activeLayers[k] } })),

  compareIds: ["SCN-A", "SCN-B", "SCN-C"],
  setCompareIds: (ids) => set({ compareIds: ids }),

  riskWeights: DEFAULT_RISK_WEIGHTS,
  setRiskWeights: (w) => set((state) => ({
    riskWeights: w,
    results: Object.fromEntries(Object.entries(state.results).map(([id, result]) => {
      const scenario = state.scenarios.find((item) => item.id === id);
      if (!result || !scenario) return [id, result];
      const impacts = computeExposure(result.grid, result.cellResults, scenario.durationMin, w);
      return [id, {
        ...result,
        impacts,
        summary: {
          ...result.summary,
        },
      }];
    })),
  })),
  arrivalThresholdM: 0.1,
  setArrivalThresholdM: (value) => set({
    arrivalThresholdM: value,
    results: {},
    runStatus: { running: false, progress: 0, stageLabel: "" },
    timestepIndex: 0,
    playing: false,
  }),
  defaultDurationMin: 60,
  setDefaultDurationMin: (value) => set({ defaultDurationMin: value }),
  resetDemo: () => set((state) => ({
    scenarios: PREDEFINED_SCENARIOS,
    activeScenarioId: "SCN-B",
    results: {},
    runStatus: { running: false, progress: 0, stageLabel: "" },
    timestepIndex: 0,
    playing: false,
    activeLayers: initialLayers,
    compareIds: ["SCN-A", "SCN-B", "SCN-C"],
    riskWeights: DEFAULT_RISK_WEIGHTS,
    arrivalThresholdM: 0.1,
    defaultDurationMin: 60,
    demoDataLoaded: true,
    isAuthenticated: state.isAuthenticated,
    userName: state.userName,
  })),
  demoDataLoaded: true,
}), {
  name: "aegisflow-demo-state",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    isAuthenticated: state.isAuthenticated,
    userName: state.userName,
    scenarios: state.scenarios,
    activeScenarioId: state.activeScenarioId,
    activeLayers: state.activeLayers,
    compareIds: state.compareIds,
    riskWeights: state.riskWeights,
    arrivalThresholdM: state.arrivalThresholdM,
    defaultDurationMin: state.defaultDurationMin,
    demoDataLoaded: state.demoDataLoaded,
  }) as AppState,
  merge: (persistedState, currentState) => {
    const persisted = persistedState as Partial<AppState>;
    return {
      ...currentState,
      ...persisted,
      activeLayers: { ...currentState.activeLayers, ...persisted.activeLayers },
    };
  },
}));
