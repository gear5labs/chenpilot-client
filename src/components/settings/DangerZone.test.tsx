import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DangerZone } from "./DangerZone";

const { exportUserData } = vi.hoisted(() => ({
  exportUserData: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  default: { exportUserData },
}));

describe("DangerZone", () => {
  beforeEach(() => {
    exportUserData.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("keeps deletion disabled until the email matches", () => {
    const onDelete = vi.fn();
    render(<DangerZone email="user@example.com" onDelete={onDelete} />);

    const button = screen.getByRole("button", { name: "Delete Account" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("user@example.com"), {
      target: { value: "other@example.com" },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("user@example.com"), {
      target: { value: "user@example.com" },
    });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  describe("account data export (#511, #512)", () => {
    it("shows preparation state, then downloads with the validated filename", async () => {
      let resolveExport: (value: unknown) => void = () => {};
      exportUserData.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveExport = resolve;
          }),
      );
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      render(<DangerZone email="user@example.com" onDelete={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export account data" }));

      // Preparation phase is announced before the request resolves (#511)
      expect(await screen.findByText(/Preparing your data export/)).toBeInTheDocument();
      expect(screen.getByText(/cannot be cancelled/)).toBeInTheDocument();
      expect(exportUserData).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          onProgress: expect.any(Function),
        }),
      );

      const onProgress = exportUserData.mock.calls[0][0].onProgress as (p: {
        loaded: number;
        total?: number;
        percent?: number;
      }) => void;
      onProgress({ loaded: 5, total: 10, percent: 50 });

      expect(await screen.findByText(/Downloading export… 50%/)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");

      resolveExport({
        blob: new Blob(["{}"], { type: "application/json" }),
        fileName: "account-export.json",
        mimeType: "application/json",
      });

      expect(await screen.findByText("Export downloaded.")).toBeInTheDocument();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("announces failure and offers retry", async () => {
      exportUserData.mockRejectedValueOnce(new Error("Export endpoint unavailable"));

      render(<DangerZone email="user@example.com" onDelete={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export account data" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Export endpoint unavailable",
      );
      expect(
        screen.getByRole("button", { name: "Retry data export" }),
      ).toBeInTheDocument();
    });

    it("cancels an in-flight export", async () => {
      exportUserData.mockImplementationOnce(
        ({ signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              const err = new Error("canceled");
              (err as { code?: string }).code = "ERR_CANCELED";
              reject(err);
            });
          }),
      );

      render(<DangerZone email="user@example.com" onDelete={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export account data" }));

      const cancelButton = await screen.findByRole("button", { name: "Cancel export" });
      fireEvent.click(cancelButton);

      await waitFor(() =>
        expect(screen.getByText("Export cancelled.")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: "Export account data" }),
      ).toBeEnabled();
    });
  });
});
