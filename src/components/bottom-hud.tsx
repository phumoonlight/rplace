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
  paletteOpen: boolean
  pendingCount: number
  onPlaceClick: () => void
  onEscape: () => void
}

export const BottomHud = ({
  profile,
  canPaint,
  selectedColor,
  onSelectColor,
  msUntilNextQuota,
  paletteOpen,
  pendingCount,
  onPlaceClick,
  onEscape,
}: BottomHudProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [renderPalette, setRenderPalette] = useState(paletteOpen)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (paletteOpen) {
      setRenderPalette(true)
      setClosing(false)
      return
    }
    if (!renderPalette) return
    setClosing(true)
    const id = window.setTimeout(() => {
      setRenderPalette(false)
      setClosing(false)
    }, 180)
    return () => window.clearTimeout(id)
  }, [paletteOpen, renderPalette])

  useEffect(() => {
    if (!paletteOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, onEscape])

  const quotaLabel = profile
    ? `(${profile.currentQuota.toLocaleString()}/${profile.maxQuota})`
    : canPaint
      ? 'Loading…'
      : 'Sign in to paint'

  const countdownLabel =
    profile && msUntilNextQuota !== null ? `+1 in ${formatMmSs(msUntilNextQuota)}` : null

  const selectedSwatch = selectedColor !== null ? PALETTE[selectedColor] : null

  if (renderPalette) {
    return (
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        ref={rootRef}
      >
        <div
          className={`${closing ? 'animate-palette-panel-out' : 'animate-palette-panel'} pointer-events-auto border-t-2 border-black bg-white px-3 py-3 text-neutral-900 shadow-[0_-4px_0_0_#000] dark:bg-neutral-900 dark:text-neutral-100`}
        >
          <Palette
            disabled={!canPaint}
            size="lg"
            value={selectedColor}
            onChange={onSelectColor}
          />
          <div className="animate-palette-actions mt-3 flex items-center justify-center gap-3">
            <button
              className="flex h-11 w-20 items-center justify-center border-2 border-black bg-neutral-200 text-2xl leading-none text-black shadow-[3px_3px_0_0_#000] hover:bg-neutral-300 dark:bg-white dark:hover:bg-neutral-100"
              type="button"
              onClick={onEscape}
              aria-label="Cancel"
              title="Cancel (Esc)"
            >
              ✕
            </button>
            <div className="flex flex-col items-center text-[11px] text-neutral-700 tabular-nums leading-tight dark:text-neutral-300">
              <span>{quotaLabel}</span>
              <span className="text-neutral-500">
                {pendingCount > 0 ? `${pendingCount} pending` : 'no edits yet'}
                {countdownLabel ? ` · ${countdownLabel}` : ''}
              </span>
            </div>
            <button
              className="flex h-11 w-20 items-center justify-center border-2 border-black bg-emerald-600 text-2xl leading-none text-white shadow-[3px_3px_0_0_#000] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
              type="button"
              onClick={onPlaceClick}
              disabled={!canPaint || pendingCount === 0}
              aria-label="Save"
              title="Save"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center"
      ref={rootRef}
    >
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        <button
          className="flex min-w-50 flex-col items-center justify-center border-2 border-black bg-orange-600 px-6 py-3 text-white shadow-[4px_4px_0_0_#000] transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
          type="button"
          onClick={onPlaceClick}
          disabled={!canPaint}
          aria-expanded={paletteOpen}
        >
          <span className="flex items-center gap-2 text-xl font-semibold font-mono">
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
