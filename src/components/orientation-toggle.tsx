"use client";

import type { Orientation } from "@/lib/canvas/constants";

type OrientationToggleProps = {
  value: Orientation;
  onChange: (next: Orientation) => void;
};

export const OrientationToggle = ({ value, onChange }: OrientationToggleProps) => {
  const next: Orientation = value === "landscape" ? "portrait" : "landscape";
  const isLandscape = value === "landscape";
  const label = `Switch to ${next}`;

  return (
    <button
      className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-neutral-900 shadow-[3px_3px_0_0_#000] hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      type="button"
      onClick={() => onChange(next)}
      aria-label={label}
      title={label}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="18"
      >
        {isLandscape ? (
          <rect x="3" y="7" width="18" height="10" rx="1" />
        ) : (
          <rect x="7" y="3" width="10" height="18" rx="1" />
        )}
      </svg>
    </button>
  );
};
