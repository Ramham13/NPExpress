import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuoteDone from "@/pages/QuoteDone";
import type { GuestInfo } from "@/pages/CheckoutGuest";

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
    poNumber: "PO-2026-0001",
    taxExemptNote: "",
  };
}

describe("QuoteDone", () => {
  it("shows the persisted order reference for quote requests", () => {
    render(
      <QuoteDone
        orderNumber="NX-2026-ABC123"
        guestInfo={guestInfo()}
        cart={[]}
        handoffState="sent"
        onNewOrder={() => {}}
      />,
    );

    expect(screen.getByText("Order Reference")).toBeInTheDocument();
    expect(screen.getByText("NX-2026-ABC123")).toBeInTheDocument();
    expect(screen.getByText("Save this number for your records")).toBeInTheDocument();
  });
});
