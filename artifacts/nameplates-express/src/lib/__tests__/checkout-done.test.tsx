import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CheckoutDone from "@/pages/CheckoutDone";
import type { GuestInfo } from "@/pages/CheckoutGuest";

vi.mock("@/context/AdminContext", () => ({
  useAdmin: () => ({
    workflowSettings: {
      supportEmail: "orders@example.com",
    },
  }),
}));

function guestInfo(): GuestInfo {
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
    poNumber: "",
    taxExemptNote: "",
  };
}

describe("CheckoutDone", () => {
  it("uses customer-safe handoff wording when background processing needs follow-up", () => {
    render(
      <CheckoutDone
        orderNumber="NX-2026-ABC123"
        guestInfo={guestInfo()}
        cart={[]}
        handoffState="failed"
        onNewOrder={() => {}}
      />,
    );

    expect(screen.getByText("Your order has been received. If any follow-up is needed while we finish processing it, our team will contact you.")).toBeInTheDocument();
    expect(screen.queryByText(/manual attention/i)).toBeNull();
    expect(screen.queryByText(/recover it from the order system/i)).toBeNull();
  });
});
