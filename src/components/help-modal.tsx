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
        className="w-full max-w-md border-2 border-black bg-white p-5 text-neutral-900 shadow-[6px_6px_0_0_#000] dark:bg-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">How to play</h2>
          <button
            className="flex h-7 w-7 items-center justify-center border-2 border-black bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
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
        <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          <li>
            <strong className="text-neutral-900 dark:text-white">Drag</strong> to pan,{' '}
            <strong className="text-neutral-900 dark:text-white">scroll</strong> to zoom.
          </li>
          <li>
            Hit <strong className="text-neutral-900 dark:text-white">Place a tile</strong> to open the palette, pick a
            color, then click the canvas.
          </li>
          <li>
            Shortcuts: <kbd className="border border-black bg-neutral-200 px-1 dark:bg-neutral-800">1</kbd>–
            <kbd className="border border-black bg-neutral-200 px-1 dark:bg-neutral-800">9</kbd>{' '}
            <kbd className="border border-black bg-neutral-200 px-1 dark:bg-neutral-800">0</kbd>{' '}
            <kbd className="border border-black bg-neutral-200 px-1 dark:bg-neutral-800">q</kbd>–
            <kbd className="border border-black bg-neutral-200 px-1 dark:bg-neutral-800">y</kbd> select colors,{' '}
            <kbd className="border border-black bg-neutral-200 px-1 dark:bg-neutral-800">Esc</kbd> deselects.
          </li>
          <li>
            You restore <strong className="text-neutral-900 dark:text-white">+1 quota / minute</strong>. Level up to raise
            your max quota.
          </li>
        </ul>
        <div className="mt-4 border-t border-neutral-300 pt-3 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          Hobby project, made by{' '}
          <a
            className="text-neutral-900 underline hover:text-neutral-600 dark:text-white dark:hover:text-neutral-300"
            href="https://github.com/phumoonlight"
            target="_blank"
            rel="noreferrer noopener"
          >
            phumoonlight
          </a>{' '}
          and <span className="text-neutral-900 dark:text-white">Claude</span>.
        </div>
      </div>
    </div>
  )
}
