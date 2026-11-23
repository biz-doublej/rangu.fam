'use client'

import React, { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Wand2, X } from 'lucide-react'
import { detectNamuMarkup } from '@/lib/wiki/convert/detect'
import { useNamuConversion } from '@/hooks/useNamuConversion'
import { NamuConvertView } from './NamuConvertView'

/**
 * 나무위키 문법을 붙여 넣었을 때(또는 편집기 메뉴에서 '나무위키 문법 변환'을 골랐을 때) 뜨는 비교 창.
 * 변환해서 넣기 / 원문 그대로 / 취소.
 */
export function NamuConvertDialog({
  source,
  title = '나무위키 문법으로 보입니다',
  applyLabel = '변환해서 넣기',
  originalLabel = '원문 그대로 넣기',
  onApply,
  onUseOriginal,
  onCancel,
}: {
  source: string
  title?: string
  applyLabel?: string
  originalLabel?: string
  onApply: (converted: string) => void
  onUseOriginal?: () => void
  onCancel: () => void
}) {
  const conversion = useNamuConversion(source)
  const markers = useMemo(() => detectNamuMarkup(source).markers, [source])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="namu-convert-dialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="namu-convert-title"
        className="namu-convert-dialog__panel"
        data-section="wiki"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="namu-convert-title" className="flex items-center gap-1.5 text-base font-semibold text-[color:var(--wiki-ink)]">
              <Wand2 className="h-4 w-4 text-[color:var(--wiki-accent)]" aria-hidden="true" />
              {title}
            </h2>
            {markers.length > 0 && (
              <p className="mt-0.5 text-xs text-[color:var(--wiki-ink-muted)]">
                찾은 표지: {markers.map((marker) => marker.label).join(', ')}
              </p>
            )}
          </div>
          <button type="button" onClick={onCancel} aria-label="닫기" className="text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3">
          <NamuConvertView source={source} conversion={conversion} />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} className="namu-convert-dialog__btn">
            취소
          </button>
          {onUseOriginal && (
            <button type="button" onClick={onUseOriginal} className="namu-convert-dialog__btn">
              {originalLabel}
            </button>
          )}
          <button
            type="button"
            autoFocus
            disabled={conversion.loading && !conversion.text}
            onClick={() => onApply(conversion.text)}
            className="namu-convert-dialog__btn namu-convert-dialog__btn--primary"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
