'use client'

import { useEffect, useRef, useState } from 'react'
import { Palette } from '@/components/palette'
import { formatMmSs } from '@/lib/user/use-quota-countdown'
import { PALETTE } from '@/lib/canvas/constants'
import type { UserProfile } from '@/lib/user/user-profile'

type BottomHudProps = {
  profile: UserProfile | null
  canPaint: boolean
  selectedColor: number | null
  onSelectColor: (index: number | null) => void
  msUntilNextQuota: number | null
}

export const BottomHud = ({
  profile,
  canPaint,
  selectedColor,
  onSelectColor,
  msUntilNextQuota,
}: BottomHudProps) => {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!paletteOpen) return
    const onDocPointer = (e: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setPaletteOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [paletteOpen])

  const quotaLabel = profile
    ? `(${profile.currentQuota.toLocaleString()}/${profile.maxQuota})`
    : canPaint
      ? 'Loading…'
      : 'Sign in to paint'

  const countdownLabel =
    profile && msUntilNextQuota !== null ? `+1 in ${formatMmSs(msUntilNextQuota)}` : null

  const selectedSwatch = selectedColor !== null ? PALETTE[selectedColor] : null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center"
      ref={rootRef}
    >
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {paletteOpen && (
          <div className="border-2 border-black bg-neutral-900 p-2 shadow-[4px_4px_0_0_#000]">
            <Palette
              disabled={!canPaint}
              value={selectedColor}
              onChange={(idx) => {
                onSelectColor(idx)
                if (idx !== null) setPaletteOpen(false)
              }}
            />
          </div>
        )}

        <button
          className="flex min-w-50 flex-col items-center justify-center border-2 border-black bg-orange-600 px-6 py-3 text-white shadow-[4px_4px_0_0_#000] transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          type="button"
          onClick={() => setPaletteOpen((p) => !p)}
          disabled={!canPaint}
          aria-expanded={paletteOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            {selectedSwatch && (
              <span
                className="h-3 w-3 rounded-sm border border-white/40"
                style={{ backgroundColor: selectedSwatch.hex }}
              />
            )}
            Place
          </span>
          <span className="text-xs opacity-90 tabular-nums">
            {quotaLabel}
            {countdownLabel ? ` · ${countdownLabel}` : ''}
          </span>
        </button>
      </div>
    </div>
  )
}
