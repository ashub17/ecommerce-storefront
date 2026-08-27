"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS: Array<{ value: Theme; label: string; icon: string }> = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "system", label: "System", icon: "◐" },
  { value: "dark", label: "Dark", icon: "☾" },
];

/*
 * The theme lives in localStorage, which is external mutable state rather than
 * React state. useSyncExternalStore is the supported way to read it: it serves
 * the server snapshot during hydration and swaps to the real value afterwards,
 * so there is no mismatch and no setState-in-effect.
 */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keeps other tabs in sync.
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    return "system";
  }
}

/** The server cannot know a visitor's choice, so it always assumes system. */
function getServerSnapshot(): Theme {
  return "system";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }

  try {
    if (theme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", theme);
    }
  } catch {
    // Storage can be blocked; the theme still applies for this page view.
  }

  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="border-border inline-flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => applyTheme(option.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
              active
                ? "bg-primary text-primary-fg"
                : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
            )}
          >
            <span aria-hidden="true">{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
