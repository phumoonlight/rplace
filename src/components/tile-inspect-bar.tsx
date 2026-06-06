'use client'

import type { Orientation } from '@/lib/canvas/constants'

type TileInspectBarProps = {
  orientation: Orientation
  tile: { x: number; y: number }
  canPaint: boolean
  onShare: () => void
  onPlace: () => void
  onClose: () => void
}

export const TileInspectBar = ({ orientation, tile, onShare, onClose }: TileInspectBarProps) => {
  return (
    <div className="pointer-events-auto flex items-center gap-10 border-2 border-black bg-white p-2 text-neutral-900 shadow-[4px_4px_0_0_#000] dark:bg-neutral-900 dark:text-neutral-100">
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Tile
        </span>
        <span className="font-mono text-sm tabular-nums">
          {tile.x}, {tile.y}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="flex h-7 w-7 items-center justify-center border-2 border-black bg-blue-600 text-white hover:bg-blue-500"
          type="button"
          onClick={onShare}
          aria-label="Share"
          title="Share"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        <button
          className="flex h-7 w-7 font-mono items-center justify-center border-2 border-black bg-neutral-200 text-xs text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          X
        </button>
      </div>
    </div>
  )
}
