import type { CartItem } from "@/lib/plate-utils";
import { resolvePrice, type AdminSize } from "@/lib/admin-store";

export interface CartPricingSummary {
  itemPrices: Map<string, number>;
  subtotal: number;
  hasPricedItems: boolean;
  hasTierPricing: boolean;
}

export function buildCartPricingSummary(cart: CartItem[], sizes: AdminSize[]): CartPricingSummary {
  const countsBySize = new Map<string, number>();
  for (const item of cart) {
    countsBySize.set(item.size.id, (countsBySize.get(item.size.id) ?? 0) + 1);
  }

  const itemPrices = cart.map((item) => {
    const size = sizes.find((entry) => entry.id === item.size.id);
    const qty = countsBySize.get(item.size.id) ?? 1;
    const unitPrice = size ? resolvePrice(size, qty) : 0;

    return {
      itemId: item.id,
      unitPrice,
      priced: Boolean(size),
      tierApplied: size != null ? unitPrice !== size.basePrice : false,
    };
  });

  return {
    itemPrices: new Map(itemPrices.map((item) => [item.itemId, item.unitPrice] as const)),
    subtotal: itemPrices.reduce((sum, item) => sum + (item.priced ? item.unitPrice : 0), 0),
    hasPricedItems: itemPrices.some((item) => item.priced),
    hasTierPricing: itemPrices.some((item) => item.tierApplied),
  };
}
