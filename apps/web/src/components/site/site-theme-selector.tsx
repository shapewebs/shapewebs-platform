"use client";

import { ButtonControl } from "@shapewebs/ui/button-control";
import { useEffect, useState } from "react";

import styles from "./site-theme-selector.module.css";

type ColorScheme = "dark" | "light";
type ThemePreference = ColorScheme | "system";

const themeStorageKey = "shapewebs-theme-preference";
const legacyThemeStorageKey = "shapewebs-color-scheme";
const systemThemeQuery = "(prefers-color-scheme: dark)";

const themeOptions = [
  { label: "Use light theme", value: "light" },
  { label: "Use system theme", value: "system" },
  { label: "Use dark theme", value: "dark" },
] as const satisfies readonly Readonly<{
  label: string;
  value: ThemePreference;
}>[];

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="8" cy="8" fill="none" r="2.75" stroke="currentColor" />
      <path
        d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect
        fill="none"
        height="8.5"
        rx="1.25"
        stroke="currentColor"
        width="12"
        x="2"
        y="2.25"
      />
      <path
        d="M5.25 13.5h5.5M8 10.75v2.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M12.9 10.2A5.35 5.35 0 0 1 5.8 3.1a5.35 5.35 0 1 0 7.1 7.1Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function readThemePreference(): ThemePreference {
  const storedPreference = window.localStorage.getItem(themeStorageKey);

  if (
    storedPreference === "light" ||
    storedPreference === "system" ||
    storedPreference === "dark"
  ) {
    return storedPreference;
  }

  const legacyPreference = window.localStorage.getItem(legacyThemeStorageKey);

  return legacyPreference === "light" || legacyPreference === "dark"
    ? legacyPreference
    : "dark";
}

function applyThemePreference(
  preference: ThemePreference,
  systemColorScheme: ColorScheme,
) {
  const colorScheme = preference === "system" ? systemColorScheme : preference;

  document.documentElement.dataset.colorScheme = colorScheme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = colorScheme;
}

function ThemeOptionIcon({
  preference,
}: Readonly<{ preference: ThemePreference }>) {
  if (preference === "light") {
    return <SunIcon />;
  }

  if (preference === "system") {
    return <SystemIcon />;
  }

  return <MoonIcon />;
}

export function SiteThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference>("dark");

  useEffect(() => {
    const mediaQuery = window.matchMedia(systemThemeQuery);

    function syncTheme() {
      const nextPreference = readThemePreference();
      const systemColorScheme = mediaQuery.matches ? "dark" : "light";

      setPreference(nextPreference);
      applyThemePreference(nextPreference, systemColorScheme);
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === themeStorageKey ||
        event.key === legacyThemeStorageKey
      ) {
        syncTheme();
      }
    }

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function selectTheme(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    applyThemePreference(
      nextPreference,
      window.matchMedia(systemThemeQuery).matches ? "dark" : "light",
    );
    window.localStorage.setItem(themeStorageKey, nextPreference);
    window.localStorage.removeItem(legacyThemeStorageKey);
  }

  return (
    <div className={styles["themeselector-root-n8yvyu"]}>
      <span className={styles["themeselector-label-m3zn4e"]}>Theme</span>
      <div
        aria-label="Color theme"
        className={styles["themeselector-group-2qlhrq"]}
        role="radiogroup"
      >
        {themeOptions.map((option) => (
          <ButtonControl
            aria-checked={preference === option.value}
            aria-label={option.label}
            className={styles["themeselector-option-yy1zba"]}
            key={option.value}
            kind="ghost"
            onClick={() => selectTheme(option.value)}
            role="radio"
            size="small"
            title={option.label}
          >
            <span className={styles["themeselector-icon-yjzle1"]}>
              <ThemeOptionIcon preference={option.value} />
            </span>
            <span className={styles["themeselector-optionlabel-devnhd"]}>
              {option.label}
            </span>
          </ButtonControl>
        ))}
      </div>
    </div>
  );
}
