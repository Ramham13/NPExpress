import { describe, expect, it } from "vitest";
import { getColorHex, getColorLabel, getPlateStyle } from "../admin-store";

describe("admin color helpers", () => {
  const customColors = [
    { id: "custom-cobalt", label: "Cobalt", hex: "#3366cc", enabled: true },
  ];

  it("returns configured custom color metadata", () => {
    expect(getColorLabel("custom-cobalt", customColors)).toBe("Cobalt");
    expect(getColorHex("custom-cobalt", customColors)).toBe("#3366cc");
  });

  it("builds a non-black custom plate style when a custom hex is provided", () => {
    const style = getPlateStyle("custom-cobalt", "#3366cc");
    expect(style.gA).not.toBe(getPlateStyle("black").gA);
    expect(style.border).toContain("hsl(");
  });
});
