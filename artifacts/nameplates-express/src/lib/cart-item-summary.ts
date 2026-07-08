import { computeHZones, computeVZones, type CartItem } from "@/lib/plate-utils";

export const UNTITLED_NAMEPLATE_LABEL = "Untitled nameplate";

export function summarizeCartItemText(item: CartItem): string {
  const zones = item.direction === "horizontal"
    ? computeHZones(item.heights)
    : computeVZones(item.widths);

  const text = zones
    .map((zone) => item.lineConfigs[zone.id]?.text?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return text || UNTITLED_NAMEPLATE_LABEL;
}
