import { beforeEach, describe, expect, it, vi } from "vitest";
import authService from "./auth.service";

const { resetPassword } = vi.hoisted(() => ({ resetPassword: vi.fn() }));
vi.mock("./api", () => ({
  default: { resetPassword },
  singleFlight: { run: (_key: string, callback: () => unknown) => callback() },
}));

describe("AuthService.resetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a non-empty reset token", async () => {
    await expect(authService.resetPassword("  ", "StrongPass1")).rejects.toThrow("token is required");
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("only resolves when the backend confirms the reset", async () => {
    resetPassword.mockResolvedValue({ success: true, data: { message: "Password reset" } });
    await expect(authService.resetPassword("one-time-token", "StrongPass1")).resolves.toMatchObject({ success: true });
    expect(resetPassword).toHaveBeenCalledWith("one-time-token", "StrongPass1");
  });

  it("rejects an unsuccessful API envelope instead of reporting a false success", async () => {
    resetPassword.mockResolvedValue({ success: false, status: 400, message: "Invalid token" });
    await expect(authService.resetPassword("bad-token", "StrongPass1")).rejects.toThrow("not confirmed");
  });
});
