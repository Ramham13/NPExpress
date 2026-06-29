export interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  sizes: string[];
  startingPrice: number;
  layout: string;
  logoReady: boolean;
}

export const products: ProductTemplate[] = [
  {
    id: "equipment-tag",
    name: "Equipment Identification Tag",
    description: "Standard plate for equipment labeling.",
    sizes: ["1x3", "2x4", "3x6"],
    startingPrice: 4.50,
    layout: "top text zone + bottom text zone",
    logoReady: false,
  },
  {
    id: "valve-tag",
    name: "Valve Tag",
    description: "Small round or rectangular tag for valve/pipe labeling.",
    sizes: ["1x1", "1.5x1.5", "2x2"],
    startingPrice: 3.25,
    layout: "center number zone + small description zone",
    logoReady: false,
  },
  {
    id: "control-panel",
    name: "Control Panel Tag",
    description: "Wide format for control panel labeling and switchgear.",
    sizes: ["2x6", "3x9", "4x12"],
    startingPrice: 6.75,
    layout: "left icon zone + right text zone",
    logoReady: false,
  },
  {
    id: "warning-safety",
    name: "Warning / Safety Nameplate",
    description: "Bold warning plates for safety and compliance.",
    sizes: ["3x5", "4x7", "5x9"],
    startingPrice: 8.00,
    layout: "header warning zone + body text zone",
    logoReady: false,
  },
  {
    id: "logo-standard",
    name: "Logo-Ready Standard Template",
    description: "Standard plate with a dedicated fixed logo window on the left.",
    sizes: ["2x6", "3x8", "4x10"],
    startingPrice: 9.50,
    layout: "left logo zone + right text zone",
    logoReady: true,
  },
  {
    id: "logo-premium",
    name: "Logo-Ready Premium Template",
    description: "Full-width plate with large centered logo window and text below.",
    sizes: ["4x8", "5x10", "6x12"],
    startingPrice: 12.00,
    layout: "top logo zone + bottom text zone",
    logoReady: true,
  }
];
