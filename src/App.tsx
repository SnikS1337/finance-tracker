import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AppDataProvider } from "./context/AppDataContext";
import { useAppData } from "./hooks/useAppData";
import { ToastProvider } from "./components/ui/Toast";
import { TransactionSheetProvider } from "./components/transactions/TransactionSheetContext";
import { AppShell } from "./components/layout/AppShell";
import { useTheme } from "./hooks/useTheme";
import Onboarding from "./pages/Onboarding";
// Landing screen: bundled with the entry (see lazyPages.ts for why).
import Dashboard from "./pages/Dashboard";
import { Transactions, Analytics, Settings, preloadSecondaryChunks } from "./lazyPages";
import { preloadCharts } from "./components/dashboard/chartChunks";

function Gate() {
  const { settings } = useAppData();
  useTheme(settings.theme);

  // The first real screen has committed: quietly warm the remaining chunks
  // for offline use.
  useEffect(() => preloadSecondaryChunks([preloadCharts]), []);

  if (!settings.onboarded) return <Onboarding />;

  return (
    <TransactionSheetProvider>
      <Routes>
        {/* AppShell owns the Suspense + error boundary for lazy pages, so the
            navigation stays visible while a page loads (or fails offline). */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
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
