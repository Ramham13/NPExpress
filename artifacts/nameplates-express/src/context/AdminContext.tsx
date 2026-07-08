/**
 * Admin context provides API-backed admin-managed sizes to the entire app.
 * Public pages only receive safe, non-secret config. Unlocked admin sessions
 * can fetch and persist the full workflow settings.
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
  getAdminConfig,
  putAdminConfig,
} from "@workspace/api-client-react";
import { type AdminSize, loadAdminSizes, saveAdminSizes } from "@/lib/admin-store";

export const ADMIN_KEY_SESSION_STORAGE = "nx_admin_key";
export const ADMIN_AUTH_CHANGED_EVENT = "nx-admin-auth-changed";
export const ADMIN_AUTH_EXPIRED_EVENT = "nx-admin-auth-expired";

function adminRequestOptions(): RequestInit {
  const key = sessionStorage.getItem(ADMIN_KEY_SESSION_STORAGE) ?? "";
  return key ? { headers: { "x-admin-key": key } } : {};
}

function isUnauthorizedError(err: unknown) {
  return typeof err === "object" && err !== null && "status" in err && (err as { status?: unknown }).status === 401;
}

function getApiErrorMessage(err: unknown) {
  if (typeof err !== "object" || err === null || !("data" in err)) return null;
  const data = (err as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || !("error" in data)) return null;
  const message = (data as { error?: unknown }).error;
  return typeof message === "string" && message.trim() ? message : null;
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_KEY_SESSION_STORAGE);
  sessionStorage.removeItem("nx_admin_unlocked");
}

function emitBrowserEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

export type AdminSaveStatus = "idle" | "saving" | "saved" | "error";

interface AdminContextValue {
  sizes: AdminSize[];
  activeSizes: AdminSize[];
  workflowSettings: Record<string, unknown>;
  isLoading: boolean;
  saveStatus: AdminSaveStatus;
  saveError: string | null;
  addSize: (data: Omit<AdminSize, "id">) => void;
  updateSize: (id: string, patch: Partial<AdminSize>) => void;
  deleteSize: (id: string) => void;
  updateWorkflowSettings: (patch: Record<string, unknown>) => void;
  dismissSaveFeedback: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [sizes, setSizes] = useState<AdminSize[]>(loadAdminSizes);
  const [workflowSettings, setWorkflowSettings] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<AdminSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const initializedFromApi = useRef(false);
  const skipNextSizesSave = useRef(false);
  const skipNextWorkflowSave = useRef(false);
  const isFirstRender = useRef(true);
  const persistSequence = useRef(0);

  const dismissSaveFeedback = useCallback(() => {
    setSaveStatus("idle");
    setSaveError(null);
  }, []);

  const persistConfig = useCallback(async (nextSizes: AdminSize[], nextWorkflowSettings: Record<string, unknown>) => {
    const sequence = ++persistSequence.current;
    setSaveStatus("saving");
    setSaveError(null);

    try {
      await putAdminConfig({ sizes: nextSizes, workflowSettings: nextWorkflowSettings }, adminRequestOptions());
      if (persistSequence.current === sequence) {
        setSaveStatus("saved");
        setSaveError(null);
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAdminSession();
        emitBrowserEvent(ADMIN_AUTH_EXPIRED_EVENT);
        return;
      }

      console.error("[AdminContext] Failed to persist config to server:", err);
      if (persistSequence.current === sequence) {
        setSaveStatus("error");
        setSaveError(getApiErrorMessage(err) ?? "We couldn't save the admin configuration. Check the server and try again.");
      }
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiConfig = await getAdminConfig(adminRequestOptions());
      initializedFromApi.current = true;

      if (apiConfig.configured) {
        const serverSizes = apiConfig.sizes as AdminSize[];
        skipNextSizesSave.current = true;
        skipNextWorkflowSave.current = true;
        setSizes(serverSizes);
        setWorkflowSettings((apiConfig as { workflowSettings?: Record<string, unknown> }).workflowSettings ?? {});
        saveAdminSizes(serverSizes);
        dismissSaveFeedback();
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAdminSession();
        setWorkflowSettings({});
        emitBrowserEvent(ADMIN_AUTH_EXPIRED_EVENT);

        try {
          const publicConfig = await getAdminConfig();
          initializedFromApi.current = true;
          if (publicConfig.configured) {
            const serverSizes = publicConfig.sizes as AdminSize[];
            skipNextSizesSave.current = true;
            skipNextWorkflowSave.current = true;
            setSizes(serverSizes);
            setWorkflowSettings((publicConfig as { workflowSettings?: Record<string, unknown> }).workflowSettings ?? {});
            saveAdminSizes(serverSizes);
            dismissSaveFeedback();
          }
        } catch (fallbackErr) {
          console.error("[AdminContext] Failed to reload public admin config:", fallbackErr);
        }
      } else {
        console.error("[AdminContext] Failed to load admin config:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const handleAuthChanged = () => {
      void fetchConfig();
    };

    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
  }, [fetchConfig]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!initializedFromApi.current) return;
    if (skipNextSizesSave.current) {
      skipNextSizesSave.current = false;
      return;
    }

    saveAdminSizes(sizes);
    void persistConfig(sizes, workflowSettings);
  }, [sizes]);

  useEffect(() => {
    if (isFirstRender.current) return;
    if (!initializedFromApi.current) return;
    if (skipNextWorkflowSave.current) {
      skipNextWorkflowSave.current = false;
      return;
    }

    void persistConfig(sizes, workflowSettings);
  }, [workflowSettings]);

  const addSize = useCallback((data: Omit<AdminSize, "id">) => {
    const id = `custom-${Date.now()}`;
    setSizes((prev) => [...prev, { ...data, id }]);
  }, []);

  const updateSize = useCallback((id: string, patch: Partial<AdminSize>) => {
    setSizes((prev) => prev.map((size) => (size.id === id ? { ...size, ...patch } : size)));
  }, []);

  const deleteSize = useCallback((id: string) => {
    setSizes((prev) => prev.filter((size) => size.id !== id));
  }, []);

  const updateWorkflowSettings = useCallback((patch: Record<string, unknown>) => {
    setWorkflowSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const activeSizes = [...sizes]
    .filter((size) => size.active)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <AdminContext.Provider
      value={{
        sizes,
        activeSizes,
        workflowSettings,
        isLoading,
        saveStatus,
        saveError,
        addSize,
        updateSize,
        deleteSize,
        updateWorkflowSettings,
        dismissSaveFeedback,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within <AdminProvider>");
  return ctx;
}
