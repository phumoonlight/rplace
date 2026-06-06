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
    <div className="pointer-events-auto flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-neutral-900 shadow-[4px_4px_0_0_#000] dark:bg-neutral-900 dark:text-neutral-100">
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Tile</span>
        <span className="font-mono text-sm tabular-nums">
          {orientation} · {tile.x}, {tile.y}
        </span>
      </div>
      <button
        className="border-2 border-black bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[2px_2px_0_0_#000] hover:bg-blue-500"
        type="button"
        onClick={onShare}
      >
        Share
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
  )
}
