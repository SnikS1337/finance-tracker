import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppDataProvider } from "./context/AppDataContext";
import { useAppData } from "./hooks/useAppData";
import { ToastProvider } from "./components/ui/Toast";
import { TransactionSheetProvider } from "./components/transactions/TransactionSheetContext";
import { AppShell } from "./components/layout/AppShell";
import { useTheme } from "./hooks/useTheme";
import Onboarding from "./pages/Onboarding";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));

function Gate() {
  const { settings } = useAppData();
  useTheme(settings.theme);

  if (!settings.onboarded) return <Onboarding />;

  return (
    <TransactionSheetProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </TransactionSheetProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppDataProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </AppDataProvider>
    </ToastProvider>
  );
}
