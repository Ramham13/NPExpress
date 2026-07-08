import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_KEY_SESSION_STORAGE } from "@/context/AdminContext";
import { RecentOrdersPanel } from "@/pages/AdminPage";

describe("RecentOrdersPanel", () => {
  beforeEach(() => {
    sessionStorage.setItem(ADMIN_KEY_SESSION_STORAGE, "admin-token");
    vi.stubGlobal("fetch", vi.fn());
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
        ok: true,
        orderId: "NX-2026-ABC123",
        state: "n8n_sent",
        attemptNumber: 2,
      }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        orders: [{ orderId: "NX-2026-ABC123", state: "n8n_sent" }],
      }), { status: 200 }));

    render(<RecentOrdersPanel />);

    await screen.findByRole("button", { name: /NX-2026-ABC123/i });
    fireEvent.click(screen.getByRole("button", { name: /NX-2026-ABC123/i }));
    expect(screen.getAllByText("State: n8n_failed")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /Retry n8n/i }));

    await waitFor(() => {
      expect(screen.getAllByText("State: n8n_sent")).toHaveLength(2);
    });
    expect(screen.getByText("Retry attempt 2 started for NX-2026-ABC123.")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenNthCalledWith(3, "/api/orders", expect.any(Object));
  });

  it("shows the backend retry error when the handoff configuration is missing", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        orders: [{ orderId: "NX-2026-ABC123", state: "n8n_failed" }],
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
});
