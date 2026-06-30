/**
 * CSV bulk import screen.
 * - Upload a CSV file (no header required)
 * - Each row = one nameplate; each column = text field (col 1 → zone 1, etc.)
 * - Preview gallery of PlateFinalPreview cards with overflow warnings
 * - Accept → add all to cart; Cancel → return to designer
 */
import { useState, useRef } from "react";
import { Upload, AlertTriangle, CheckCircle2, X, ArrowLeft, ShoppingCart, Download } from "lucide-react";
import PlateFinalPreview from "@/components/PlateFinalPreview";
import {
  computeOverflowMap, computeHZones, computeVZones,
  type CartItem, type DividerConfig, type Direction,
} from "@/lib/plate-utils";
import {
  defaultZoneConfig,
  type TagSize, type TextZone, type ZoneConfigs,
} from "@/data/templates";

interface CsvRow {
  rowNum: number;            // 1-based row number from the CSV file
  texts: string[];           // parsed column values
  lineConfigs: ZoneConfigs;  // built from base configs with texts applied
  /** Text spills past its segment boundary — non-blocking warning. */
  hasSegmentOverflow: boolean;
  /** Text physically extends past the nameplate edge — hard-blocks this row. */
  hasPlateBoundaryOverflow: boolean;
}

interface Props {
  size: TagSize;
  direction: Direction;
  heights: number[];
  widths: number[];
  baseLineConfigs: ZoneConfigs;
  dividers: DividerConfig[];
  onAccept: (items: Omit<CartItem, "id" | "addedAt" | "batchId">[]) => void;
  onBack: () => void;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function buildRowConfigs(
  texts: string[], baseConfigs: ZoneConfigs, zones: TextZone[],
): ZoneConfigs {
  const result: ZoneConfigs = {};
  zones.forEach((zone, i) => {
    result[zone.id] = {
      ...(baseConfigs[zone.id] ?? defaultZoneConfig()),
      text: texts[i] ?? "",
    };
  });
  return result;
}

// ─── CSV template generator ───────────────────────────────────────────────────
const EXAMPLE_ROWS: string[][] = [
  ["ACME INDUSTRIES", "UNIT NO. 4", "SN: 00456", "MFG: 2024", "ZONE 5", "ZONE 6", "ZONE 7", "ZONE 8", "ZONE 9", "ZONE 10"],
  ["PUMP MOTOR A", "SN: 00123-B", "PANEL MCC-3", "CB-12-A", "ZONE 5", "ZONE 6", "ZONE 7", "ZONE 8", "ZONE 9", "ZONE 10"],
  ["CONTROL PANEL", "CIRCUIT 1", "SECTION B", "DEPT 4", "ZONE 5", "ZONE 6", "ZONE 7", "ZONE 8", "ZONE 9", "ZONE 10"],
];

function downloadCsvTemplate(zones: TextZone[]) {
  const numCols = Math.max(1, Math.min(10, zones.length));
  const escapeCell = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;

  const lines: string[] = [];
  EXAMPLE_ROWS.forEach((row) => {
    lines.push(row.slice(0, numCols).map(escapeCell).join(","));
  });

  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "nameplates-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvView({ size, direction, heights, widths, baseLineConfigs, dividers, onAccept, onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const zones: TextZone[] = direction === "horizontal"
    ? computeHZones(heights)
    : computeVZones(widths);

  function processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const parsed = parseCsv(raw);
      const built: CsvRow[] = parsed.map((cols, idx) => {
        const texts = cols.slice(0, 10); // max 10 fields
        const lc    = buildRowConfigs(texts, baseLineConfigs, zones);
        const ov    = computeOverflowMap(zones, lc, size);
        return {
          rowNum: idx + 1, texts, lineConfigs: lc,
          hasSegmentOverflow:      Object.values(ov).some((v) => v.overflows),
          hasPlateBoundaryOverflow: Object.values(ov).some((v) => v.plateBoundaryOverflow),
        };
      });
      setRows(built);
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  function handleFile(files: FileList | null) {
    if (!files?.length) return;
    processFile(files[0]);
  }

  const anySegmentOverflow      = rows?.some((r) => r.hasSegmentOverflow && !r.hasPlateBoundaryOverflow) ?? false;
  const anyPlateBoundaryOverflow = rows?.some((r) => r.hasPlateBoundaryOverflow) ?? false;
  // Rows accepted = all rows except those that physically overflow the plate edge
  const validCount  = rows?.filter((r) => !r.hasPlateBoundaryOverflow).length ?? 0;
  const blockedCount = rows?.filter((r) => r.hasPlateBoundaryOverflow).length ?? 0;
  const totalCount  = rows?.length ?? 0;

  function handleAccept() {
    if (!rows) return;
    // Include segment-overflow rows (warning only). Exclude plate-boundary rows.
    const items = rows
      .filter((r) => !r.hasPlateBoundaryOverflow)
      .map((r): Omit<CartItem, "id" | "addedAt" | "batchId"> => ({
        size, direction, heights, widths,
        lineConfigs: r.lineConfigs,
        dividers,
      }));
    onAccept(items);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220_20%_6%)] text-slate-200">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-[hsl(220_20%_9%)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Editor
        </button>
        <div className="flex-1" />
        <h1 className="text-base font-semibold tracking-wide">Bulk Import — CSV Preview</h1>
        <div className="flex-1" />
        <span className="text-xs text-slate-500">{size.label} · {direction}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Format hint */}
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <div className="rounded-md border border-slate-700 bg-[hsl(220_20%_11%)] px-4 py-3 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">CSV format:</span>
            {" "}One row per nameplate. Columns map to text fields in order:{" "}
            {zones.map((z, i) => (
              <span key={z.id}>
                <span className="font-mono text-slate-300">Col {i + 1}</span>
                {" "}→ {z.label}{i < zones.length - 1 ? ", " : "."}
              </span>
            ))}
            {" "}No header row required. Up to 10 columns supported.
          </div>
        </div>

        {/* Upload area */}
        {!rows && (
          <div className="mx-auto max-w-5xl px-6 py-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`
                cursor-pointer rounded-lg border-2 border-dashed p-14 text-center transition-colors
                ${dragOver
                  ? "border-blue-500 bg-blue-950/20"
                  : "border-slate-700 hover:border-slate-500 bg-[hsl(220_20%_11%)]"}
              `}
            >
              <Upload size={40} className="mx-auto mb-4 text-slate-500" />
              <p className="text-lg font-semibold text-slate-300 mb-1">Drop CSV file here</p>
              <p className="text-sm text-slate-500">or click to browse</p>
            </div>
            <input
              ref={fileRef} type="file" accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files)}
            />

            {/* Template download */}
            <div className="mt-5 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500">
                Not sure of the format? Download a ready-to-fill template:
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); downloadCsvTemplate(zones); }}
                className="flex items-center gap-2 rounded border border-slate-600 bg-[hsl(220_20%_13%)] px-4 py-2 text-sm text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
              >
                <Download size={14} />
                Download CSV Template ({zones.length} column{zones.length !== 1 ? "s" : ""})
              </button>
              <p className="text-[11px] text-slate-600">
                Fill it out with your nameplate text, save as .csv, then upload above.
              </p>
            </div>
          </div>
        )}

        {/* Gallery */}
        {rows && rows.length > 0 && (
          <div className="mx-auto max-w-5xl px-6 py-6">
            {/* Summary bar */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{totalCount}</span> nameplates from{" "}
                <span className="font-mono text-slate-300 text-xs">{fileName}</span>
              </span>
              {anyPlateBoundaryOverflow && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertTriangle size={14} />
                  {blockedCount} row{blockedCount !== 1 ? "s" : ""} exceed the plate boundary — excluded
                </span>
              )}
              {anySegmentOverflow && (
                <span className="flex items-center gap-1.5 text-sm text-amber-400">
                  <AlertTriangle size={14} />
                  {rows!.filter(r => r.hasSegmentOverflow && !r.hasPlateBoundaryOverflow).length} row{rows!.filter(r => r.hasSegmentOverflow && !r.hasPlateBoundaryOverflow).length !== 1 ? "s" : ""} overflow a segment — included with warning
                </span>
              )}
              <button
                onClick={() => { setRows(null); setFileName(""); fileRef.current && (fileRef.current.value = ""); }}
                className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={13} /> Change file
              </button>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => (
                <div
                  key={row.rowNum}
                  className={`
                    rounded-md border overflow-hidden bg-[hsl(220_20%_11%)]
                    ${row.hasPlateBoundaryOverflow
                      ? "border-red-600/60"
                      : row.hasSegmentOverflow
                        ? "border-amber-600/60"
                        : "border-slate-700"}
                  `}
                >
                  {/* Plate preview */}
                  <div className="bg-[hsl(220_20%_8%)] p-2">
                    <PlateFinalPreview
                      uid={`csv-${row.rowNum}`}
                      size={size}
                      zones={zones}
                      lineConfigs={row.lineConfigs}
                      dividers={dividers}
                      direction={direction}
                    />
                  </div>
                  {/* Card footer */}
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Row {row.rowNum}</span>
                    <div className="flex-1 text-xs text-slate-400 truncate">
                      {row.texts.filter(Boolean).join(" · ") || <em className="text-slate-600">empty</em>}
                    </div>
                    {row.hasPlateBoundaryOverflow ? (
                      <span title="Text exceeds the plate boundary — this row will be excluded">
                        <AlertTriangle size={14} className="text-red-500 shrink-0" />
                      </span>
                    ) : row.hasSegmentOverflow ? (
                      <span title="Text overflows its segment but fits on the plate — will be included with a warning">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      </span>
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="mx-auto max-w-5xl px-6 py-16 text-center text-slate-500">
            No data rows found in the CSV file.
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {rows && (
        <div className="sticky bottom-0 border-t border-slate-800 bg-[hsl(220_20%_9%)] px-6 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          {anyPlateBoundaryOverflow && (
            <p className="text-xs text-red-400">
              {blockedCount} row{blockedCount !== 1 ? "s" : ""} exceed the plate edge and will be skipped.
            </p>
          )}
          {anySegmentOverflow && (
            <p className="text-xs text-amber-400">
              {rows!.filter(r => r.hasSegmentOverflow && !r.hasPlateBoundaryOverflow).length} row{rows!.filter(r => r.hasSegmentOverflow && !r.hasPlateBoundaryOverflow).length !== 1 ? "s" : ""} overflow a segment — included with ⚠ warning.
            </p>
          )}
          <button
            onClick={handleAccept}
            disabled={validCount === 0}
            className="flex items-center gap-2 px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
          >
            <ShoppingCart size={15} />
            Add {validCount} Nameplate{validCount !== 1 ? "s" : ""} to Cart
          </button>
        </div>
      )}
    </div>
  );
}
