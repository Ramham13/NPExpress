/**
 * Global test setup: mock the Canvas API so computeOverflowMap can run in jsdom
 * without a real rendering context. Each test controls measuredWidth to simulate
 * text that fits or overflows a zone or the plate.
 */
import "@testing-library/jest-dom";
import * as React from "react";

export let measuredWidth = 0;

export function setMeasuredWidth(w: number) {
  measuredWidth = w;
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof HTMLCanvasElement !== "undefined") {
  (HTMLCanvasElement.prototype as any).getContext = function () {
    return {
      font: "",
      measureText: (_text: string) => ({
        width: measuredWidth,
        // 0 > 0 is false → capH fallback (svgPt × 0.72) is used
        actualBoundingBoxAscent: 0,
        // -1 >= 0 is false → descH fallback (svgPt × 0.20) is used
        // This ensures both em-square fallbacks apply consistently in tests.
        actualBoundingBoxDescent: -1,
      }),
    } as unknown as CanvasRenderingContext2D;
  };
}
