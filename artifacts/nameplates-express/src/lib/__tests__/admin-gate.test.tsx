import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { postAdminUnlockMock } = vi.hoisted(() => ({
  postAdminUnlockMock: vi.fn(),
}));

vi.mock("@workspace/api-client-react", async () => {
  const actual = await vi.importActual<typeof import("@workspace/api-client-react")>("@workspace/api-client-react");
  return {
    ...actual,
    postAdminUnlock: postAdminUnlockMock,
  };
});

import AdminPage from "@/pages/AdminPage";

describe("AdminGate", () => {
  beforeEach(() => {
    postAdminUnlockMock.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("shows the incorrect-password message only for 401 failures", async () => {
    postAdminUnlockMock.mockRejectedValueOnce({ status: 401 });

    render(<AdminPage />);

    const passwordInput = screen.getByPlaceholderText("Password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "bad-password" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await screen.findByText("Incorrect password. Try again.");
    expect(passwordInput.value).toBe("");
  });

  it("shows a configuration notice for 503 failures", async () => {
    postAdminUnlockMock.mockRejectedValueOnce({ status: 503 });

    render(<AdminPage />);

    const passwordInput = screen.getByPlaceholderText("Password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "local-password" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await screen.findByText("Admin authentication is not configured on the server yet.");
    expect(screen.queryByText("Incorrect password. Try again.")).not.toBeInTheDocument();
    expect(passwordInput.value).toBe("local-password");
  });

  it("shows a generic unlock notice for unexpected failures", async () => {
    postAdminUnlockMock.mockRejectedValueOnce(new Error("network down"));

    render(<AdminPage />);

    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "local-password" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await screen.findByText("Unable to unlock admin access right now. Check the server connection and try again.");
    expect(screen.queryByText("Incorrect password. Try again.")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(postAdminUnlockMock).toHaveBeenCalledWith({ password: "local-password" });
    });
  });
});
