"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { setTheme } from "@/store/slices/uiSlice";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.mode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize theme from localStorage or system preference
    const initTheme = () => {
      if (typeof window === "undefined") return;

      const savedTheme = localStorage.getItem("theme") as
        | "light"
        | "dark"
        | null;

      if (savedTheme) {
        dispatch(setTheme(savedTheme));
      } else {
        // Detect system preference
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        dispatch(setTheme(prefersDark ? "dark" : "light"));
      }
    };

    initTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply if no saved preference
      if (!localStorage.getItem("theme")) {
        dispatch(setTheme(e.matches ? "dark" : "light"));
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [dispatch]);

  // Apply theme to HTML element
  useEffect(() => {
    if (typeof document === "undefined" || !mounted) return;

    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [theme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
