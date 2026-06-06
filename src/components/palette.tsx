"use client";

import { useEffect } from "react";
import { PALETTE } from "@/lib/canvas/constants";

export type PaletteProps = {
  value: number | null;
  onChange: (index: number | null) => void;
  disabled?: boolean;
};

const SHORTCUT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y"] as const;

export const Palette = ({ value, onChange, disabled = false }: PaletteProps) => {
  useEffect(() => {
    if (disabled) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "Escape") {
        if (value !== null) onChange(null);
        return;
      }
      const idx = SHORTCUT_KEYS.indexOf(e.key.toLowerCase() as (typeof SHORTCUT_KEYS)[number]);
      if (idx >= 0 && idx < PALETTE.length) {
        e.preventDefault();
        onChange(idx);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [disabled, value, onChange]);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5 bg-neutral-950 p-2"
      role="toolbar"
      aria-label="Color palette"
    >
      {PALETTE.map((color, index) => {
        const selected = value === index;
        const shortcut = SHORTCUT_KEYS[index];
        return (
          <button
            className={[
              "h-7 w-7 border-2 transition-transform",
              selected ? "scale-110 border-white" : "border-black hover:border-neutral-400",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
            style={{ backgroundColor: color.hex }}
            type="button"
            key={color.name}
            onClick={() => onChange(selected ? null : index)}
            disabled={disabled}
            aria-pressed={selected}
            aria-label={`${color.name}${shortcut ? ` (${shortcut})` : ""}`}
            title={`${color.name}${shortcut ? ` · ${shortcut}` : ""}`}
          />
        );
      })}
    </div>
  );
};
