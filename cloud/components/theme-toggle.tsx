"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const CYCLE = ["dark", "light", "system"] as const;
const META = {
  dark: { icon: Moon, hint: "Dark — instrument panel" },
  light: { icon: Sun, hint: "Light — field-notebook paper" },
  system: { icon: Monitor, hint: "System — follow the OS" },
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Theme comes from localStorage — render a stable placeholder until mounted
  // so server and first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = (mounted && (theme as (typeof CYCLE)[number])) || "dark";
  const { icon: Icon, hint } = META[current] ?? META.dark;
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <button
      onClick={() => setTheme(next)}
      title={hint}
      aria-label={`Theme: ${current}. Switch theme.`}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}
