import { describe, expect, it } from "vitest";

import type { AdminSize } from "../admin-store";
import { buildCartPricingSummary } from "../cart-pricing";
import type { CartItem } from "../plate-utils";

const standardSize: AdminSize = {
  id: "6x2",
  label: '6" x 2"',
  width: 6,
  height: 2,
  description: "Standard size",
  active: true,
  sortOrder: 1,
  basePrice: 5.5,
  pricingTiers: [
    { minQty: 10, priceEach: 4.95 },
    { minQty: 25, priceEach: 4.4 },
  ],
  colors: [],
};

function makeItem(id: string, size: AdminSize): CartItem {
  return {
    id,
    size,
    direction: "horizontal",
    heights: [100],
    widths: [100],
    dividers: [],
    color: "black",
    lineConfigs: {},
  } as CartItem;
}

describe("buildCartPricingSummary", () => {
  it("applies quantity tier pricing consistently across all matching cart items", () => {
    const cart = Array.from({ length: 10 }, (_, index) => makeItem(`item-${index + 1}`, standardSize));

    const pricing = buildCartPricingSummary(cart, [standardSize]);

    expect(pricing.hasPricedItems).toBe(true);
    expect(pricing.hasTierPricing).toBe(true);
    expect(pricing.subtotal).toBeCloseTo(49.5, 2);
    expect(pricing.itemPrices.get("item-1")).toBeCloseTo(4.95, 2);
    expect(pricing.itemPrices.get("item-10")).toBeCloseTo(4.95, 2);
  });

  it("falls back to base pricing when no quantity tier applies", () => {
    const cart = [makeItem("item-1", standardSize), makeItem("item-2", standardSize)];

    const pricing = buildCartPricingSummary(cart, [standardSize]);

    expect(pricing.hasTierPricing).toBe(false);
    expect(pricing.subtotal).toBeCloseTo(11, 2);
    expect(pricing.itemPrices.get("item-1")).toBeCloseTo(5.5, 2);
  });
});
