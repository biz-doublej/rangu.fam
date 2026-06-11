'use client'

import React from 'react'

export interface TimelineEntry {
  date: string
  title: string
  body?: string
}

/**
 * 문서 내 세로형 타임라인.
 *
 * 위키 문법:
 *   :::timeline
 *   2024-03-20 | 랑구 그룹 결성 | 태릉고 동창들이 모였다
 *   2024-05 | 첫 정기 모임
 *   :::
 *
 * 각 줄: `날짜 | 제목 | 설명(선택)`  (구분자는 `|` 또는 `::`)
 */
export function parseTimeline(raw: string): TimelineEntry[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*\|\s*|\s*::\s*/)
      const date = (parts[0] || '').trim()
      const title = (parts[1] || '').trim()
      const body = parts.slice(2).join(' ').trim()
      // 제목 없이 한 칸만 있으면 그걸 제목으로
      if (!title && date) return { date: '', title: date, body: body || undefined }
      return { date, title, body: body || undefined }
    })
    .filter((e) => e.title || e.date)
}

export function WikiTimeline({
  entries,
  parseInline,
}: {
  entries: TimelineEntry[]
  parseInline?: (text: string) => React.ReactNode
}) {
  if (entries.length === 0) return null
  const render = (t: string) => (parseInline ? parseInline(t) : t)

  return (
    <div className="my-5">
      <ol className="relative ml-3 border-l-2 border-[color:var(--wiki-accent,#4472C4)]/40">
        {entries.map((entry, idx) => (
          <li key={idx} className="relative mb-5 ml-5 last:mb-0">
            {/* 노드 점 */}
            <span
              className="absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-gray-900"
              style={{ backgroundColor: 'var(--wiki-accent, #4472C4)' }}
            />
            {entry.date && (
              <time className="mb-0.5 block font-mono text-[11px] font-semibold uppercase tracking-wide text-[color:var(--wiki-accent,#6ea8fe)]">
                {entry.date}
              </time>
            )}
            <h4 className="text-sm font-semibold text-gray-100">{render(entry.title)}</h4>
            {entry.body && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-gray-300 whitespace-pre-line">
                {render(entry.body)}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
