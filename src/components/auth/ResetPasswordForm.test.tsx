import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetPasswordForm from "./ResetPasswordForm";
import { authService } from "@/services/auth.service";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/services/auth.service", () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports an expired reset token", async () => {
    vi.mocked(authService.resetPassword).mockRejectedValue({
      response: { status: 410 },
    });

    render(<ResetPasswordForm token="expired-token" />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "invalid or has expired",
      ),
    );
    expect(authService.resetPassword).toHaveBeenCalledWith(
      "expired-token",
      "StrongPass1",
    );
  });
  it("removes the one-time token from the URL after successful reset", async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue({
      success: true,
      data: { message: "Password reset" },
    });
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<ResetPasswordForm token="one-time-secret" />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "StrongPass1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "StrongPass1" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Password updated")).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith({}, "", "/auth/reset-password");
    expect(localStorage.getItem("reset_token")).toBeNull();
    replaceState.mockRestore();
  });

  it("does not submit when the reset token is missing", () => {
    render(<ResetPasswordForm token="" />);
    expect(screen.getByRole("alert")).toHaveTextContent("missing its token");
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

});
