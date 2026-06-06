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
    <div className="inline-flex border-2 border-black bg-white p-0.5 text-xs shadow-[3px_3px_0_0_#000] dark:bg-neutral-900">
      {ORIENTATIONS.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            className={
              "px-3 py-1 transition-colors " +
              (active
                ? "bg-neutral-300 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200")
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
