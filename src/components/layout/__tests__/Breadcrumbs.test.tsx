import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Breadcrumbs,
  BreadcrumbItem,
  getRouteBreadcrumbs,
} from "../Breadcrumbs";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("getRouteBreadcrumbs", () => {
  it("returns empty array for root and top-level routes (non-nested)", () => {
    expect(getRouteBreadcrumbs("/")).toEqual([]);
    expect(getRouteBreadcrumbs("/dashboard")).toEqual([]);
    expect(getRouteBreadcrumbs("/chat")).toEqual([]);
    expect(getRouteBreadcrumbs("/contacts")).toEqual([]);
    expect(getRouteBreadcrumbs("/send")).toEqual([]);
    expect(getRouteBreadcrumbs("")).toEqual([]);
    expect(getRouteBreadcrumbs(null)).toEqual([]);
  });

  it("returns nested breadcrumbs for nested chat routes", () => {
    const historyBreadcrumbs = getRouteBreadcrumbs("/chat/history");
    expect(historyBreadcrumbs).toEqual([
      { label: "Chat", href: "/chat" },
      { label: "Chat History", href: "/chat/history", current: true },
    ]);

    const convoBreadcrumbs = getRouteBreadcrumbs("/chat/conv-123", "Custom Topic");
    expect(convoBreadcrumbs).toEqual([
      { label: "Chat", href: "/chat" },
      { label: "Custom Topic", href: "/chat/conv-123", current: true },
    ]);
  });

  it("returns nested breadcrumbs for settings under dashboard", () => {
    const settingsBreadcrumbs = getRouteBreadcrumbs("/settings");
    expect(settingsBreadcrumbs).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings", current: true },
    ]);

    const nestedSettings = getRouteBreadcrumbs("/settings/security");
    expect(nestedSettings).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings" },
      { label: "Security", href: "/settings/security", current: true },
    ]);
  });

  it("returns nested breadcrumbs for transactions under dashboard", () => {
    const txBreadcrumbs = getRouteBreadcrumbs("/transactions");
    expect(txBreadcrumbs).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Transactions", href: "/transactions", current: true },
    ]);
  });

  it("returns nested breadcrumbs for admin routes", () => {
    const adminBreadcrumbs = getRouteBreadcrumbs("/admin/audit");
    expect(adminBreadcrumbs).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Audit Log", href: "/admin/audit", current: true },
    ]);
  });
});

describe("Breadcrumbs component", () => {
  it("renders nothing when items are empty or have only 1 item (non-nested routes)", () => {
    const { container: emptyContainer } = render(<Breadcrumbs items={[]} />);
    expect(emptyContainer).toBeEmptyDOMElement();

    const singleItem: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard" }];
    const { container: singleContainer } = render(<Breadcrumbs items={singleItem} />);
    expect(singleContainer).toBeEmptyDOMElement();
  });

  it("renders breadcrumbs when route is nested (items >= 2)", () => {
    const items: BreadcrumbItem[] = [
      { label: "Chat", href: "/chat" },
      { label: "Chat History", href: "/chat/history", current: true },
    ];

    render(<Breadcrumbs items={items} />);

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();

    const parentLink = screen.getByRole("link", { name: "Chat" });
    expect(parentLink).toHaveAttribute("href", "/chat");
    expect(screen.getByText("Chat History")).toBeInTheDocument();
  });

  it("marks the current page with aria-current='page' and renders as non-link", () => {
    const items: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings", current: true },
    ];

    render(<Breadcrumbs items={items} />);

    const currentPage = screen.getByText("Settings");
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage.tagName).toBe("SPAN");

    // Parent is a link, but current page is not a link
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("supports keyboard navigation and narrow screens", () => {
    const items: BreadcrumbItem[] = [
      { label: "Chat", href: "/chat" },
      { label: "Very Long Conversation Title That Should Truncate On Narrow Viewports", current: true },
    ];

    render(<Breadcrumbs items={items} />);

    const link = screen.getByRole("link", { name: "Chat" });
    // Verifies link is focusable
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(link.className).toContain("focus-visible:ring-2");

    // Verifies truncation classes for narrow screens
    const currentSpan = screen.getByText("Very Long Conversation Title That Should Truncate On Narrow Viewports");
    expect(currentSpan.className).toContain("truncate");
  });
});
