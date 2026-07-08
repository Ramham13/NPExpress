import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Designer from "@/pages/Designer";

vi.mock("@/context/AdminContext", () => ({
  useAdmin: () => ({
    sizes: [
      {
        id: "6x2",
        label: '6" x 2"',
        width: 6,
        height: 2,
        active: true,
        sortOrder: 1,
        basePrice: 5.5,
        description: "",
        pricingTiers: [],
        colors: [{ id: "black", label: "Black", hex: "#111111", enabled: true }],
      },
    ],
    activeSizes: [
      {
        id: "6x2",
        label: '6" x 2"',
        width: 6,
        height: 2,
        active: true,
        sortOrder: 1,
        basePrice: 5.5,
        description: "",
        pricingTiers: [],
        colors: [{ id: "black", label: "Black", hex: "#111111", enabled: true }],
      },
    ],
  }),
}));

vi.mock("@/components/PlateFinalPreview", () => ({
  default: () => <div data-testid="final-preview" />,
}));

describe("Designer cart button", () => {
  it("exposes an accessible name for the icon-only cart action in the designer header", () => {
    render(<Designer />);

    fireEvent.click(screen.getByTestId("button-size-6x2"));

    const cartButton = screen.getByRole("button", { name: "View order" });
    expect(cartButton).toHaveAttribute("title", "View order");
  });

  it("keeps the primary cart action distinct from the secondary order-summary shortcut", () => {
    render(<Designer />);

    fireEvent.click(screen.getByTestId("button-size-6x2"));
    fireEvent.click(screen.getByTestId("button-add-to-cart"));

    expect(screen.getByRole("button", { name: "View order (1 item)" })).toHaveAttribute("title", "View order");
    expect(screen.getByRole("button", { name: "Review order summary (1 item)" })).toBeInTheDocument();
  });
});
