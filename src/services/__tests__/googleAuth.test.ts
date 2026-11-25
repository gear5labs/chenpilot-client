import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import googleAuthService from "../googleAuth";
import apiService from "../api";

describe("GoogleAuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service's initialized state
    (googleAuthService as unknown as { isInitialized: boolean }).isInitialized =
      false;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("uses NEXT_PUBLIC_GOOGLE_CLIENT_ID from environment", () => {
      const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id";

      const service = new (googleAuthService.constructor as new () => {
        clientId: string;
      })();
      expect(service.clientId).toBe("test-client-id");

      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
    });

    it("defaults to empty string if env var not set", () => {
      const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      const service = new (googleAuthService.constructor as new () => {
        clientId: string;
      })();
      expect(service.clientId).toBe("");

      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
    });
  });

  describe("initialize", () => {
    it("returns early in SSR environment", async () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR
      delete global.window;

      await expect(googleAuthService.initialize()).resolves.not.toThrow();

      global.window = originalWindow;
    });

    it("does not reinitialize if already initialized", async () => {
      (
        googleAuthService as unknown as { isInitialized: boolean }
      ).isInitialized = true;

      const createElementSpy = vi.spyOn(document, "createElement");

      await googleAuthService.initialize();

      expect(createElementSpy).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("returns error if client ID not configured", async () => {
      (googleAuthService as unknown as { clientId: string }).clientId = "";

      const result = await googleAuthService.signIn();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Google Client ID not configured");
    });

    it("returns error if Google Identity Services not available", async () => {
      (
        googleAuthService as unknown as {
          isInitialized: boolean;
          clientId: string;
        }
      ).isInitialized = true;
      (googleAuthService as unknown as { clientId: string }).clientId =
        "test-client-id";
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { google: {} },
      });

      const result = await googleAuthService.signIn();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Google Identity Services not available");
    });

    it("returns a recoverable cancellation when the provider dismisses sign-in", async () => {
      (googleAuthService as unknown as { isInitialized: boolean }).isInitialized = true;
      (googleAuthService as unknown as { clientId: string }).clientId = "test-client-id";
      const prompt = vi.fn((callback?: (notification: {
        isNotDisplayed: () => boolean;
        isSkippedMoment: () => boolean;
        isDismissedMoment: () => boolean;
      }) => void) => callback?.({
        isNotDisplayed: () => false,
        isSkippedMoment: () => false,
        isDismissedMoment: () => true,
      }));
      Object.defineProperty(window, "google", {
        configurable: true,
        value: { accounts: { id: { initialize: vi.fn(), prompt, renderButton: vi.fn(), disableAutoSelect: vi.fn() } } },
      });

      const result = await googleAuthService.signIn();

      expect(result).toEqual({
        success: false,
        error: "Google sign-in was cancelled. You can try again.",
      });
    });

    it("does not surface a provider credential in a backend error", async () => {
      (googleAuthService as unknown as { isInitialized: boolean }).isInitialized = true;
      (googleAuthService as unknown as { clientId: string }).clientId = "test-client-id";
      const providerCredential = "provider-secret-credential";
      let callback: ((response: { credential: string; select_by: string }) => Promise<void>) | undefined;
      Object.defineProperty(window, "google", {
        configurable: true,
        value: {
          accounts: {
            id: {
              initialize: vi.fn((config: { callback: typeof callback }) => { callback = config.callback; }),
              prompt: vi.fn(),
              renderButton: vi.fn(),
              disableAutoSelect: vi.fn(),
            },
          },
        },
      });
      vi.spyOn(apiService, "googleAuth").mockRejectedValue(new Error(providerCredential));

      const resultPromise = googleAuthService.signIn();
      await callback?.({ credential: providerCredential, select_by: "btn" });
      const result = await resultPromise;

      expect(result.error).toBe("Google sign-in failed. Please try again.");
      expect(result.error).not.toContain(providerCredential);
    });
  });

  describe("renderButton", () => {
    it("does nothing if not initialized", () => {
      (
        googleAuthService as unknown as { isInitialized: boolean }
      ).isInitialized = false;
      const renderButton = vi.fn();
      Object.defineProperty(window, "google", {
        configurable: true,
        value: { accounts: { id: { renderButton } } },
      });

      googleAuthService.renderButton("button-container");

      expect(renderButton).not.toHaveBeenCalled();
    });

    it("does nothing in SSR environment", () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR
      delete global.window;

      googleAuthService.renderButton("button-container");

      global.window = originalWindow;
    });
  });

  describe("signOut", () => {
    it("does nothing when not initialized", () => {
      (
        googleAuthService as unknown as { isInitialized: boolean }
      ).isInitialized = false;
      const disableAutoSelect = vi.fn();
      Object.defineProperty(window, "google", {
        configurable: true,
        value: { accounts: { id: { disableAutoSelect } } },
      });

      googleAuthService.signOut();

      expect(disableAutoSelect).not.toHaveBeenCalled();
    });

    it("does nothing when Google not available", () => {
      (
        googleAuthService as unknown as { isInitialized: boolean }
      ).isInitialized = true;
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { google: {} },
      });

      googleAuthService.signOut();

      expect(() => googleAuthService.signOut()).not.toThrow();
    });
  });
});
