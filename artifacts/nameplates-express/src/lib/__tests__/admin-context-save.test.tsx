import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminConfigMock, putAdminConfigMock } = vi.hoisted(() => ({
  getAdminConfigMock: vi.fn(),
  putAdminConfigMock: vi.fn(),
}));

vi.mock("@workspace/api-client-react", async () => {
  const actual = await vi.importActual<typeof import("@workspace/api-client-react")>("@workspace/api-client-react");
  return {
    ...actual,
    getAdminConfig: getAdminConfigMock,
    putAdminConfig: putAdminConfigMock,
  };
});

import { AdminProvider, useAdmin } from "@/context/AdminContext";

function SaveProbe() {
  const { updateWorkflowSettings, saveStatus, saveError } = useAdmin();
  return (
    <div>
      <button type="button" onClick={() => updateWorkflowSettings({ webhookEnabled: true })}>
        Save workflow
      </button>
      <p>{saveStatus}</p>
      <p>{saveError ?? "no-error"}</p>
    </div>
  );
}

describe("AdminProvider save feedback", () => {
  beforeEach(() => {
    sessionStorage.clear();
    getAdminConfigMock.mockReset();
    putAdminConfigMock.mockReset();
    getAdminConfigMock.mockResolvedValue({
      configured: true,
      sizes: [],
      workflowSettings: {},
    });
  });

  it("reports saved only after the admin config PUT succeeds", async () => {
    putAdminConfigMock.mockResolvedValue({
      configured: true,
      sizes: [],
      workflowSettings: {
        webhookEnabled: true,
      },
    });

    render(
      <AdminProvider>
        <SaveProbe />
      </AdminProvider>,
    );

    await waitFor(() => {
      expect(getAdminConfigMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save workflow" }));

    await waitFor(() => {
      expect(putAdminConfigMock).toHaveBeenCalledWith(
        {
          sizes: [],
          workflowSettings: { webhookEnabled: true },
        },
        {},
      );
    });
    await screen.findByText("saved");
    expect(screen.getByText("no-error")).toBeInTheDocument();
  });

  it("surfaces a visible error when admin config persistence fails", async () => {
    putAdminConfigMock.mockRejectedValueOnce(new Error("database unavailable"));

    render(
      <AdminProvider>
        <SaveProbe />
      </AdminProvider>,
    );

    await waitFor(() => {
      expect(getAdminConfigMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save workflow" }));

    await screen.findByText("error");
    expect(screen.getByText("We couldn't save the admin configuration. Check the server and try again.")).toBeInTheDocument();
  });
});
