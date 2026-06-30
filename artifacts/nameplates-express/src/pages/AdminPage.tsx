/**
 * Admin Dashboard — only reachable via direct URL (/admin).
 * Not linked from any customer-facing navigation.
 */
import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { postAdminUnlock } from "@workspace/api-client-react";
import { useAdmin, ADMIN_KEY_SESSION_STORAGE } from "@/context/AdminContext";
import {
  type AdminSize, type ColorOption, type PricingTier,
  DEFAULT_COLOR_PALETTE, ADMIN_DEFAULT_SIZES,
} from "@/lib/admin-store";
import {
  Plus, Pencil, Trash2, Save, X, ChevronUp, ChevronDown,
  ShieldAlert, Info, Check, AlertTriangle, Lock, LogOut,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SESSION_KEY = "nx_admin_unlocked";

const MAX_TIERS = 5;

// ─── AdminGate ────────────────────────────────────────────────────────────────

function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === "1"
  );
  const [input, setInput]   = useState("");
  const [error, setError]   = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const { token } = await postAdminUnlock({ password: input });
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      sessionStorage.setItem(ADMIN_KEY_SESSION_STORAGE, token);
      setUnlocked(true);
    } catch {
      setError(true);
      setInput("");
    } finally {
      setLoading(false);
    }
  }

  function handleLock() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_KEY_SESSION_STORAGE);
    setUnlocked(false);
    setInput("");
    setError(false);
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex justify-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Lock size={22} className="text-slate-500" />
              </div>
            </div>
            <h1 className="text-center text-xl font-black text-slate-800 mb-1">Admin Access</h1>
            <p className="text-center text-sm text-slate-400 mb-6">Enter the admin password to continue.</p>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(false); }}
                  placeholder="Password"
                  className={`w-full rounded border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    error ? "border-red-400 focus:ring-red-400" : "border-slate-200"
                  }`}
                />
                {error && (
                  <p className="mt-1.5 text-xs text-red-500">Incorrect password. Try again.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-white transition-colors"
              >
                {loading ? "Checking…" : "Unlock"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <AdminGateContext.Provider value={handleLock}>{children}</AdminGateContext.Provider>;
}

const AdminGateContext = createContext<(() => void) | null>(null);
function useLock() { return useContext(AdminGateContext)!; }

// ─── Form state type ──────────────────────────────────────────────────────────

interface TierRow { minQty: string; priceEach: string; }
interface CustomColorRow { label: string; hex: string; }

interface SizeForm {
  label: string;
  width: string;
  height: string;
  description: string;
  active: boolean;
  sortOrder: string;
  basePrice: string;
  tiers: TierRow[];
  colors: ColorOption[];
  customColor: CustomColorRow;
}

function blankForm(next: number): SizeForm {
  return {
    label: "", width: "", height: "", description: "",
    active: true, sortOrder: String(next), basePrice: "",
    tiers: [],
    colors: DEFAULT_COLOR_PALETTE.map(c => ({ ...c, enabled: c.id === "black" })),
    customColor: { label: "", hex: "#888888" },
  };
}

function sizeToForm(s: AdminSize): SizeForm {
  return {
    label:       s.label,
    width:       String(s.width),
    height:      String(s.height),
    description: s.description,
    active:      s.active,
    sortOrder:   String(s.sortOrder),
    basePrice:   String(s.basePrice),
    tiers:       s.pricingTiers.map(t => ({
      minQty:    String(t.minQty),
      priceEach: String(t.priceEach),
    })),
    colors: (() => {
      // merge saved colors with the current palette (add any new defaults, keep custom ones)
      const paletteIds = DEFAULT_COLOR_PALETTE.map(c => c.id);
      const saved = s.colors;
      const merged: ColorOption[] = DEFAULT_COLOR_PALETTE.map(c => {
        const existing = saved.find(x => x.id === c.id);
        return existing ?? { ...c, enabled: false };
      });
      // add custom colors (not in default palette)
      saved.filter(c => !paletteIds.includes(c.id)).forEach(c => merged.push(c));
      return merged;
    })(),
    customColor: { label: "", hex: "#888888" },
  };
}

function validateForm(f: SizeForm): Partial<Record<string, string>> {
  const e: Partial<Record<string, string>> = {};
  if (!f.label.trim())                   e.label = "Display name is required";
  const w = parseFloat(f.width);
  const h = parseFloat(f.height);
  if (!f.width || isNaN(w) || w <= 0)    e.width  = "Width must be a positive number";
  if (!f.height || isNaN(h) || h <= 0)   e.height = "Height must be a positive number";
  if (!isNaN(w) && !isNaN(h) && h >= w)  e.height = "Height must be less than width (landscape)";
  const so = parseInt(f.sortOrder, 10);
  if (!f.sortOrder || isNaN(so) || so < 1) e.sortOrder = "Sort order must be a positive integer";
  const bp = parseFloat(f.basePrice);
  if (!f.basePrice || isNaN(bp) || bp < 0) e.basePrice = "Base price must be ≥ 0";
  if (!f.colors.some(c => c.enabled))   e.colors = "At least one color must be enabled";
  f.tiers.forEach((t, i) => {
    const q = parseInt(t.minQty, 10);
    const p = parseFloat(t.priceEach);
    if (isNaN(q) || q < 2)  e[`tier_minQty_${i}`] = "Min qty must be ≥ 2";
    if (isNaN(p) || p < 0)  e[`tier_price_${i}`]  = "Price must be ≥ 0";
  });
  return e;
}

function formToSize(f: SizeForm, id: string): AdminSize {
  return {
    id,
    label:       f.label.trim(),
    width:       parseFloat(f.width),
    height:      parseFloat(f.height),
    description: f.description.trim(),
    active:      f.active,
    sortOrder:   parseInt(f.sortOrder, 10),
    basePrice:   parseFloat(f.basePrice),
    pricingTiers: f.tiers
      .map(t => ({ minQty: parseInt(t.minQty, 10), priceEach: parseFloat(t.priceEach) }))
      .filter(t => !isNaN(t.minQty) && !isNaN(t.priceEach))
      .sort((a, b) => a.minQty - b.minQty),
    colors: f.colors,
  };
}

// ─── Primitive UI helpers ─────────────────────────────────────────────────────

const LBL = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";
const INP = "w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const ERR = "mt-1 text-xs text-red-500";

function Field({ label, error, children, hint }: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className={LBL}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className={ERR}>{error}</p>}
    </div>
  );
}

function Badge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ColorDots({ colors }: { colors: ColorOption[] }) {
  const enabled = colors.filter(c => c.enabled);
  return (
    <div className="flex items-center gap-1">
      {enabled.map(c => (
        <span key={c.id} title={c.label}
          className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
          style={{ backgroundColor: c.hex }} />
      ))}
      {enabled.length === 0 && <span className="text-xs text-slate-400">—</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type AdminView = "list" | "add" | "edit";

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminPageInner />
    </AdminGate>
  );
}

function AdminPageInner() {
  const { sizes, activeSizes, addSize, updateSize, deleteSize, workflowSettings, updateWorkflowSettings } = useAdmin();
  const [view, setView]           = useState<AdminView>("list");
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<SizeForm | null>(null);
  const [errors, setErrors]       = useState<Partial<Record<string, string>>>({});
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [savedFlash, setSavedFlash]     = useState(false);
  const [workflowForm, setWorkflowForm] = useState({
    n8nOrdersWebhookUrl: String(workflowSettings.n8nOrdersWebhookUrl ?? ""),
    n8nCallbackSecret: String(workflowSettings.n8nCallbackSecret ?? ""),
    webhookEnabled: Boolean(workflowSettings.webhookEnabled ?? false),
    sandboxPayPalClientId: String(workflowSettings.sandboxPayPalClientId ?? ""),
    sandboxPayPalSecret: String(workflowSettings.sandboxPayPalSecret ?? ""),
  });

  const sortedSizes = [...sizes].sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Actions ───────────────────────────────────────────────────────────────

  function openAdd() {
    const maxOrder = sizes.reduce((m, s) => Math.max(m, s.sortOrder), 0);
    setForm(blankForm(maxOrder + 1));
    setErrors({});
    setEditId(null);
    setView("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(id: string) {
    const s = sizes.find(x => x.id === id);
    if (!s) return;
    setForm(sizeToForm(s));
    setErrors({});
    setEditId(id);
    setView("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() { setView("list"); setForm(null); setEditId(null); setErrors({}); }

  function handleSubmit() {
    if (!form) return;
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (view === "add") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignored, ...rest } = formToSize(form, "");
      addSize(rest);
    } else if (view === "edit" && editId) {
      updateSize(editId, formToSize(form, editId));
    }
    setView("list");
    setForm(null);
    setEditId(null);
    setErrors({});
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  function saveWorkflowSettings() {
    updateWorkflowSettings(workflowForm as unknown as Record<string, unknown>);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  function moveOrder(id: string, dir: -1 | 1) {
    const sorted = [...sizes].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(s => s.id === id);
    const other = sorted[idx + dir];
    if (!other) return;
    const me = sorted[idx];
    updateSize(me.id,    { sortOrder: other.sortOrder });
    updateSize(other.id, { sortOrder: me.sortOrder });
  }

  // ── Form setters ──────────────────────────────────────────────────────────

  const setF = useCallback(<K extends keyof SizeForm>(key: K, val: SizeForm[K]) => {
    setForm(p => p ? { ...p, [key]: val } : p);
    setErrors(p => ({ ...p, [key]: undefined }));
  }, []);

  function addTier() {
    if (!form || form.tiers.length >= MAX_TIERS) return;
    setF("tiers", [...form.tiers, { minQty: "", priceEach: "" }]);
  }

  function removeTier(i: number) {
    if (!form) return;
    setF("tiers", form.tiers.filter((_, idx) => idx !== i));
  }

  function setTier(i: number, key: keyof TierRow, val: string) {
    if (!form) return;
    const next = form.tiers.map((t, idx) => idx === i ? { ...t, [key]: val } : t);
    setF("tiers", next);
    setErrors(p => ({ ...p, [`tier_minQty_${i}`]: undefined, [`tier_price_${i}`]: undefined }));
  }

  function toggleColor(id: string) {
    if (!form) return;
    setF("colors", form.colors.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    setErrors(p => ({ ...p, colors: undefined }));
  }

  function removeCustomColor(id: string) {
    if (!form) return;
    setF("colors", form.colors.filter(c => c.id !== id));
  }

  function addCustomColor() {
    if (!form) return;
    const { label, hex } = form.customColor;
    if (!label.trim()) return;
    const id = `custom-${Date.now()}`;
    setF("colors", [...form.colors, { id, label: label.trim(), hex, enabled: true }]);
    setF("customColor", { label: "", hex: "#888888" });
  }

  // ── Render: form view ─────────────────────────────────────────────────────

  if ((view === "add" || view === "edit") && form) {
    const isAdd = view === "add";
    const editingSize = editId ? sizes.find(s => s.id === editId) : null;
    const customColors = form.colors.filter(c => !DEFAULT_COLOR_PALETTE.some(d => d.id === c.id));

    return (
      <div className="min-h-screen bg-slate-50">
        <AdminHeader />
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Back + title */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={cancelForm}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <X size={14} /> Cancel
            </button>
            <div className="w-px h-4 bg-slate-300" />
            <h2 className="text-lg font-bold text-slate-800">
              {isAdd ? "Add New Size" : `Edit: ${editingSize?.label ?? "Size"}`}
            </h2>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">

            {/* ── Basic info ── */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Display Name *" error={errors.label}
                    hint='Shown to customers, e.g. 6" × 2"'>
                    <input className={INP} value={form.label}
                      onChange={e => setF("label", e.target.value)} placeholder='6" × 2"' />
                  </Field>
                </div>
                <Field label="Width (inches) *" error={errors.width}
                  hint="Longer dimension (landscape)">
                  <input type="number" step="0.25" min="0.5" className={INP}
                    value={form.width} onChange={e => setF("width", e.target.value)} placeholder="6" />
                </Field>
                <Field label="Height (inches) *" error={errors.height}
                  hint="Shorter dimension (landscape)">
                  <input type="number" step="0.25" min="0.25" className={INP}
                    value={form.height} onChange={e => setF("height", e.target.value)} placeholder="2" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description" error={errors.description}>
                    <textarea className={`${INP} resize-none`} rows={2}
                      value={form.description} onChange={e => setF("description", e.target.value)}
                      placeholder="Optional internal/customer-facing description" />
                  </Field>
                </div>
                <Field label="Sort / Display Order *" error={errors.sortOrder}
                  hint="Lower numbers appear first in the size picker">
                  <input type="number" min="1" step="1" className={INP}
                    value={form.sortOrder} onChange={e => setF("sortOrder", e.target.value)} />
                </Field>
                <div>
                  <label className={LBL}>Status</label>
                  <button type="button" onClick={() => setF("active", !form.active)}
                    className={`mt-1 flex items-center gap-2 rounded border px-4 py-2 text-sm font-semibold transition-all ${
                      form.active
                        ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${form.active ? "bg-green-500" : "bg-slate-400"}`} />
                    {form.active ? "Active — visible to customers" : "Inactive — hidden from customers"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Pricing ── */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Pricing</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Base Price per Nameplate ($) *" error={errors.basePrice}
                  hint="Default price when no quantity tier applies">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" className={`${INP} pl-7`}
                      value={form.basePrice} onChange={e => setF("basePrice", e.target.value)} placeholder="5.00" />
                  </div>
                </Field>
              </div>

              {/* Pricing tiers */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={LBL}>Quantity Discount Tiers <span className="normal-case font-normal text-slate-400">(optional)</span></p>
                    <p className="text-xs text-slate-400">Price per unit when qty reaches the threshold</p>
                  </div>
                  {form.tiers.length < MAX_TIERS && (
                    <button type="button" onClick={addTier}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                      <Plus size={12} /> Add Tier
                    </button>
                  )}
                </div>

                {form.tiers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No tiers — all orders use base price.</p>
                ) : (
                  <div className="space-y-2">
                    {form.tiers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            {i === 0 && <p className="text-[10px] text-slate-400 mb-1">Min Qty</p>}
                            <input type="number" min="2" step="1" className={`${INP} ${errors[`tier_minQty_${i}`] ? "border-red-300" : ""}`}
                              value={t.minQty} onChange={e => setTier(i, "minQty", e.target.value)}
                              placeholder="10" />
                            {errors[`tier_minQty_${i}`] && <p className={ERR}>{errors[`tier_minQty_${i}`]}</p>}
                          </div>
                          <div>
                            {i === 0 && <p className="text-[10px] text-slate-400 mb-1">Price Each ($)</p>}
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                              <input type="number" step="0.01" min="0" className={`${INP} pl-7 ${errors[`tier_price_${i}`] ? "border-red-300" : ""}`}
                                value={t.priceEach} onChange={e => setTier(i, "priceEach", e.target.value)}
                                placeholder="4.50" />
                            </div>
                            {errors[`tier_price_${i}`] && <p className={ERR}>{errors[`tier_price_${i}`]}</p>}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeTier(i)}
                          className="mt-0 p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title="Remove tier">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Colors ── */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Available Colors</h3>
              <p className="text-xs text-slate-400 mb-4">Check the colors available for this size. Black is enabled by default.</p>

              {errors.colors && <p className={`${ERR} mb-3`}>{errors.colors}</p>}

              {/* Standard palette */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {form.colors.filter(c => DEFAULT_COLOR_PALETTE.some(d => d.id === c.id)).map(color => (
                  <label key={color.id}
                    className={`flex items-center gap-2.5 rounded border cursor-pointer px-3 py-2.5 transition-all ${
                      color.enabled
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}>
                    <input type="checkbox" checked={color.enabled}
                      onChange={() => toggleColor(color.id)}
                      className="sr-only" />
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${color.enabled ? "border-transparent" : "border-slate-300"}`}
                      style={{ backgroundColor: color.enabled ? color.hex : "#e2e8f0" }} />
                    <span className="text-sm font-medium text-slate-700">{color.label}</span>
                    {color.enabled && <Check size={13} className="ml-auto text-blue-500 flex-shrink-0" />}
                  </label>
                ))}
              </div>

              {/* Custom colors */}
              {customColors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Custom Colors</p>
                  <div className="space-y-1.5">
                    {customColors.map(c => (
                      <div key={c.id} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                        <span className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
                          style={{ backgroundColor: c.hex }} />
                        <span className="text-sm text-slate-700 flex-1">{c.label}</span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                          <input type="checkbox" checked={c.enabled} onChange={() => toggleColor(c.id)}
                            className="accent-blue-500" />
                          Enabled
                        </label>
                        <button type="button" onClick={() => removeCustomColor(c.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add custom color */}
              <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">Add Custom Color</p>
                <div className="flex items-center gap-2">
                  <input className={`${INP} flex-1`} placeholder="Color name"
                    value={form.customColor.label}
                    onChange={e => setF("customColor", { ...form.customColor, label: e.target.value })} />
                  <div className="relative flex-shrink-0">
                    <input type="color" value={form.customColor.hex}
                      onChange={e => setF("customColor", { ...form.customColor, hex: e.target.value })}
                      className="w-10 h-[38px] rounded border border-slate-200 cursor-pointer p-0.5" />
                  </div>
                  <button type="button" onClick={addCustomColor}
                    disabled={!form.customColor.label.trim()}
                    className="flex items-center gap-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition-colors flex-shrink-0">
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="p-6 flex items-center gap-3">
              <button type="button" onClick={handleSubmit}
                className="flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-bold text-white transition-colors">
                <Save size={14} /> {isAdd ? "Add Size" : "Save Changes"}
              </button>
              <button type="button" onClick={cancelForm}
                className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: list view ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Sandbox Workflow Settings</h2>
              <p className="text-sm text-slate-500 mt-1">Stored locally in the admin config record.</p>
            </div>
            <div className="space-y-3">
              <Field label="n8n Orders Webhook URL">
                <input className={INP} value={workflowForm.n8nOrdersWebhookUrl} onChange={e => setWorkflowForm(p => ({ ...p, n8nOrdersWebhookUrl: e.target.value }))} />
              </Field>
              <Field label="n8n Callback Secret">
                <input className={INP} value={workflowForm.n8nCallbackSecret} onChange={e => setWorkflowForm(p => ({ ...p, n8nCallbackSecret: e.target.value }))} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={workflowForm.webhookEnabled} onChange={e => setWorkflowForm(p => ({ ...p, webhookEnabled: e.target.checked }))} />
                Enable outbound webhook delivery
              </label>
              <Field label="Sandbox PayPal Client ID">
                <input className={INP} value={workflowForm.sandboxPayPalClientId} onChange={e => setWorkflowForm(p => ({ ...p, sandboxPayPalClientId: e.target.value }))} />
              </Field>
              <Field label="Sandbox PayPal Secret">
                <input className={INP} value={workflowForm.sandboxPayPalSecret} onChange={e => setWorkflowForm(p => ({ ...p, sandboxPayPalSecret: e.target.value }))} />
              </Field>
              <button type="button" onClick={saveWorkflowSettings} className="rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-bold text-white">
                Save Workflow Settings
              </button>
            </div>
          </div>

          <RecentOrdersPanel />
        </div>

        {savedFlash && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check size={15} className="flex-shrink-0" />
            Changes saved successfully.
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-black text-slate-800">Nameplate Sizes</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {sizes.length} size{sizes.length !== 1 ? "s" : ""} total —{" "}
              {activeSizes.length} active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openAdd}
              className="flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-colors">
              <Plus size={14} /> Add New Size
            </button>
          </div>
        </div>

        {/* Sizes table */}
        {sortedSizes.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_auto_110px_90px_90px_110px_110px] gap-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Order</span>
              <span>Size</span>
              <span>Dimensions</span>
              <span>Status</span>
              <span>Base Price</span>
              <span>Colors</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50">
              {sortedSizes.map((s, idx) => (
                <SizeRow
                  key={s.id}
                  size={s}
                  isFirst={idx === 0}
                  isLast={idx === sortedSizes.length - 1}
                  confirmingDelete={deleteId === s.id}
                  onEdit={() => openEdit(s.id)}
                  onDelete={() => setDeleteId(s.id)}
                  onDeleteConfirm={() => { deleteSize(s.id); setDeleteId(null); }}
                  onDeleteCancel={() => setDeleteId(null)}
                  onMoveUp={() => moveOrder(s.id, -1)}
                  onMoveDown={() => moveOrder(s.id, 1)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Active sizes</strong> appear in the customer size picker. Inactive sizes are hidden.</p>
            <p><strong>Pricing</strong> is shown in the cart and checkout review. Final pricing is confirmed at invoice time.</p>
            <p><strong>Colors</strong> enabled here are shown to customers when designing a nameplate of that size.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentOrdersPanel() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    void fetch("/api/orders").then(r => r.json()).then(data => setOrders(data.orders ?? [])).catch(() => setOrders([]));
  }, []);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-lg font-black text-slate-800">Recent Orders</h2>
      <div className="mt-3 space-y-2 max-h-80 overflow-auto">
        {orders.length === 0 ? <p className="text-sm text-slate-500">No orders yet.</p> : orders.map((o) => (
          <button key={String(o.orderId ?? o.id)} type="button" onClick={() => setSelected(o)} className="w-full text-left rounded border border-slate-200 p-3 text-sm hover:border-blue-300">
            <div className="font-semibold text-slate-800">{String(o.orderId ?? o.id)}</div>
            <div className="text-slate-500">State: {String(o.state ?? "unknown")}</div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm space-y-2">
          <div className="font-semibold text-slate-800">Selected order: {String(selected.orderId ?? selected.id)}</div>
          <div className="text-slate-500">State: {String(selected.state ?? "unknown")}</div>
          <div className="flex gap-2">
            <button type="button" onClick={async () => {
              const orderId = String(selected.orderId ?? selected.id);
              await fetch(`/api/orders/${orderId}/retry`, { method: "POST" });
            }} className="rounded bg-blue-600 px-3 py-1.5 text-white text-xs font-semibold">
              Retry n8n
            </button>
            <button type="button" onClick={() => setSelected(null)} className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AdminHeader() {
  const lock = useLock();
  return (
    <header className="bg-slate-900 text-white border-b border-slate-700 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-orange-500 flex-shrink-0">
          <span className="text-xs font-black text-white">NX</span>
        </div>
        <span className="font-bold text-sm tracking-tight">
          Nameplates<span className="text-orange-400">Express</span>
          <span className="ml-2 text-slate-400 font-normal">/ Admin</span>
        </span>
        <div className="flex-1" />
        <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-orange-400">
          Internal Only — Not linked from public UI
        </span>
        <button
          onClick={lock}
          className="flex items-center gap-1.5 rounded border border-slate-600 hover:border-slate-400 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          title="Lock admin panel"
        >
          <LogOut size={12} /> Lock Admin
        </button>
      </div>
    </header>
  );
}

function SizeRow({
  size, isFirst, isLast, confirmingDelete,
  onEdit, onDelete, onDeleteConfirm, onDeleteCancel, onMoveUp, onMoveDown,
}: {
  size: AdminSize; isFirst: boolean; isLast: boolean; confirmingDelete: boolean;
  onEdit: () => void; onDelete: () => void;
  onDeleteConfirm: () => void; onDeleteCancel: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const tierCount = size.pricingTiers.length;

  return (
    <div>
      <div className={`grid grid-cols-[40px_auto_110px_90px_90px_110px_110px] gap-0 px-4 py-3.5 items-center hover:bg-slate-50 transition-colors ${!size.active ? "opacity-60" : ""}`}>
        {/* Order controls */}
        <div className="flex flex-col items-center gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst}
            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-0 transition-colors" title="Move up">
            <ChevronUp size={14} />
          </button>
          <span className="text-xs font-mono text-slate-400 leading-none">{size.sortOrder}</span>
          <button onClick={onMoveDown} disabled={isLast}
            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-0 transition-colors" title="Move down">
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Name + description */}
        <div className="pr-3">
          <p className="text-sm font-semibold text-slate-800">{size.label}</p>
          {size.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{size.description}</p>}
        </div>

        {/* Dimensions */}
        <div className="text-sm text-slate-600">
          {size.width}" × {size.height}"
        </div>

        {/* Status */}
        <div><Badge active={size.active} /></div>

        {/* Price */}
        <div>
          <p className="text-sm font-semibold text-slate-800">${size.basePrice.toFixed(2)}</p>
          {tierCount > 0 && (
            <p className="text-xs text-slate-400">{tierCount} tier{tierCount !== 1 ? "s" : ""}</p>
          )}
        </div>

        {/* Colors */}
        <div><ColorDots colors={size.colors} /></div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <button onClick={onEdit}
            className="flex items-center gap-1 rounded border border-slate-200 hover:border-blue-300 hover:text-blue-600 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all">
            <Pencil size={11} /> Edit
          </button>
          <button onClick={onDelete}
            className="flex items-center gap-1 rounded border border-slate-200 hover:border-red-300 hover:text-red-500 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-all">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation row */}
      {confirmingDelete && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            Delete <strong>{size.label}</strong>? This cannot be undone.
          </p>
          <button onClick={onDeleteConfirm}
            className="rounded bg-red-600 hover:bg-red-500 px-4 py-1.5 text-xs font-bold text-white transition-colors">
            Yes, Delete
          </button>
          <button onClick={onDeleteCancel}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
        <Plus size={28} className="text-slate-400" />
      </div>
      <div>
        <p className="text-slate-700 font-semibold mb-1">No sizes configured</p>
        <p className="text-sm text-slate-400">Add your first nameplate size to get started.</p>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-bold text-white transition-colors">
        <Plus size={14} /> Add New Size
      </button>
    </div>
  );
}
