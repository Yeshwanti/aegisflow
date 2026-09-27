import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useActiveScenario() {
  const scenarios = useAppStore((s) => s.scenarios);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  return scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];
}

export function useActiveResult() {
  const results = useAppStore((s) => s.results);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  return results[activeScenarioId];
}

/** Ensures the default demo scenario has a completed simulation result on first load. */
export function useEnsureDemoRun() {
  const result = useActiveResult();
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  const runStatus = useAppStore((s) => s.runStatus);
  const runActiveScenario = useAppStore((s) => s.runActiveScenario);

  useEffect(() => {
    if (!result && !runStatus.running) {
      runActiveScenario();
    }
  }, [activeScenarioId, result, runStatus.running, runActiveScenario]);
}
