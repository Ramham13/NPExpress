import { describe, expect, it } from "vitest";
import { summarizeCartItemText, UNTITLED_NAMEPLATE_LABEL } from "../cart-item-summary";
import type { CartItem } from "../plate-utils";
import { defaultZoneConfig } from "@/data/templates";

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "item-1",
    size: {
      id: "6x2",
      label: '6" x 2"',
      width: 6,
      height: 2,
    },
    direction: "horizontal",
    widths: [],
    heights: [50, 50],
    lineConfigs: {
      line1: { ...defaultZoneConfig(), text: "Front" },
      line2: { ...defaultZoneConfig(), text: "Rear" },
    },
    dividers: [{ enabled: false, style: "solid" }],
    addedAt: Date.now(),
    ...overrides,
  };
}

describe("summarizeCartItemText", () => {
  it("joins trimmed zone text for populated plates", () => {
    const baseItem = makeItem();
    const item = makeItem({
      lineConfigs: {
        line1: { ...baseItem.lineConfigs.line1, text: "  Front  " },
        line2: { ...baseItem.lineConfigs.line2, text: "Rear" },
      },
    });

    expect(summarizeCartItemText(item)).toBe("Front · Rear");
  });

  it("returns a friendly fallback when all zone text is blank", () => {
    const baseItem = makeItem();
    const item = makeItem({
      lineConfigs: {
        line1: { ...baseItem.lineConfigs.line1, text: "   " },
        line2: { ...baseItem.lineConfigs.line2, text: "" },
      },
    });

    expect(summarizeCartItemText(item)).toBe(UNTITLED_NAMEPLATE_LABEL);
  });
});
