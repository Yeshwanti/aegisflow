import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import CommandCenter from "./pages/CommandCenter";
import DamStudyAreas from "./pages/DamStudyAreas";
import ScenarioLab from "./pages/ScenarioLab";
import LiveSimulation from "./pages/LiveSimulation";
import ImpactAnalysis from "./pages/ImpactAnalysis";
import RiskPriorities from "./pages/RiskPriorities";
import ScenarioComparison from "./pages/ScenarioComparison";
import GISExplorer from "./pages/GISExplorer";
import Reports from "./pages/Reports";
import SystemSettings from "./pages/SystemSettings";
import About from "./pages/About";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<CommandCenter />} />
          <Route path="/dams" element={<DamStudyAreas />} />
          <Route path="/scenario-lab" element={<ScenarioLab />} />
          <Route path="/simulation" element={<LiveSimulation />} />
          <Route path="/impact" element={<ImpactAnalysis />} />
          <Route path="/priorities" element={<RiskPriorities />} />
          <Route path="/comparison" element={<ScenarioComparison />} />
          <Route path="/gis" element={<GISExplorer />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SystemSettings />} />
          <Route path="/about" element={<About />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
