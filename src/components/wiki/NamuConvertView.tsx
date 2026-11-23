'use client'

import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle } from 'lucide-react'
import { lineDiff } from '@/lib/wiki/lineDiff'
import { useTemplateExpansion } from '@/hooks/useTemplateExpansion'
import type { NamuConversion } from '@/hooks/useNamuConversion'

const NamuWikiRenderer = dynamic(() => import('@/components/ui/NamuWikiRenderer'), {
  ssr: false,
  loading: () => <p className="text-xs text-[color:var(--wiki-ink-muted)]">미리보기를 불러오는 중…</p>,
})

type View = 'diff' | 'result' | 'preview'

const VIEWS: Array<{ key: View; label: string }> = [
  { key: 'diff', label: '바뀐 줄' },
  { key: 'result', label: '변환 결과' },
  { key: 'preview', label: '미리보기' },
]

/**
 * 나무위키 → 이랑위키 변환 전후 비교 — 바뀐 줄(빨강 지움 / 초록 새로), 변환 결과 원문, 그려 본 모습, 경고 목록.
 * 붙여넣기 대화상자와 관리 화면 가져오기가 같이 쓴다.
 */
export function NamuConvertView({ source, conversion }: { source: string; conversion: NamuConversion }) {
  const [view, setView] = useState<View>('diff')
  const rows = useMemo(() => (conversion.loading && !conversion.text ? [] : lineDiff(source, conversion.text)), [source, conversion])
  const changed = rows ? rows.filter((row) => row.kind !== 'same').length : 0
  const previewContent = useTemplateExpansion(view === 'preview' ? conversion.text : '')

  return (
    <div className="namu-convert" data-section="wiki">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="비교 방식">
        {VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={view === item.key}
            onClick={() => setView(item.key)}
            className={`rounded-sm border px-2 py-1 text-xs ${
              view === item.key
                ? 'border-[color:var(--wiki-accent)] text-[color:var(--wiki-accent)] font-semibold'
                : 'border-[color:var(--wiki-rule)] text-[color:var(--wiki-ink-soft)]'
            }`}
          >
            {item.label}
            {item.key === 'diff' && rows ? ` (${changed})` : ''}
          </button>
        ))}
        {conversion.loading && <span className="ml-2 text-xs text-[color:var(--wiki-ink-muted)]">바꾸는 중…</span>}
      </div>

      <div className="namu-convert__body mt-2">
        {view === 'diff' &&
          (rows === null ? (
            <p className="p-2 text-xs text-[color:var(--wiki-ink-muted)]">글이 너무 길어 줄 비교를 생략했습니다. &lsquo;변환 결과&rsquo;를 보세요.</p>
          ) : changed === 0 && !conversion.loading ? (
            <p className="p-2 text-xs text-[color:var(--wiki-ink-muted)]">바꿀 것이 없습니다. 이미 이랑위키 문법입니다.</p>
          ) : (
            <pre className="namu-convert__diff">
              {rows.map((row, index) => (
                <div key={index} className={`namu-convert__line namu-convert__line--${row.kind}`}>
                  <span aria-hidden="true">{row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}</span>
                  <span className="sr-only">{row.kind === 'added' ? '새 줄: ' : row.kind === 'removed' ? '지운 줄: ' : ''}</span>
                  {row.text || ' '}
                </div>
              ))}
            </pre>
          ))}
        {view === 'result' && <pre className="namu-convert__diff">{conversion.text}</pre>}
        {view === 'preview' && (
          <div className="namu-convert__preview wiki-content">
            <NamuWikiRenderer content={previewContent} isPreview />
          </div>
        )}
      </div>

      {conversion.warnings.length > 0 && (
        <div className="mt-3">
          <h3 className="flex items-center gap-1 text-xs font-semibold text-[color:var(--wiki-warning,#b45309)]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            확인할 것 {conversion.warnings.length}개
          </h3>
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs text-[color:var(--wiki-ink-soft)]">
            {conversion.warnings.map((warning, index) => (
              <li key={index}>
                <span className="mr-1 text-[color:var(--wiki-ink-muted)]">
                  {warning.line}번째 줄 · {warning.kind === 'unsupported' ? '못 바꿈' : '일부만 바꿈'}
                </span>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
