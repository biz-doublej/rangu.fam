'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Calculator,
  Clock,
  Hash,
  Search,
  Sparkles
} from 'lucide-react'

/* ────────────────────────────────────────────────────────────
 * Document analysis functions ("문서 함수").
 *
 * Pulled out of the article page so the page itself stays focused on
 * loading/rendering. Each function reads the article context and
 * returns a small summary plus optional metrics or matches.
 *
 * Adding a new function = append to FUNCTION_DEFINITIONS below.
 * Each function declares whether it needs user input; the panel
 * handles the form, copy-to-clipboard, and result display.
 * ────────────────────────────────────────────────────────────*/

export type DocumentHeading = {
  title: string
  anchor: string
  level: number
}

export type DocumentFunctionContext = {
  rawContent: string
  plainText: string
  headings: DocumentHeading[]
  wordCount: number
  title: string
}

export type DocumentFunctionResult = {
  summary: string
  metrics?: Array<{ label: string; value: string }>
  matches?: Array<{ label: string; anchor?: string }>
}

export type DocumentFunctionDefinition = {
  id: string
  label: string
  description: string
  placeholder?: string
  requiresInput?: boolean
  icon: React.ComponentType<{ className?: string }>
  run: (context: DocumentFunctionContext, input?: string) => DocumentFunctionResult
}

/** Strip wiki/markup so that word/character counts are reasonable. */
export function sanitizeWikiText(value: string) {
  if (!value) return ''
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/\[\[[^\]]+\]\]/g, ' ')
    .replace(/==+[^=]+==+/g, ' ')
    .replace(/'''|''/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const FUNCTION_DEFINITIONS: DocumentFunctionDefinition[] = [
  {
    id: 'word-count',
    label: '분량 요약',
    description: '단어, 문자, 문단 수를 한눈에 확인합니다.',
    icon: Calculator,
    run: (ctx) => {
      const charCount = ctx.plainText.replace(/\s+/g, '').length
      const paragraphCount = ctx.rawContent.split(/\n{2,}/).filter(Boolean).length || 1
      return {
        summary: `${ctx.wordCount.toLocaleString()}개의 단어, ${charCount.toLocaleString()}개의 문자로 이루어져 있습니다.`,
        metrics: [
          { label: '단어 수', value: ctx.wordCount.toLocaleString() },
          { label: '문단 수', value: paragraphCount.toLocaleString() },
          { label: '본문 길이', value: `${ctx.rawContent.length.toLocaleString()} chars` }
        ]
      }
    }
  },
  {
    id: 'reading-time',
    label: '예상 읽기 시간',
    description: '분당 320단어 기준 추정치입니다.',
    icon: Clock,
    run: (ctx) => {
      const wordsPerMinute = 320
      const minutes = ctx.wordCount / wordsPerMinute
      const minutePart = Math.floor(minutes)
      const seconds = Math.round((minutes - minutePart) * 60)
      const display =
        minutePart > 0
          ? `${minutePart}분 ${seconds.toString().padStart(2, '0')}초`
          : `${Math.max(seconds, 15)}초 내외`
      return {
        summary: `${display} 정도면 이 문서를 모두 읽을 수 있습니다.`,
        metrics: [
          { label: '단어 수', value: ctx.wordCount.toLocaleString() },
          { label: '기준 속도', value: `${wordsPerMinute.toLocaleString()} wpm` },
          { label: '읽기 시간', value: minutePart > 0 ? `${minutePart}분 ${seconds}초` : `${seconds}초` }
        ]
      }
    }
  },
  {
    id: 'keyword-density',
    label: '키워드 밀도',
    description: '키워드가 본문에서 얼마나 자주 등장하는지 분석합니다.',
    icon: BarChart3,
    requiresInput: true,
    placeholder: '키워드 (예: 역사)',
    run: (ctx, keyword = '') => {
      const term = keyword.trim()
      if (!term) return { summary: '키워드를 입력해 주세요.' }
      const regex = new RegExp(escapeRegExp(term), 'gi')
      const count = ctx.plainText.match(regex)?.length || 0
      const density = ctx.wordCount ? ((count / ctx.wordCount) * 100).toFixed(2) : '0'
      return {
        summary: `"${term}" 키워드는 ${count.toLocaleString()}회 등장하며 전체 단어 중 ${density}%를 차지합니다.`,
        metrics: [
          { label: '등장 횟수', value: `${count.toLocaleString()}회` },
          { label: '밀도', value: `${density}%` },
          { label: '전체 단어', value: ctx.wordCount.toLocaleString() }
        ]
      }
    }
  },
  {
    id: 'section-finder',
    label: '섹션 찾기',
    description: '목차 제목을 검색하고 바로 이동합니다.',
    icon: Search,
    requiresInput: true,
    placeholder: '섹션 키워드',
    run: (ctx, keyword = '') => {
      const term = keyword.trim().toLowerCase()
      if (!term) return { summary: '검색할 섹션 키워드를 입력하세요.' }
      const matches = ctx.headings.filter(h => (h.title || '').toLowerCase().includes(term))
      if (matches.length === 0) {
        return { summary: `"${keyword}"에 해당하는 섹션을 찾을 수 없습니다.` }
      }
      return {
        summary: `${matches.length}개의 섹션이 검색되었습니다.`,
        matches: matches.slice(0, 8).map(m => ({ label: m.title, anchor: m.anchor }))
      }
    }
  },
  {
    id: 'link-audit',
    label: '링크 점검',
    description: '내부 링크([[…]])와 외부 링크 개수를 점검합니다.',
    icon: Hash,
    run: (ctx) => {
      const internal = ctx.rawContent.match(/\[\[([^\]]+)\]\]/g)?.length || 0
      const external = ctx.rawContent.match(/https?:\/\/[\w./?#%&=+-]+/g)?.length || 0
      const refs = ctx.rawContent.match(/\[\*[^\]]*\]/g)?.length || 0
      return {
        summary: `이 문서에는 내부 링크 ${internal.toLocaleString()}개, 외부 링크 ${external.toLocaleString()}개, 각주 ${refs.toLocaleString()}개가 포함되어 있습니다.`,
        metrics: [
          { label: '내부 링크', value: internal.toLocaleString() },
          { label: '외부 링크', value: external.toLocaleString() },
          { label: '각주', value: refs.toLocaleString() }
        ]
      }
    }
  }
]

interface DocumentFunctionsPanelProps {
  content: string
  title: string
  tableOfContents?: Array<{ [key: string]: any }>
  /** When true, renders an anchor `id` so a "맨 아래로" jump can target it. */
  withAnchor?: boolean
}

export function DocumentFunctionsPanel({
  content,
  title,
  tableOfContents,
  withAnchor = true
}: DocumentFunctionsPanelProps) {
  const headings = useMemo<DocumentHeading[]>(() => {
    if (!Array.isArray(tableOfContents)) return []
    return tableOfContents.map((item: any) => ({
      title: item?.title || item?.text || '제목 없음',
      anchor: (item?.anchor || item?.slug || item?.id || '').toString().replace(/^#/, ''),
      level: item?.level || item?.depth || 1
    }))
  }, [tableOfContents])

  const plainText = useMemo(() => sanitizeWikiText(content), [content])
  const wordCount = useMemo(
    () => (plainText ? plainText.split(/\s+/).filter(Boolean).length : 0),
    [plainText]
  )

  const context = useMemo<DocumentFunctionContext>(
    () => ({ rawContent: content, plainText, headings, wordCount, title }),
    [content, plainText, headings, wordCount, title]
  )

  const [selectedId, setSelectedId] = useState<string>(FUNCTION_DEFINITIONS[0].id)
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<DocumentFunctionResult | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const selected = useMemo(
    () => FUNCTION_DEFINITIONS.find(f => f.id === selectedId) || FUNCTION_DEFINITIONS[0],
    [selectedId]
  )

  // Auto-run for input-less functions whenever the function or content changes.
  useEffect(() => {
    if (!selected.requiresInput) {
      try {
        setResult(selected.run(context))
      } catch (err) {
        setResult({
          summary: err instanceof Error ? err.message : '함수 실행 중 오류가 발생했습니다.'
        })
      }
    } else {
      setResult(null)
    }
  }, [selected, context])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 2000)
    return () => clearTimeout(t)
  }, [feedback])

  const handleRun = (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = inputValue.trim()
    if (selected.requiresInput && !value) {
      setResult({ summary: '필요한 값을 입력해 주세요.' })
      return
    }
    try {
      setResult(selected.run(context, value))
    } catch (err) {
      setResult({
        summary: err instanceof Error ? err.message : '함수 실행 중 오류가 발생했습니다.'
      })
    }
  }

  const handleCopy = async () => {
    if (!result) return
    const lines = [result.summary]
    if (result.metrics) lines.push(...result.metrics.map(m => `${m.label}: ${m.value}`))
    if (result.matches) {
      lines.push('섹션 목록:')
      lines.push(...result.matches.map(m => `- ${m.label}`))
    }
    try {
      await navigator.clipboard?.writeText(lines.join('\n'))
      setFeedback('결과를 복사했습니다.')
    } catch {
      setFeedback('클립보드 복사에 실패했습니다.')
    }
  }

  const handleMatchClick = (anchor?: string) => {
    if (!anchor) return
    const target = document.getElementById(anchor) || document.querySelector(`[id='${anchor}']`)
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section
      id={withAnchor ? 'document-function-panel' : undefined}
      aria-label="문서 함수 패널"
      className="wiki-panel scroll-mt-24"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[color:var(--wiki-warning)]" />
          <h4 className="wiki-serif text-base font-semibold">문서 함수</h4>
        </div>
        {result && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-[color:var(--wiki-link)] hover:text-[color:var(--wiki-link-hover)] hover:underline"
          >
            결과 복사
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">
        {selected.description}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1">
        {FUNCTION_DEFINITIONS.map(fn => (
          <button
            type="button"
            key={fn.id}
            onClick={() => setSelectedId(fn.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-left text-xs rounded-sm border transition-colors ${
              selectedId === fn.id
                ? 'bg-[color:var(--wiki-accent-soft)] border-[color:var(--wiki-accent)] text-[color:var(--wiki-accent)] font-semibold'
                : 'bg-[color:var(--wiki-bg-2)] border-[color:var(--wiki-rule)] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-link)]'
            }`}
          >
            <fn.icon className="w-3.5 h-3.5" />
            <span className="truncate">{fn.label}</span>
          </button>
        ))}
      </div>

      {selected.requiresInput && (
        <form onSubmit={handleRun} className="mt-3 flex flex-col gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={selected.placeholder || '값을 입력하세요.'}
            className="w-full rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1.5 text-sm text-[color:var(--wiki-ink)] placeholder:text-[color:var(--wiki-ink-muted)] focus:outline-none focus:border-[color:var(--wiki-accent)]"
          />
          <button
            type="submit"
            className="self-start rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            함수 실행
          </button>
        </form>
      )}

      <div className="mt-3 wiki-panel--inset px-3 py-2 text-sm text-[color:var(--wiki-ink-soft)]">
        {result ? (
          <>
            <p className="leading-relaxed">{result.summary}</p>
            {result.metrics && (
              <ul className="mt-2 grid grid-cols-1 gap-1 text-xs">
                {result.metrics.map(m => (
                  <li
                    key={m.label}
                    className="flex items-center justify-between rounded-sm bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule)] px-2 py-1"
                  >
                    <span className="text-[color:var(--wiki-ink-muted)]">{m.label}</span>
                    <span className="font-semibold text-[color:var(--wiki-ink)]">{m.value}</span>
                  </li>
                ))}
              </ul>
            )}
            {result.matches && result.matches.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.matches.map(m => (
                  <li key={m.label}>
                    <button
                      type="button"
                      onClick={() => handleMatchClick(m.anchor)}
                      className="flex w-full items-center justify-between rounded-sm border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] px-2 py-1 text-left text-xs text-[color:var(--wiki-link)] hover:underline"
                    >
                      <span>{m.label}</span>
                      <Search className="w-3 h-3 text-[color:var(--wiki-ink-muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-[color:var(--wiki-ink-muted)] text-xs">실행할 함수를 선택해 주세요.</p>
        )}
      </div>

      {feedback && (
        <p className="mt-2 text-xs text-[color:var(--wiki-success)]">{feedback}</p>
      )}
    </section>
  )
}
