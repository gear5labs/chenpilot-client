import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminAuditLogsPage from "./page";
import apiService from "@/services/api";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock ChatLayout so test isolates page content without full shell overhead
vi.mock("@/components/layout/ChatLayout", () => ({
  ChatLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-chat-layout">{children}</div>
  ),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let mockAuthState = {
  isAuthenticated: true,
  user: {
    id: "user-1",
    email: "testuser@example.com",
    name: "Test User",
    address: "0x123",
    publicKey: "0x456",
    isDeployed: true,
    isFunded: true,
    tokenType: "XLM",
    authProvider: "email",
    isEmailVerified: true,
    role: "member",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

vi.mock("@/store", () => ({
  useAppSelector: (selector: (state: { auth: typeof mockAuthState }) => unknown) =>
    selector({ auth: mockAuthState }),
}));

describe("AdminAuditLogsPage Role-Aware Access Feedback (#317)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      isAuthenticated: true,
      user: {
        id: "user-1",
        email: "testuser@example.com",
        name: "Test User",
        address: "0x123",
        publicKey: "0x456",
        isDeployed: true,
        isFunded: true,
        tokenType: "XLM",
        authProvider: "email",
        isEmailVerified: true,
        role: "member",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    };
  });

  it("renders distinct loading state initially while checking permissions", () => {
    // Return unresolved promise to observe loading state
    vi.spyOn(apiService, "getAuditLogs").mockImplementation(
      () => new Promise(() => {}),
    );

    render(<AdminAuditLogsPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Verifying Admin Access")).toBeInTheDocument();
    expect(
      screen.getByText(/Coordinating with backend authorization service/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("audit-forbidden-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("audit-service-error-state")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Audit Logs")).not.toBeInTheDocument();
  });

  it("renders distinct forbidden state with role-aware access feedback when backend returns 403", async () => {
    const forbiddenError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          message: "Forbidden: Admin role required to access audit logs",
        },
      },
      message: "Request failed with status code 403",
    };
    vi.spyOn(apiService, "getAuditLogs").mockRejectedValue(forbiddenError);

    render(<AdminAuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("audit-forbidden-state")).toBeInTheDocument();
    });

    // Check distinct forbidden content
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText("Administrator Privileges Required")).toBeInTheDocument();

    // Role-aware feedback checks
    expect(screen.getByText("testuser@example.com")).toBeInTheDocument();
    expect(screen.getByText("MEMBER")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("admin:audit")).toBeInTheDocument();
    expect(
      screen.getByText(/Client-side role checks are advisory only and never substitute for server authorization/i),
    ).toBeInTheDocument();

    // Verify privileged audit logs table and filters are NOT rendered
    expect(screen.queryByText("All Actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Audit Logs")).not.toBeInTheDocument();

    // Actions work
    const returnBtn = screen.getByRole("button", { name: /Return to Chat/i });
    fireEvent.click(returnBtn);
    expect(mockPush).toHaveBeenCalledWith("/chat");
  });

  it("never treats a client-side role check as authorization: user with role='admin' still sees forbidden state if backend denies access", async () => {
    mockAuthState.user.role = "admin";

    const forbiddenError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: "Forbidden: Token missing admin:audit claim" },
      },
    };
    vi.spyOn(apiService, "getAuditLogs").mockRejectedValue(forbiddenError);

    render(<AdminAuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("audit-forbidden-state")).toBeInTheDocument();
    });

    // Even though user.role === 'admin' on client, the client coordinated with backend and denied access
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Admin Audit Logs")).not.toBeInTheDocument();
  });

  it("renders distinct service-error state when backend returns 500 or network fails without falling back to mock data", async () => {
    const serverError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: { message: "Internal server error" },
      },
      message: "Internal server error",
    };
    const getAuditLogsSpy = vi.spyOn(apiService, "getAuditLogs").mockRejectedValue(serverError);

    render(<AdminAuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("audit-service-error-state")).toBeInTheDocument();
    });

    // Verify service-error content
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Service Error")).toBeInTheDocument();
    expect(screen.getByText("Unable to Load Audit Logs")).toBeInTheDocument();
    expect(screen.getByText("Internal server error")).toBeInTheDocument();

    // Verify it did NOT fall back to mock data or render table
    expect(screen.queryByText("All Actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Audit Logs")).not.toBeInTheDocument();

    // Verify retry button re-triggers fetchLogs
    const retryBtn = screen.getByRole("button", { name: /Retry Request/i });
    fireEvent.click(retryBtn);
    expect(getAuditLogsSpy).toHaveBeenCalledTimes(2);
  });

  it("renders full audit logs table when backend returns 200 with authorized logs", async () => {
    const mockLogsResponse = {
      success: true,
      data: {
        logs: [
          {
            id: "log-1",
            userId: "user-99",
            userEmail: "auditor@example.com",
            userName: "Auditor",
            action: "admin.access" as const,
            resource: "audit-system",
            description: "Viewed admin audit logs",
            metadata: {},
            severity: "info" as const,
            status: "success" as const,
            timestamp: "2026-11-24T00:00:00.000Z",
            createdAt: "2026-11-24T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
        totalPages: 1,
      },
    };
    vi.spyOn(apiService, "getAuditLogs").mockResolvedValue(mockLogsResponse);

    render(<AdminAuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin Audit Logs")).toBeInTheDocument();
    });

    expect(screen.getByText("auditor@example.com")).toBeInTheDocument();
    expect(screen.getByText("Viewed admin audit logs")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-forbidden-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("audit-service-error-state")).not.toBeInTheDocument();
  });
});
