'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const VIEW_SIZE = 280
const OUTPUT_SIZE = 512

interface AvatarEditorProps {
  file: File
  saving: boolean
  onCancel: () => void
  onSave: (blob: Blob) => void
}

/** 원형 미리보기에서 사진 위치와 크기를 맞춘 뒤 정사각 이미지로 잘라 넘긴다. */
export function AvatarEditor({ file, saving, onCancel, onSave }: AvatarEditorProps) {
  const [source, setSource] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => setSource(image)
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = source ? Math.max(VIEW_SIZE / source.width, VIEW_SIZE / source.height) : 1
  const scale = baseScale * zoom
  const width = (source?.width || 0) * scale
  const height = (source?.height || 0) * scale

  const clamp = (next: { x: number; y: number }, w = width, h = height) => ({
    x: Math.min(Math.max(next.x, -(w - VIEW_SIZE) / 2), (w - VIEW_SIZE) / 2),
    y: Math.min(Math.max(next.y, -(h - VIEW_SIZE) / 2), (h - VIEW_SIZE) / 2),
  })

  const handleZoom = (value: number) => {
    setZoom(value)
    if (source) {
      const nextScale = baseScale * value
      setOffset((current) => clamp(current, source.width * nextScale, source.height * nextScale))
    }
  }

  const handleSave = () => {
    if (!source) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const context = canvas.getContext('2d')
    if (!context) return
    const ratio = OUTPUT_SIZE / VIEW_SIZE
    context.drawImage(
      source,
      ((VIEW_SIZE - width) / 2 + offset.x) * ratio,
      ((VIEW_SIZE - height) / 2 + offset.y) * ratio,
      width * ratio,
      height * ratio
    )
    canvas.toBlob((blob) => blob && onSave(blob), 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" role="dialog" aria-modal="true" aria-label="프로필 사진 편집">
      <div className="w-full max-w-sm rounded-2xl bg-paper-50 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-500">사진 위치 맞추기</h2>
          <button type="button" onClick={onCancel} className="rounded-md p-1 text-ink-300 hover:bg-ink-500/5" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="relative mx-auto touch-none cursor-grab overflow-hidden rounded-full bg-ink-500/10 active:cursor-grabbing"
          style={{ width: VIEW_SIZE, height: VIEW_SIZE, maxWidth: '100%' }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y }
          }}
          onPointerMove={(event) => {
            if (!drag.current) return
            setOffset(
              clamp({
                x: drag.current.startX + event.clientX - drag.current.x,
                y: drag.current.startY + event.clientY - drag.current.y,
              })
            )
          }}
          onPointerUp={() => {
            drag.current = null
          }}
        >
          {source && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source.src}
              alt="선택한 사진 미리보기"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width,
                height,
                left: (VIEW_SIZE - width) / 2 + offset.x,
                top: (VIEW_SIZE - height) / 2 + offset.y,
              }}
            />
          )}
        </div>

        <label className="mt-5 block text-xs font-medium text-ink-300">
          확대
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => handleZoom(Number(event.target.value))}
            className="mt-2 w-full accent-coral-500"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-400 hover:bg-ink-500/5">
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!source || saving}
            className="rounded-lg bg-ink-500 px-4 py-2 text-sm font-bold text-paper-50 hover:bg-ink-600 disabled:opacity-50"
          >
            {saving ? '저장 중' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
