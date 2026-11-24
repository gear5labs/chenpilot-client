import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatLayout } from "./ChatLayout";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/chat",
}));

const mockDispatch = vi.fn();
vi.mock("@/store", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: { user: { name: "Test Pilot", email: "pilot@example.test" } },
      chat: {
        chatHistory: {},
        currentConversation: null,
        conversations: [],
        messages: [],
      },
    }),
}));

vi.mock("@/hooks/useChatSearch", () => ({
  useChatSearch: () => ({
    isSearchOpen: false,
    openSearch: vi.fn(),
    closeSearch: vi.fn(),
    setQuery: vi.fn(),
    goToNext: vi.fn(),
    goToPrev: vi.fn(),
    searchState: null,
    searchInputRef: { current: null },
  }),
}));

vi.mock("@/components/chat/ConversationManager", () => ({
  ConversationManager: () => <div data-testid="conversation-manager">ConversationManager</div>,
}));

vi.mock("@/components/chat/ConversationExportMenu", () => ({
  ConversationExportMenu: () => <div data-testid="export-menu">ExportMenu</div>,
}));

vi.mock("@/components/chat/DeleteConversationDialog", () => ({
  DeleteConversationDialog: () => <div data-testid="delete-dialog">DeleteDialog</div>,
}));

vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ""} />,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ChatLayout responsive behavior and drawer states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.className = "";
  });

  it("renders main content children", () => {
    render(
      <ChatLayout>
        <div data-testid="chat-children">Hello Chat</div>
      </ChatLayout>,
    );

    expect(screen.getByTestId("chat-children")).toBeInTheDocument();
  });

  it("renders mobile header and menu button", () => {
    render(
      <ChatLayout>
        <div>Content</div>
      </ChatLayout>,
    );

    expect(screen.getByTestId("mobile-header")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
  });

  it("opens mobile sidebar drawer on menu button click and sets body.sidebar-open", () => {
    render(
      <ChatLayout>
        <div>Content</div>
      </ChatLayout>,
    );

    expect(document.body.classList.contains("sidebar-open")).toBe(false);

    const menuBtn = screen.getByTestId("mobile-menu-button");
    fireEvent.click(menuBtn);

    // Overlay is rendered
    expect(screen.getByTestId("sidebar-overlay")).toBeInTheDocument();
    // Body scroll lock class applied
    expect(document.body.classList.contains("sidebar-open")).toBe(true);
  });

  it("closes mobile sidebar drawer when clicking overlay", () => {
    render(
      <ChatLayout>
        <div>Content</div>
      </ChatLayout>,
    );

    fireEvent.click(screen.getByTestId("mobile-menu-button"));
    const overlay = screen.getByTestId("sidebar-overlay");
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay);
    expect(screen.queryByTestId("sidebar-overlay")).not.toBeInTheDocument();
    expect(document.body.classList.contains("sidebar-open")).toBe(false);
  });

  it("closes mobile sidebar drawer on Escape key", () => {
    render(
      <ChatLayout>
        <div>Content</div>
      </ChatLayout>,
    );

    fireEvent.click(screen.getByTestId("mobile-menu-button"));
    expect(screen.getByTestId("sidebar-overlay")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("sidebar-overlay")).not.toBeInTheDocument();
    expect(document.body.classList.contains("sidebar-open")).toBe(false);
  });

  it("toggles desktop sidebar collapse state", () => {
    render(
      <ChatLayout>
        <div>Content</div>
      </ChatLayout>,
    );

    const nav = screen.getByTestId("sidebar-navigation");
    expect(nav).toHaveClass("w-72");

    const collapseBtn = screen.getByTestId("collapse-sidebar-button");
    fireEvent.click(collapseBtn);
    expect(nav).toHaveClass("w-16");

    const expandBtn = screen.getByTestId("expand-sidebar-button");
    fireEvent.click(expandBtn);
    expect(nav).toHaveClass("w-72");
  });

  it("toggles profile menu dropdown", () => {
    render(
      <ChatLayout>
        <div>Content</div>
      </ChatLayout>,
    );

    const profileBtn = screen.getByTestId("profile-menu-button");
    expect(screen.queryByTestId("profile-menu-dropdown")).not.toBeInTheDocument();

    fireEvent.click(profileBtn);
    expect(screen.getByTestId("profile-menu-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });
});
