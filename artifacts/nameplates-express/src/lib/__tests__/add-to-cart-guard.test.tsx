/**
 * Integration tests for the add-to-cart overflow guard.
 *
 * These tests render a minimal React component that wires computeOverflowMap
 * to a button's `disabled` attribute — exactly as Designer.tsx does — and
 * verify the button's DOM state under each overflow scenario:
 *
 *   segment overflow (zone exceeded, plate OK)  → button ENABLED
 *   plate boundary overflow (plate exceeded)    → button DISABLED
 *
 * This prevents regressions where a future change to the overflow logic
 * silently breaks add-to-cart gating without failing the geometry unit tests.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeAll } from "vitest";
import { setMeasuredWidth } from "./setup";
import { computeOverflowMap, computeHZones } from "../plate-utils";
import { defaultZoneConfig } from "@/data/templates";
import type { TagSize, ZoneConfigs } from "@/data/templates";

// ── Plate geometry reference (3×1 plate with single zone) ─────────────────
//   innerW=964, innerH=297
//   Zone: zx≈38.6, zy≈14.9, zw≈887.5, zh≈267.3
//
//   Canvas mock (setup.ts) returns actualBoundingBoxAscent=0, descent=-1
//   → both em-square fallbacks apply: capH=svgPt×0.72, descH=svgPt×0.20
//   → visBlockH (1 line) = svgPt × 0.92

const SIZE: TagSize = { id: "3x1", width: 3, height: 1, label: '3" × 1"' };

function makeConfigs(overrides: Partial<ReturnType<typeof defaultZoneConfig>> = {}): {
  zones: ReturnType<typeof computeHZones>;
  lineConfigs: ZoneConfigs;
} {
  const zones = computeHZones([100]);
  const lineConfigs: ZoneConfigs = {
    [zones[0].id]: { ...defaultZoneConfig(), ...overrides },
  };
  return { zones, lineConfigs };
}

/**
 * Minimal component that mirrors the Designer's guard:
 *   hasPlateBoundaryOverflow = any zone has plateBoundaryOverflow
 *   button.disabled = hasPlateBoundaryOverflow
 */
function AddToCartGuard({
  zones,
  lineConfigs,
  size,
}: {
  zones: ReturnType<typeof computeHZones>;
  lineConfigs: ZoneConfigs;
  size: TagSize;
}) {
  const overflowMap = computeOverflowMap(zones, lineConfigs, size);
  const hasPlateBoundaryOverflow = Object.values(overflowMap).some(
    (v) => v.plateBoundaryOverflow,
  );
  const hasOverflow = Object.values(overflowMap).some((v) => v.overflows);
  const hasSegmentOverflow = hasOverflow && !hasPlateBoundaryOverflow;

  return (
    <div>
      <button
        data-testid="button-add-to-cart"
        disabled={hasPlateBoundaryOverflow}
      >
        {hasPlateBoundaryOverflow ? "Text outside plate boundary" : "Add to Order"}
      </button>
      {hasPlateBoundaryOverflow && (
        <p data-testid="error-plate-overflow">
          Text extends outside the plate boundary.
        </p>
      )}
      {hasSegmentOverflow && (
        <p data-testid="warning-segment-overflow">
          Text overflows its segment zone but stays within the plate — you can still add to cart.
        </p>
      )}
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("add-to-cart guard (Designer overflow integration)", () => {
  beforeAll(() => {
    setMeasuredWidth(0);
  });

  describe("no text", () => {
    it("renders the button enabled when text is empty", () => {
      const { zones, lineConfigs } = makeConfigs({ text: "" });
      render(<AddToCartGuard zones={zones} lineConfigs={lineConfigs} size={SIZE} />);

      const btn = screen.getByTestId("button-add-to-cart");
      expect(btn).not.toBeDisabled();
      expect(btn).toHaveTextContent("Add to Order");
    });
  });

  describe("segment overflow — add-to-cart must stay ENABLED", () => {
    it("button is enabled and amber warning shown when text overflows zone but not plate", () => {
      // measuredWidth=900 > zw≈887.5 (zone overflow) but textRight≈932 < innerW=964 (plate OK)
      setMeasuredWidth(900);
      const { zones, lineConfigs } = makeConfigs({
        text: "LONG TEXT",
        wordWrap: false,
        hAlign: "center",
      });
      render(<AddToCartGuard zones={zones} lineConfigs={lineConfigs} size={SIZE} />);

      const btn = screen.getByTestId("button-add-to-cart");
      expect(btn).not.toBeDisabled();
      expect(btn).toHaveTextContent("Add to Order");

      const warning = screen.getByTestId("warning-segment-overflow");
      expect(warning).toBeTruthy();
      expect(screen.queryByTestId("error-plate-overflow")).toBeNull();
    });

    it("button is enabled when zone height overflows but text stays within the plate", () => {
      // 64pt on 3" plate: svgPt≈296.3, visBlockH≈272.6
      //   zh≈267.3 → heightOverflow; textBottom(top)≈287.5 < innerH=297 → plate OK
      setMeasuredWidth(50);
      const { zones, lineConfigs } = makeConfigs({
        text: "BIG FONT",
        fontSize: 64,
        vAlign: "top",
        wordWrap: false,
      });
      render(<AddToCartGuard zones={zones} lineConfigs={lineConfigs} size={SIZE} />);

      const btn = screen.getByTestId("button-add-to-cart");
      expect(btn).not.toBeDisabled();
    });
  });

  describe("plate boundary overflow — add-to-cart must be DISABLED", () => {
    it("button is disabled and error message shown when text extends past the plate edge", () => {
      // measuredWidth=970: textRight = zx+zw/2+485 ≈ 967 > innerW=964 → plate overflow
      setMeasuredWidth(970);
      const { zones, lineConfigs } = makeConfigs({
        text: "EXTREMELY LONG TEXT THAT GOES OFF PLATE",
        wordWrap: false,
        hAlign: "center",
      });
      render(<AddToCartGuard zones={zones} lineConfigs={lineConfigs} size={SIZE} />);

      const btn = screen.getByTestId("button-add-to-cart");
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("Text outside plate boundary");

      const error = screen.getByTestId("error-plate-overflow");
      expect(error).toBeTruthy();
      expect(screen.queryByTestId("warning-segment-overflow")).toBeNull();
    });

    it("button is disabled when oversized font pushes text past the plate bottom", () => {
      // 70pt on 3" plate: svgPt≈324.1, visBlockH≈298.2
      //   textBottom(top-align) = 14.9 + 298.2 = 313.1 > innerH=297 → plate overflow
      setMeasuredWidth(50);
      const { zones, lineConfigs } = makeConfigs({
        text: "BIG",
        fontSize: 70,
        vAlign: "top",
        wordWrap: false,
      });
      render(<AddToCartGuard zones={zones} lineConfigs={lineConfigs} size={SIZE} />);

      const btn = screen.getByTestId("button-add-to-cart");
      expect(btn).toBeDisabled();
    });

    it("add-to-cart re-enables after plate-overflow text is replaced with short text", () => {
      // First render: plate overflow → disabled
      setMeasuredWidth(970);
      const { zones, lineConfigs: overflowConfigs } = makeConfigs({
        text: "OVERFLOW",
        wordWrap: false,
      });
      const { rerender } = render(
        <AddToCartGuard zones={zones} lineConfigs={overflowConfigs} size={SIZE} />,
      );
      expect(screen.getByTestId("button-add-to-cart")).toBeDisabled();

      // After rerender with short text: enabled
      setMeasuredWidth(50);
      const { lineConfigs: shortConfigs } = makeConfigs({ text: "HI", wordWrap: false });
      rerender(<AddToCartGuard zones={zones} lineConfigs={shortConfigs} size={SIZE} />);
      expect(screen.getByTestId("button-add-to-cart")).not.toBeDisabled();
    });
  });
});
