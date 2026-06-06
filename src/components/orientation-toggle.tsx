"use client";

import { ORIENTATIONS, type Orientation } from "@/lib/canvas/constants";

type OrientationToggleProps = {
  value: Orientation;
  onChange: (next: Orientation) => void;
};

const LABELS: Record<Orientation, string> = {
  landscape: "Landscape",
  portrait: "Portrait",
};

export const OrientationToggle = ({ value, onChange }: OrientationToggleProps) => {
  return (
    <div className="inline-flex rounded-md border border-neutral-800 bg-neutral-900 p-0.5 text-xs">
      {ORIENTATIONS.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            className={
              "rounded px-3 py-1 transition-colors " +
              (active
                ? "bg-neutral-700 text-neutral-50"
                : "text-neutral-400 hover:text-neutral-200")
            }
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o)}
          >
            {LABELS[o]}
          </button>
        );
      })}
    </div>
  );
};
