/**
 * Admin context — provides API-backed admin-managed sizes to the entire app.
 * Config is persisted in the database so it survives browser data clears and
 * works across devices. Wrap <App> with <AdminProvider>.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  useGetAdminConfig,
  putAdminConfig,
  getGetAdminConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type AdminSize,
  ADMIN_DEFAULT_SIZES,
  loadAdminSizes,
  saveAdminSizes,
} from "@/lib/admin-store";

// ─── Session key (written by AdminPage on successful unlock) ──────────────────

export const ADMIN_KEY_SESSION_STORAGE = "nx_admin_key";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns RequestInit with the admin key header if the user has unlocked the admin panel. */
function adminRequestOptions(): RequestInit {
  const key = sessionStorage.getItem(ADMIN_KEY_SESSION_STORAGE) ?? "";
  return key ? { headers: { "x-admin-key": key } } : {};
}

/** Persist sizes to the API. Logs errors so they appear in the console. */
function persistSizes(sizes: AdminSize[]): void {
  void putAdminConfig({ sizes }, adminRequestOptions()).catch((err: unknown) => {
    console.error("[AdminContext] Failed to persist config to server:", err);
  });
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface AdminContextValue {
  /** All sizes (active and inactive), in sort order. */
  sizes: AdminSize[];
  /** Active sizes only, sorted by sortOrder. */
  activeSizes: AdminSize[];
  /** True while the initial config is being fetched from the server. */
  isLoading: boolean;
  addSize: (data: Omit<AdminSize, "id">) => void;
  updateSize: (id: string, patch: Partial<AdminSize>) => void;
  deleteSize: (id: string) => void;
  resetToDefaults: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // Seed from localStorage for instant paint while the API response is in-flight
  const [sizes, setSizes] = useState<AdminSize[]>(loadAdminSizes);

  // Guards so effects only fire at the right time
  const initializedFromApi = useRef(false);
  const skipNextSave = useRef(false); // true when sizes are set from API (not by admin action)
  const isFirstRender = useRef(true);

  const queryClient = useQueryClient();
  const { data: apiConfig, isLoading, isError } = useGetAdminConfig();

  // Once the API responds, adopt its data as the source of truth.
  // Uses `configured` flag to distinguish "DB is empty" from "admin saved empty array".
  // If the fetch errored, keep the local cache and do NOT overwrite.
  useEffect(() => {
    if (initializedFromApi.current) return;
    if (isLoading) return;
    if (isError) return;
    if (!apiConfig) return;

    initializedFromApi.current = true;

    if (apiConfig.configured) {
      // Row exists in DB — adopt whatever the server returned (even empty array)
      const serverSizes = apiConfig.sizes as AdminSize[];
      skipNextSave.current = true;
      setSizes(serverSizes);
      saveAdminSizes(serverSizes);
    }
    // If !configured (no DB row yet), leave local default sizes in place.
    // The DB will be populated on the first real admin save.
  }, [apiConfig, isLoading, isError, queryClient]);

  // Persist to both localStorage (instant cache) and the API whenever sizes
  // change due to an admin action. Skip:
  //   • the very first render (localStorage seed)
  //   • runs before the API has responded (initializedFromApi not set yet)
  //   • runs triggered by adopting server data (skipNextSave flag)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!initializedFromApi.current) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveAdminSizes(sizes);
    persistSizes(sizes);
  }, [sizes]);

  const addSize = useCallback((data: Omit<AdminSize, "id">) => {
    const id = `custom-${Date.now()}`;
    setSizes((prev) => [...prev, { ...data, id }]);
  }, []);

  const updateSize = useCallback((id: string, patch: Partial<AdminSize>) => {
    setSizes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteSize = useCallback((id: string) => {
    setSizes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSizes(ADMIN_DEFAULT_SIZES);
  }, []);

  const activeSizes = [...sizes]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminContext.Provider
      value={{
        sizes,
        activeSizes,
        isLoading: isLoading && !initializedFromApi.current,
        addSize,
        updateSize,
        deleteSize,
        resetToDefaults,
      }}
    >
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
