import { useContext } from "react";
import { AppDataContext, type AppData } from "../context/appDataStore";

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
