'use client'

import { useEffect } from 'react'

type HelpModalProps = {
  open: boolean
  onClose: () => void
}

export const HelpModal = ({ open, onClose }: HelpModalProps) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
    >
      <div
        className="w-full max-w-md border-2 border-black bg-neutral-900 p-5 text-neutral-100 shadow-[6px_6px_0_0_#000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">How to play</h2>
          <button
            className="flex h-7 w-7 items-center justify-center border-2 border-black bg-neutral-800 hover:bg-neutral-700"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <line x1="6" x2="18" y1="6" y2="18" />
              <line x1="6" x2="18" y1="18" y2="6" />
            </svg>
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-neutral-300">
          <li>
            <strong className="text-white">Drag</strong> to pan,{' '}
            <strong className="text-white">scroll</strong> to zoom.
          </li>
          <li>
            Hit <strong className="text-white">Place a tile</strong> to open the palette, pick a
            color, then click the canvas.
          </li>
          <li>
            Shortcuts: <kbd className="border border-black bg-neutral-800 px-1">1</kbd>–
            <kbd className="border border-black bg-neutral-800 px-1">9</kbd>{' '}
            <kbd className="border border-black bg-neutral-800 px-1">0</kbd>{' '}
            <kbd className="border border-black bg-neutral-800 px-1">q</kbd>–
            <kbd className="border border-black bg-neutral-800 px-1">y</kbd> select colors,{' '}
            <kbd className="border border-black bg-neutral-800 px-1">Esc</kbd> deselects.
          </li>
          <li>
            You restore <strong className="text-white">+1 quota / minute</strong>. Level up to raise
            your max quota.
          </li>
        </ul>
        <div className="mt-4 border-t border-neutral-700 pt-3 text-xs text-neutral-400">
          Hobby project, made by{' '}
          <a
            className="text-white underline hover:text-neutral-300"
            href="https://github.com/phumoonlight"
            target="_blank"
            rel="noreferrer noopener"
          >
            phumoonlight
          </a>{' '}
          and <span className="text-white">Claude</span>.
        </div>
      </div>
    </div>
  )
}
