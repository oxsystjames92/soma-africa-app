"use client";
import { useEffect, useState } from "react";

const THEME_KEY = "soma-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"emerald" | "ink">("emerald");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as "emerald" | "ink") || "emerald";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function applyTheme(t: "emerald" | "ink") {
    if (t === "ink") document.documentElement.setAttribute("data-theme", "ink");
    else document.documentElement.removeAttribute("data-theme");
  }

  function switchTheme(t: "emerald" | "ink") {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem(THEME_KEY, t);
  }

  return (
    <div
      className="theme-toggle-wrap"
      role="radiogroup"
      aria-label="Theme"
      style={{
        position: "fixed", bottom: 22, right: 22, zIndex: 90,
        display: "inline-flex", alignItems: "center",
        background: "rgba(13,13,13,0.86)", backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(229,160,25,0.42)", borderRadius: 999,
        padding: 4, boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        fontFamily: "var(--font-manrope, sans-serif)",
        fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
      }}
    >
      {(["emerald", "ink"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => switchTheme(t)}
          style={{
            background: theme === t ? "rgba(229,160,25,0.14)" : "transparent",
            border: 0, color: theme === t ? "var(--mustard)" : "rgba(255,255,255,0.6)",
            padding: "8px 14px", borderRadius: 999,
            transition: "color 180ms, background-color 180ms",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <span
            style={{
              width: 10, height: 10, borderRadius: "50%",
              background: t === "emerald" ? "#073828" : "#0D0D0D",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            }}
          />
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}
