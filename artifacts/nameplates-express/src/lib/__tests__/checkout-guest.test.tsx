import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CheckoutGuest, { type GuestInfo } from "@/pages/CheckoutGuest";

function validGuestInfo(): GuestInfo {
  return {
    name: "Jane Smith",
    company: "Acme Manufacturing",
    email: "jane@example.com",
    phone: "555-123-4567",
    address1: "123 Main St",
    address2: "",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    country: "US",
    billingSameAsShipping: true,
    billingAddress1: "",
    billingAddress2: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "US",
    notes: "",
    poNumber: "PO-2026-0001",
    taxExemptNote: "",
  };
}

describe("CheckoutGuest", () => {
  it("shows async quote submit errors and re-enables the submit button", async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error("n8n shared secret is not configured");
    });

    render(
      <CheckoutGuest
        cart={[]}
        mode="quote"
        initialInfo={validGuestInfo()}
        onBack={() => {}}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Submit Quote Request/i }));

    await screen.findByText("n8n shared secret is not configured");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Submit Quote Request/i })).toBeEnabled();
  });

  it("disables quote submit while the request is in flight", async () => {
    let release = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));

    render(
      <CheckoutGuest
        cart={[]}
        mode="quote"
        initialInfo={validGuestInfo()}
        onBack={() => {}}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Submit Quote Request/i }));

    const busyButton = await screen.findByRole("button", { name: "Submitting Quote Request..." });
    expect(busyButton).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    release();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Quote Request/i })).toBeEnabled();
    });
  });
});
