import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_KEY_SESSION_STORAGE } from "@/context/AdminContext";
import { RecentOrdersPanel } from "@/pages/AdminPage";

describe("RecentOrdersPanel", () => {
  beforeEach(() => {
    sessionStorage.setItem(ADMIN_KEY_SESSION_STORAGE, "admin-token");
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(window, "open", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      value: vi.fn(() => "blob:proof"),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("reloads the order list after a retry and updates the selected order state", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        orders: [{ orderId: "NX-2026-ABC123", state: "n8n_failed" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order: {
          orderId: "NX-2026-ABC123",
          state: "n8n_failed",
          createdAt: "2026-07-08T18:00:00.000Z",
          payload: {
            customer: { name: "Jane Smith", email: "jane@example.com" },
            paymentMethod: "invoice",
            payment: { provider: "invoice", status: "pending" },
          },
        },
        attempts: [{
          id: "attempt-1",
          attemptNumber: 1,
          requestStatus: "retry",
          responseStatus: "502",
          confirmationState: "failed",
          createdAt: "2026-07-08T18:01:00.000Z",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        orderId: "NX-2026-ABC123",
        state: "n8n_sent",
        attemptNumber: 2,
      }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        orders: [{ orderId: "NX-2026-ABC123", state: "n8n_sent" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order: {
          orderId: "NX-2026-ABC123",
          state: "n8n_sent",
          createdAt: "2026-07-08T18:00:00.000Z",
          payload: {
            customer: { name: "Jane Smith", email: "jane@example.com" },
            paymentMethod: "invoice",
            payment: { provider: "invoice", status: "pending" },
          },
        },
        attempts: [{
          id: "attempt-2",
          attemptNumber: 2,
          requestStatus: "retry",
          responseStatus: "202",
          confirmationState: "awaiting",
          createdAt: "2026-07-08T18:05:00.000Z",
        }],
      }), { status: 200 }));

    render(<RecentOrdersPanel />);

    await screen.findByRole("button", { name: /NX-2026-ABC123/i });
    fireEvent.click(screen.getByRole("button", { name: /NX-2026-ABC123/i }));
    await screen.findByText("jane@example.com");
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getAllByText("State: n8n_failed")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /Retry n8n/i }));

    await waitFor(() => {
      expect(screen.getAllByText("State: n8n_sent")).toHaveLength(2);
    });
    expect(screen.getByText(/Attempt #2 - awaiting/i)).toBeInTheDocument();
    expect(screen.getByText("Retry attempt 2 started for NX-2026-ABC123.")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenNthCalledWith(4, "/api/orders", expect.any(Object));
  });

  it("shows the backend retry error when the handoff configuration is missing", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        orders: [{ orderId: "NX-2026-ABC123", state: "n8n_failed" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order: {
          orderId: "NX-2026-ABC123",
          state: "n8n_failed",
          createdAt: "2026-07-08T18:00:00.000Z",
          payload: {
            customer: { name: "Jane Smith", email: "jane@example.com" },
            paymentMethod: "invoice",
            payment: { provider: "invoice", status: "pending" },
          },
        },
        attempts: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: "n8n shared secret is not configured",
      }), { status: 409 }));

    render(<RecentOrdersPanel />);

    await screen.findByRole("button", { name: /NX-2026-ABC123/i });
    fireEvent.click(screen.getByRole("button", { name: /NX-2026-ABC123/i }));
    fireEvent.click(screen.getByRole("button", { name: /Retry n8n/i }));

    await screen.findByText("n8n shared secret is not configured");
  });

  it("loads protected order details and opens proof assets with admin auth", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        orders: [{ orderId: "NX-2026-ABC123", state: "n8n_confirmed" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order: {
          orderId: "NX-2026-ABC123",
          state: "n8n_confirmed",
          createdAt: "2026-07-08T18:00:00.000Z",
          n8nAckReceivedAt: "2026-07-08T18:10:00.000Z",
          payload: {
            customer: { name: "Jane Smith", email: "jane@example.com" },
            paymentMethod: "paypal",
            payment: { provider: "paypal", status: "paid" },
            trackingNumber: "1Z999AA10123456784",
            carrier: "UPS",
          },
        },
        attempts: [{
          id: "attempt-2",
          attemptNumber: 2,
          requestStatus: "retry",
          responseStatus: "202",
          confirmationState: "confirmed",
          createdAt: "2026-07-08T18:05:00.000Z",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("<html><body>proof</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));

    render(<RecentOrdersPanel />);

    await screen.findByRole("button", { name: /NX-2026-ABC123/i });
    fireEvent.click(screen.getByRole("button", { name: /NX-2026-ABC123/i }));

    await screen.findByText("jane@example.com");
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("1Z999AA10123456784 (UPS)")).toBeInTheDocument();
    expect(screen.getByText(/Attempt #2 - confirmed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open Proof Document/i }));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenNthCalledWith(3, "/api/orders/NX-2026-ABC123/proof.html", expect.any(Object));
    });
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith("blob:proof", "_blank", "noopener,noreferrer");
  });
});
