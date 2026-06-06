'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Orientation } from '@/lib/canvas/constants'

type TileInfoCardProps = {
  orientation: Orientation
  tile: { x: number; y: number }
  snapshot: string | null
  onClose: () => void
}

const buildShareUrl = (orientation: Orientation, x: number, y: number) => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.searchParams.set('o', orientation)
  url.searchParams.set('x', String(x))
  url.searchParams.set('y', String(y))
  url.hash = ''
  return url.toString()
}

const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text)
}

const copyImage = async (dataUrl: string) => {
  const blob = await (await fetch(dataUrl)).blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}

type CopyState = 'idle' | 'ok' | 'err'

export const TileInfoCard = ({ orientation, tile, snapshot, onClose }: TileInfoCardProps) => {
  const shareUrl = useMemo(
    () => buildShareUrl(orientation, tile.x, tile.y),
    [orientation, tile.x, tile.y],
  )
  const [linkState, setLinkState] = useState<CopyState>('idle')
  const [imgState, setImgState] = useState<CopyState>('idle')

  useEffect(() => {
    setLinkState('idle')
    setImgState('idle')
  }, [tile.x, tile.y, orientation])

  useEffect(() => {
    if (linkState === 'idle') return
    const id = window.setTimeout(() => setLinkState('idle'), 1500)
    return () => window.clearTimeout(id)
  }, [linkState])

  useEffect(() => {
    if (imgState === 'idle') return
    const id = window.setTimeout(() => setImgState('idle'), 1500)
    return () => window.clearTimeout(id)
  }, [imgState])

  const handleCopyLink = async () => {
    try {
      await copyText(shareUrl)
      setLinkState('ok')
    } catch {
      setLinkState('err')
    }
  }

  const handleCopyImage = async () => {
    if (!snapshot) return
    try {
      await copyImage(snapshot)
      setImgState('ok')
    } catch {
      setImgState('err')
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,420px)] border-2 border-black bg-neutral-900 text-neutral-100 shadow-[4px_4px_0_0_#000]"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center justify-between border-b-2 border-black bg-neutral-800 px-3 py-2">
        <span className="text-sm font-semibold">Share tile</span>
        <button
          className="flex h-6 w-6 items-center justify-center border-2 border-black bg-neutral-900 text-xs leading-none text-neutral-200 hover:bg-neutral-700"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 p-3">
        <div className="text-xs text-neutral-400">
          Coordinates:{' '}
          <span className="font-mono tabular-nums text-neutral-100">
            {orientation} · {tile.x}, {tile.y}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border-2 border-black bg-neutral-950 px-2 py-1.5 font-mono text-[11px] text-neutral-200 outline-none"
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            className="border-2 border-black bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[2px_2px_0_0_#000] hover:bg-blue-500"
            type="button"
            onClick={handleCopyLink}
          >
            {linkState === 'ok' ? 'Copied' : linkState === 'err' ? 'Failed' : 'Copy'}
          </button>
        </div>

        {snapshot && (
          <div className="space-y-2">
            <div className="text-xs text-neutral-400">Image</div>
            <div className="border-2 border-black bg-neutral-950 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="block w-full"
                style={{ imageRendering: 'pixelated' }}
                src={snapshot}
                alt={`Tile ${tile.x},${tile.y} preview`}
              />
            </div>
            <div className="flex justify-end">
              <button
                className="border-2 border-black bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[2px_2px_0_0_#000] hover:bg-blue-500"
                type="button"
                onClick={handleCopyImage}
              >
                {imgState === 'ok' ? 'Copied' : imgState === 'err' ? 'Failed' : 'Copy image'}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
