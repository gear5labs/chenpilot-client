"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

/**
 * Returns breadcrumb hierarchy based on route pathname.
 * Returns empty array for top-level routes (breadcrumbs only render for nested routes).
 */
export function getRouteBreadcrumbs(
  pathname?: string | null,
  dynamicTitle?: string,
): BreadcrumbItem[] {
  if (!pathname || pathname === "/") return [];

  // Remove trailing slash if any
  const normalizedPath = pathname.replace(/\/+$/, "");

  // Root / top-level standalone routes have no parent hierarchy
  if (
    normalizedPath === "/dashboard" ||
    normalizedPath === "/chat" ||
    normalizedPath === "/contacts" ||
    normalizedPath === "/send"
  ) {
    return [];
  }

  // Nested chat routes
  if (normalizedPath === "/chat/history") {
    return [
      { label: "Chat", href: "/chat" },
      { label: "Chat History", href: "/chat/history", current: true },
    ];
  }

  if (normalizedPath.startsWith("/chat/")) {
    const title = dynamicTitle || "Conversation";
    return [
      { label: "Chat", href: "/chat" },
      { label: title, href: normalizedPath, current: true },
    ];
  }

  // Settings route (nested under Dashboard in application hierarchy)
  if (normalizedPath === "/settings") {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings", current: true },
    ];
  }

  if (normalizedPath.startsWith("/settings/")) {
    const sub = normalizedPath.slice("/settings/".length);
    const subTitle = sub.charAt(0).toUpperCase() + sub.slice(1);
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings" },
      { label: subTitle, href: normalizedPath, current: true },
    ];
  }

  // Transactions route
  if (normalizedPath === "/transactions") {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Transactions", href: "/transactions", current: true },
    ];
  }

  // Admin nested routes
  if (normalizedPath.startsWith("/admin/")) {
    const sub = normalizedPath.slice("/admin/".length);
    const subTitle = sub === "audit" ? "Audit Log" : sub.charAt(0).toUpperCase() + sub.slice(1);
    return [
      { label: "Admin", href: "/admin" },
      { label: subTitle, href: normalizedPath, current: true },
    ];
  }

  // Generic fallback: if path has multiple segments, build hierarchy
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const items: BreadcrumbItem[] = [];
    let accPath = "";
    for (let i = 0; i < segments.length; i++) {
      accPath += `/${segments[i]}`;
      const raw = segments[i];
      const label = raw.charAt(0).toUpperCase() + raw.slice(1);
      const isLast = i === segments.length - 1;
      items.push({
        label,
        href: accPath,
        current: isLast,
      });
    }
    return items;
  }

  return [];
}

/**
 * Lightweight, accessible breadcrumbs component for nested routes.
 * Only renders when items.length >= 2 (reflecting parent navigation).
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items || items.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-2.5 z-10 w-full overflow-hidden",
        className,
      )}
    >
      <ol className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 overflow-x-auto min-w-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current ?? isLast;

          return (
            <li
              key={item.href || `${item.label}-${index}`}
              className="inline-flex items-center min-w-0 flex-shrink-0"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-1 sm:mx-1.5 flex-shrink-0 text-gray-400 dark:text-gray-600"
                />
              )}
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className="font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 dark:hover:text-white transition-colors truncate max-w-[100px] sm:max-w-[160px] md:max-w-none rounded px-1 py-0.5 -mx-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
