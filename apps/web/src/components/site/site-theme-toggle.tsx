"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Buttons, mergeClassNames } from "@shapewebs/ui";

const THEME_STORAGE_KEY = "shapewebs-theme";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const themeCycle: ThemeMode[] = ["light", "dark", "system"];

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
    ? storedTheme
    : "system";
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
}

function getSystemThemeSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" fill="none" r="3" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M8 1.5V3M8 13V14.5M3.4 3.4L4.45 4.45M11.55 11.55L12.6 12.6M1.5 8H3M13 8H14.5M3.4 12.6L4.45 11.55M11.55 4.45L12.6 3.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.25"
        />
      </svg>
    );
  }

  if (mode === "dark") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10.99 1.98A5.92 5.92 0 1 0 14.02 11 5.15 5.15 0 0 1 10.99 1.98Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="8.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M6.25 13.5H9.75M8 11V13.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

type SiteThemeToggleProps = {
  className?: string;
};

export function SiteThemeToggle({ className }: SiteThemeToggleProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    () => false,
  );

  useEffect(() => {
    setThemeMode(getStoredTheme());
  }, []);

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (themeMode === "system") {
      return systemPrefersDark ? "dark" : "light";
    }

    return themeMode;
  }, [systemPrefersDark, themeMode]);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [resolvedTheme, themeMode]);

  const nextMode = themeCycle[(themeCycle.indexOf(themeMode) + 1) % themeCycle.length];

  return (
    <Buttons.Button
      aria-label={`Theme: ${themeMode}. Switch to ${nextMode}.`}
      className={mergeClassNames(className)}
      kind="ghost"
      onClick={() => setThemeMode(nextMode)}
      size="small"
      title={`Theme: ${themeMode}`}
      type="button"
    >
      <ThemeIcon mode={themeMode} />
    </Buttons.Button>
  );
}
