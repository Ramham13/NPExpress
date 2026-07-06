type WorkflowAdminSize = {
  id?: unknown;
  label?: unknown;
  basePrice?: unknown;
  pricingTiers?: unknown;
};

type PricingTier = {
  minQty: number;
  priceEach: number;
};

type CartItem = Record<string, unknown>;

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizePricingTiers(value: unknown): PricingTier[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const tier = entry as Record<string, unknown>;
    const minQty = toFiniteNumber(tier.minQty);
    const priceEach = toFiniteNumber(tier.priceEach);
    if (minQty == null || priceEach == null) {
      return [];
    }
    return [{ minQty, priceEach }];
  });
}

function resolveUnitPrice(size: WorkflowAdminSize, qty: number) {
  const basePrice = toFiniteNumber(size.basePrice) ?? 0;
  const bestTier = normalizePricingTiers(size.pricingTiers)
    .filter((tier) => qty >= tier.minQty)
    .sort((left, right) => right.minQty - left.minQty)[0];
  return bestTier?.priceEach ?? basePrice;
}

function getSizeId(item: CartItem) {
  const size = (item.size ?? {}) as Record<string, unknown>;
  return typeof size.id === "string" ? size.id : null;
}

function getFallbackSize(item: CartItem): WorkflowAdminSize {
  const size = (item.size ?? {}) as Record<string, unknown>;
  return {
    id: size.id,
    label: size.label,
    basePrice: size.basePrice,
    pricingTiers: size.pricingTiers,
  };
}

export interface CartPricingLineItem {
  itemId: string | null;
  sizeId: string | null;
  sizeLabel: string | null;
  unitPrice: number;
}

export interface CartPricingSummary {
  currencyCode: "USD";
  subtotal: number;
  lineItems: CartPricingLineItem[];
}

export function buildCartPricing(cart: CartItem[], configuredSizes: Record<string, unknown>[] = []): CartPricingSummary {
  const sizeCounts = new Map<string, number>();
  for (const item of cart) {
    const sizeId = getSizeId(item);
    if (!sizeId) {
      continue;
    }
    sizeCounts.set(sizeId, (sizeCounts.get(sizeId) ?? 0) + 1);
  }

  const sizeMap = new Map(
    configuredSizes.flatMap((entry) => {
      const size = entry as WorkflowAdminSize;
      return typeof size.id === "string" ? [[size.id, size] as const] : [];
    }),
  );

  const lineItems = cart.map((item) => {
    const sizeId = getSizeId(item);
    const configuredSize = sizeId ? sizeMap.get(sizeId) : null;
    const size = configuredSize ?? getFallbackSize(item);
    const qty = sizeId ? (sizeCounts.get(sizeId) ?? 1) : 1;
    const unitPrice = resolveUnitPrice(size, qty);
    return {
      itemId: typeof item.id === "string" ? item.id : null,
      sizeId,
      sizeLabel: typeof size.label === "string" ? size.label : null,
      unitPrice,
    };
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.unitPrice, 0);
  return {
    currencyCode: "USD",
    subtotal: Number(subtotal.toFixed(2)),
    lineItems,
  };
}
