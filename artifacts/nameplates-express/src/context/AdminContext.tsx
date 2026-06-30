/**
 * Admin context — provides localStorage-backed admin-managed sizes to the
 * entire app.  Wrap <App> with <AdminProvider>.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type AdminSize,
  loadAdminSizes, saveAdminSizes, ADMIN_DEFAULT_SIZES,
} from "@/lib/admin-store";

// ─── Context shape ────────────────────────────────────────────────────────────

interface AdminContextValue {
  /** All sizes (active and inactive), in sort order. */
  sizes: AdminSize[];
  /** Active sizes only, sorted by sortOrder. */
  activeSizes: AdminSize[];
  addSize: (data: Omit<AdminSize, "id">) => void;
  updateSize: (id: string, patch: Partial<AdminSize>) => void;
  deleteSize: (id: string) => void;
  resetToDefaults: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [sizes, setSizes] = useState<AdminSize[]>(loadAdminSizes);

  useEffect(() => { saveAdminSizes(sizes); }, [sizes]);

  const addSize = useCallback((data: Omit<AdminSize, "id">) => {
    const id = `custom-${Date.now()}`;
    setSizes(prev => [...prev, { ...data, id }]);
  }, []);

  const updateSize = useCallback((id: string, patch: Partial<AdminSize>) => {
    setSizes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const deleteSize = useCallback((id: string) => {
    setSizes(prev => prev.filter(s => s.id !== id));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSizes(ADMIN_DEFAULT_SIZES);
  }, []);

  const activeSizes = [...sizes]
    .filter(s => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminContext.Provider value={{ sizes, activeSizes, addSize, updateSize, deleteSize, resetToDefaults }}>
      {children}
    </AdminContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within <AdminProvider>");
  return ctx;
}
