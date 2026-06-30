/**
 * Unit tests for computeOverflowMap.
 *
 * Geometry reference (3×1 plate, single horizontal zone):
 *   VW=1000, VH=333, PAD=18 → innerW=964, innerH=297
 *   Zone (xPct=4, yPct=5, widthPct=92, heightPct=90):
 *     zx≈38.6, zy≈14.9, zw≈887.5, zh≈267.3
 *
 * Canvas measureText is mocked via setup.ts; actualBoundingBoxAscent/Descent
 * return 0 so the function falls back to:
 *   capH  = svgPt × 0.72
 *   descH = svgPt × 0.20
 *   visBlockH (1 line) = svgPt × 0.92
 *
 * For fontSize=14pt on a 3" plate:
 *   svgPt ≈ 64.8 px → visBlockH ≈ 59.6 px (well inside zh=267)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setMeasuredWidth } from "./setup";
import { computeOverflowMap, computeHZones } from "../plate-utils";
import { defaultZoneConfig } from "@/data/templates";
import type { TagSize, ZoneConfigs } from "@/data/templates";

// ── Fixtures ────────────────────────────────────────────────────────────────

const SIZE_3X1: TagSize = { id: "3x1", width: 3, height: 1, label: '3" × 1"' };

/** Single-zone horizontal layout on the 3×1 plate. */
function singleZone(overrides: Partial<ReturnType<typeof defaultZoneConfig>> = {}) {
  const zones = computeHZones([100]);
  const cfg = { ...defaultZoneConfig(), ...overrides };
  const lineConfigs: ZoneConfigs = { [zones[0].id]: cfg };
  return { zones, lineConfigs };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("computeOverflowMap", () => {
  beforeEach(() => {
    setMeasuredWidth(0);
  });

  // ── 1. Empty text ──────────────────────────────────────────────────────────
  describe("empty text", () => {
    it("returns all false when text is empty string", () => {
      const { zones, lineConfigs } = singleZone({ text: "" });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.widthOverflow).toBe(false);
      expect(info.heightOverflow).toBe(false);
      expect(info.overflows).toBe(false);
      expect(info.plateBoundaryOverflow).toBe(false);
    });

    it("returns all false when text is only whitespace", () => {
      const { zones, lineConfigs } = singleZone({ text: "   " });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.overflows).toBe(false);
      expect(info.plateBoundaryOverflow).toBe(false);
    });
  });

  // ── 2. Text fits zone ──────────────────────────────────────────────────────
  describe("text that fits zone", () => {
    it("reports no overflow when text width is well inside the zone", () => {
      setMeasuredWidth(100); // zw ≈ 887.5 → 100px fits easily
      const { zones, lineConfigs } = singleZone({ text: "ABC", wordWrap: false });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.widthOverflow).toBe(false);
      expect(info.heightOverflow).toBe(false);
      expect(info.overflows).toBe(false);
      expect(info.plateBoundaryOverflow).toBe(false);
    });

    it("reports no overflow when text height is well inside the zone (default 14pt font)", () => {
      // 14pt on 3" plate: svgPt≈64.8, visBlockH≈59.6 << zh≈267
      setMeasuredWidth(50);
      const { zones, lineConfigs } = singleZone({ text: "HI", fontSize: 14, vAlign: "top" });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.heightOverflow).toBe(false);
      expect(info.plateBoundaryOverflow).toBe(false);
    });
  });

  // ── 3. Segment overflow (non-blocking) ────────────────────────────────────
  describe("text that overflows the zone/segment but fits the plate", () => {
    it("sets widthOverflow=true and plateBoundaryOverflow=false (amber warning only)", () => {
      // measuredWidth=900 > zw≈887.5 → widthOverflow
      // textRight = zx+zw/2 + 450 ≈ 932 < innerW=964 → plate is safe
      setMeasuredWidth(900);
      const { zones, lineConfigs } = singleZone({
        text: "LONG TEXT",
        wordWrap: false,
        hAlign: "center",
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.widthOverflow).toBe(true);
      expect(info.overflows).toBe(true);
      expect(info.plateBoundaryOverflow).toBe(false);
    });

    it("sets heightOverflow=true and plateBoundaryOverflow=false when zone is narrow but plate has room", () => {
      // 64pt on 3" plate: svgPt≈296.3, visBlockH≈272.6
      //   zh≈267.3 → heightOverflow (272.6 > 267.3)
      //   textBottom (top-align) = zy(14.9) + 272.6 = 287.5 < innerH=297 → plate OK
      setMeasuredWidth(50);
      const { zones, lineConfigs } = singleZone({
        text: "BIG FONT",
        fontSize: 64,
        vAlign: "top",
        wordWrap: false,
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.heightOverflow).toBe(true);
      expect(info.overflows).toBe(true);
      expect(info.plateBoundaryOverflow).toBe(false);
    });

    it("does not block a word-wrapped zone that fits within the plate", () => {
      // wordWrap=true: widthOverflow is always false regardless of measuredWidth
      setMeasuredWidth(900);
      const { zones, lineConfigs } = singleZone({
        text: "LONG TEXT",
        wordWrap: true,
        hAlign: "center",
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.widthOverflow).toBe(false);
    });
  });

  // ── 4. Plate boundary overflow (hard block) ────────────────────────────────
  describe("text that overflows the plate boundary", () => {
    it("sets plateBoundaryOverflow=true when text extends past the right plate edge", () => {
      // measuredWidth=970: textRight = zx+zw/2+485 ≈ 967 > innerW=964 → plate overflow
      setMeasuredWidth(970);
      const { zones, lineConfigs } = singleZone({
        text: "EXTREMELY LONG TEXT",
        wordWrap: false,
        hAlign: "center",
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.plateBoundaryOverflow).toBe(true);
    });

    it("sets plateBoundaryOverflow=true when huge font pushes text past the bottom plate edge", () => {
      // 70pt on 3" plate: svgPt≈324.1, visBlockH≈298.2
      //   textBottom (top-align) = 14.9 + 298.2 = 313.1 > innerH=297 → plate overflow
      setMeasuredWidth(50);
      const { zones, lineConfigs } = singleZone({
        text: "HUGE FONT",
        fontSize: 70,
        vAlign: "top",
        wordWrap: false,
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.plateBoundaryOverflow).toBe(true);
    });

    it("sets plateBoundaryOverflow=true when left-aligned text runs off the left edge", () => {
      // left-align: textLeft = zx, textRight = zx + maxLineW
      // For textRight > innerW: maxLineW > innerW - zx ≈ 964 - 38.6 = 925.4
      // measuredWidth=930 > 925.4 → overflow
      setMeasuredWidth(930);
      const { zones, lineConfigs } = singleZone({
        text: "TEXT",
        wordWrap: false,
        hAlign: "left",
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.plateBoundaryOverflow).toBe(true);
    });
  });

  // ── 5. Multiple zones ─────────────────────────────────────────────────────
  describe("multiple zones", () => {
    it("reports independent overflow status for each zone", () => {
      const zones = computeHZones([50, 50]); // two equal rows
      // zone 0 (line1): text fits, zone 1 (line2): text overflows plate
      const lineConfigs: ZoneConfigs = {
        line1: { ...defaultZoneConfig(), text: "OK", wordWrap: false },
        line2: { ...defaultZoneConfig(), text: "OVERFLOW", wordWrap: false },
      };

      // We need different widths per zone — use a simple approach:
      // Set a width large enough for line2 to overflow but check line1 separately.
      // Since the mock returns the same width for all calls, test them sequentially
      // with separate computeOverflowMap calls.
      setMeasuredWidth(100);
      const okResult = computeOverflowMap(
        [zones[0]],
        { line1: lineConfigs.line1 },
        SIZE_3X1,
      );
      expect(okResult["line1"].plateBoundaryOverflow).toBe(false);

      setMeasuredWidth(970);
      const overflowResult = computeOverflowMap(
        [zones[1]],
        { line2: lineConfigs.line2 },
        SIZE_3X1,
      );
      expect(overflowResult["line2"].plateBoundaryOverflow).toBe(true);
    });

    it("zones with empty text are not counted as overflowing even when siblings overflow", () => {
      const zones = computeHZones([50, 50]);
      setMeasuredWidth(970);
      const lineConfigs: ZoneConfigs = {
        line1: { ...defaultZoneConfig(), text: "" },
        line2: { ...defaultZoneConfig(), text: "OVERFLOW", wordWrap: false },
      };
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      expect(result["line1"].plateBoundaryOverflow).toBe(false);
      expect(result["line2"].plateBoundaryOverflow).toBe(true);
    });
  });

  // ── 6. Alignment edge cases ────────────────────────────────────────────────
  describe("alignment edge cases", () => {
    it("right-aligned text that overflows the left plate edge is flagged", () => {
      // right-align: textLeft = zx + zw - maxLineW, textRight = zx + zw
      // zx + zw ≈ 38.6 + 887.5 = 926.1 < 964 → right edge OK
      // textLeft = 926.1 - maxLineW < 0 when maxLineW > 926.1
      setMeasuredWidth(930);
      const { zones, lineConfigs } = singleZone({
        text: "TEXT",
        wordWrap: false,
        hAlign: "right",
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.plateBoundaryOverflow).toBe(true);
    });

    it("bottom-aligned text that overflows the top plate edge is flagged", () => {
      // bottom-align: textTop = zy + zh - visBlockH, textBottom = zy + zh
      // zy + zh ≈ 14.9 + 267.3 = 282.2 < 297 → bottom OK
      // textTop = 282.2 - visBlockH < 0 when visBlockH > 282.2
      // 70pt: visBlockH≈298.2 > 282.2 → textTop < 0 → plateBoundaryOverflow
      setMeasuredWidth(50);
      const { zones, lineConfigs } = singleZone({
        text: "HUGE",
        fontSize: 70,
        vAlign: "bottom",
        wordWrap: false,
      });
      const result = computeOverflowMap(zones, lineConfigs, SIZE_3X1);
      const info = result[zones[0].id];
      expect(info.plateBoundaryOverflow).toBe(true);
    });
  });
});
