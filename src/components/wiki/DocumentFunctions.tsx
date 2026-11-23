'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlignLeft,
  BarChart3,
  Calculator,
  Clock,
  Hash,
  Layers,
  ListChecks,
  Repeat,
  Search,
  Sparkles,
  Table,
  Tags
} from 'lucide-react'
import { revealWikiElement } from '@/lib/wikiHeadings'
import {
  auditLinks,
  auditTables,
  collectFootnotes,
  formatDuration,
  readingTime,
  repeatedPhrases,
  sanitizeWikiText,
  splitSections,
  splitSentences,
  topTerms
} from './documentText'

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
  /** 입력칸은 보이지만 비워 두면 기본값으로 실행 */
  inputOptional?: boolean
  icon: React.ComponentType<{ className?: string }>
  run: (context: DocumentFunctionContext, input?: string) => DocumentFunctionResult
}

export { sanitizeWikiText }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 결과 목록을 자를 때 "상위 N개" 표시를 붙인다 */
const MATCH_LIMIT = 8
function limitNote(total: number) {
  return total > MATCH_LIMIT ? ` (상위 ${MATCH_LIMIT}개만 표시)` : ''
}

/** 한국어 기준 읽기 속도 — 공백을 뺀 글자 기준 분당 500자 */
const CHARS_PER_MINUTE = 500
const WORDS_PER_MINUTE = 320

export const FUNCTION_DEFINITIONS: DocumentFunctionDefinition[] = [
  {
    id: 'word-count',
    label: '분량 요약',
    description: '단어(어절), 글자, 문단 수를 한눈에 확인합니다.',
    icon: Calculator,
    run: (ctx) => {
      const charCount = ctx.plainText.replace(/\s+/g, '').length
      const paragraphCount = ctx.rawContent.split(/\n{2,}/).filter((part) => part.trim()).length || 0
      return {
        summary: `${ctx.wordCount.toLocaleString()}개의 어절, ${charCount.toLocaleString()}자(공백 제외)로 이루어져 있습니다.`,
        metrics: [
          { label: '어절 수', value: ctx.wordCount.toLocaleString() },
          { label: '글자 수 (공백 제외)', value: charCount.toLocaleString() },
          { label: '문단 수', value: paragraphCount.toLocaleString() },
          { label: '원문 길이', value: `${ctx.rawContent.length.toLocaleString()}자` }
        ]
      }
    }
  },
  {
    id: 'reading-time',
    label: '예상 읽기 시간',
    description: '공백을 뺀 글자 기준 분당 500자로 추정합니다.',
    icon: Clock,
    run: (ctx) => {
      const charCount = ctx.plainText.replace(/\s+/g, '').length
      if (charCount === 0) return { summary: '읽을 본문이 없습니다.' }
      const byChars = readingTime(charCount, CHARS_PER_MINUTE)
      const byWords = readingTime(ctx.wordCount, WORDS_PER_MINUTE)
      const display = formatDuration(Math.max(byChars.total, 5))
      return {
        summary: `${display} 정도면 이 문서를 모두 읽을 수 있습니다.`,
        metrics: [
          { label: '글자 기준 (분당 500자)', value: formatDuration(byChars.total) },
          { label: '어절 기준 (분당 320어절)', value: formatDuration(byWords.total) },
          { label: '글자 수', value: charCount.toLocaleString() }
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
        summary: `"${term}" 키워드는 ${count.toLocaleString()}회 등장하며 전체 어절 중 ${density}%를 차지합니다.`,
        metrics: [
          { label: '등장 횟수', value: `${count.toLocaleString()}회` },
          { label: '밀도', value: `${density}%` },
          { label: '전체 어절', value: ctx.wordCount.toLocaleString() }
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
        summary: `${matches.length}개의 섹션이 검색되었습니다.${limitNote(matches.length)}`,
        matches: matches.slice(0, MATCH_LIMIT).map(m => ({ label: m.title, anchor: m.anchor }))
      }
    }
  },
  {
    id: 'link-audit',
    label: '링크 점검',
    description: '문서 링크, 분류, 파일, 외부 링크, 각주를 종류별로 셉니다.',
    icon: Hash,
    run: (ctx) => {
      const links = auditLinks(ctx.rawContent)
      const notes = collectFootnotes(ctx.rawContent)
      const footnotes = notes.numberedRefs.size + notes.autoRefs
      return {
        summary: `문서 링크 ${links.internal.toLocaleString()}개(서로 다른 문서 ${links.uniqueInternal.toLocaleString()}개), 외부 링크 ${links.external.toLocaleString()}개, 각주 ${footnotes.toLocaleString()}개가 있습니다.`,
        metrics: [
          { label: '문서 링크 (고유)', value: `${links.internal.toLocaleString()} (${links.uniqueInternal.toLocaleString()})` },
          { label: '외부 링크 (고유)', value: `${links.external.toLocaleString()} (${links.uniqueExternal.toLocaleString()})` },
          { label: '분류', value: links.categories.toLocaleString() },
          { label: '파일·그림', value: links.files.toLocaleString() },
          { label: '각주', value: footnotes.toLocaleString() }
        ]
      }
    }
  },
  {
    id: 'section-balance',
    label: '섹션 분량',
    description: '비어 있는 섹션과 유난히 긴 섹션을 찾아 바로 이동합니다.',
    icon: Layers,
    run: (ctx) => {
      const sections = splitSections(ctx.rawContent)
      if (sections.length === 0) return { summary: '문단 제목이 없는 문서입니다.' }
      const sizes = sections.map((section, index) => ({
        title: section.title,
        anchor: ctx.headings[index]?.anchor,
        length: sanitizeWikiText(section.body).replace(/\s/g, '').length,
        hasChildren: section.hasChildren,
      }))
      const average = sizes.reduce((sum, section) => sum + section.length, 0) / sizes.length
      // 하위 문단만 품은 제목(예: == 활동 == 아래 === 2026년 ===)은 비어 있어도 정상이다
      const flagged = sizes.filter(
        (section) => (section.length === 0 && !section.hasChildren) || section.length > average * 3
      )
      const longest = [...sizes].sort((a, b) => b.length - a.length)[0]
      return {
        summary: `${sizes.length}개 섹션, 평균 ${Math.round(average).toLocaleString()}자. 비어 있거나 지나치게 긴 섹션 ${flagged.length}개.${limitNote(flagged.length)}`,
        metrics: [
          { label: '가장 긴 섹션', value: `${longest.title} (${longest.length.toLocaleString()}자)` },
          { label: '빈 섹션', value: sizes.filter((section) => section.length === 0 && !section.hasChildren).length.toLocaleString() }
        ],
        matches: flagged.slice(0, MATCH_LIMIT).map((section) => ({
          label: `${section.title} · ${section.length ? `${section.length.toLocaleString()}자` : '비어 있음'}`,
          anchor: section.anchor
        }))
      }
    }
  },
  {
    id: 'footnote-integrity',
    label: '각주 점검',
    description: '내용이 없는 각주와 쓰이지 않은 각주 내용을 찾습니다. 본문에 보이는 것과 같은 규칙으로 셉니다.',
    icon: ListChecks,
    run: (ctx) => {
      const notes = collectFootnotes(ctx.rawContent)
      const missing = [...notes.numberedRefs].filter((key) => !notes.definitions.has(key))
      const unused = [...notes.definitions].filter((key) => !notes.numberedRefs.has(key))
      const total = notes.numberedRefs.size + notes.autoRefs
      if (total === 0 && notes.definitions.size === 0) return { summary: '각주가 없는 문서입니다.' }
      const problems = [
        missing.length ? `내용 없는 번호 ${missing.length}개` : '',
        unused.length ? `쓰이지 않은 내용 ${unused.length}개` : '',
        notes.bareRefs ? `내용 없는 [*] ${notes.bareRefs}개` : ''
      ].filter(Boolean)
      return {
        summary: problems.length ? `${problems.join(', ')}가 있습니다.` : '각주 번호와 내용이 모두 맞습니다.',
        metrics: [
          { label: '번호 각주 / 자동 각주', value: `${notes.numberedRefs.size} / ${notes.autoRefs}` },
          { label: '내용이 있는 번호', value: notes.definitions.size.toLocaleString() },
          { label: '내용 없는 번호', value: missing.map((key) => `[*${key}]`).join(', ') || '-' },
          { label: '쓰이지 않은 내용', value: unused.map((key) => `[*${key}]`).join(', ') || '-' },
          { label: '내용 없는 [*]', value: notes.bareRefs ? `${notes.bareRefs}개` : '-' }
        ]
      }
    }
  },
  {
    id: 'long-sentences',
    label: '긴 문장',
    description: '읽기 힘든 긴 문장을 찾습니다. 기준 글자 수를 비워 두면 80자입니다.',
    icon: AlignLeft,
    requiresInput: true,
    inputOptional: true,
    placeholder: '기준 글자 수 (기본 80)',
    run: (ctx, input = '') => {
      const limit = Math.max(20, parseInt(input, 10) || 80)
      // 줄바꿈을 남긴 글로 나눠야 마침표 없이 끝나는 목록·표 줄이 한 문장으로 뭉치지 않는다
      const sentences = splitSentences(sanitizeWikiText(ctx.rawContent, { keepLines: true }))
      if (sentences.length === 0) return { summary: '분석할 문장이 없습니다.' }
      const long = sentences.filter((sentence) => sentence.replace(/\s/g, '').length > limit)
      const average = Math.round(sentences.reduce((sum, sentence) => sum + sentence.length, 0) / sentences.length)
      return {
        summary: `${sentences.length.toLocaleString()}문장 중 ${long.length.toLocaleString()}개가 ${limit}자를 넘습니다 (평균 ${average}자).${limitNote(long.length)}`,
        metrics: [
          { label: '긴 문장 비율', value: `${((long.length / sentences.length) * 100).toFixed(1)}%` }
        ],
        matches: long.slice(0, MATCH_LIMIT).map((sentence) => ({
          label: sentence.length > 60 ? `${sentence.slice(0, 60)}…` : sentence
        }))
      }
    }
  },
  {
    id: 'top-terms',
    label: '자주 쓴 낱말',
    description: '조사를 떼고 가장 많이 쓴 낱말을 셉니다. 키워드 밀도를 보기 전에 쓰기 좋습니다. 개수를 비워 두면 10개입니다.',
    icon: Tags,
    requiresInput: true,
    inputOptional: true,
    placeholder: '보여 줄 개수 (기본 10, 3~30)',
    run: (ctx, input = '') => {
      const count = Math.min(30, Math.max(3, parseInt(input, 10) || 10))
      const terms = topTerms(ctx.plainText, count)
      if (terms.length === 0) return { summary: '분석할 낱말이 없습니다.' }
      return {
        summary: `가장 많이 쓴 낱말은 "${terms[0].term}"(${terms[0].count.toLocaleString()}회)입니다.`,
        metrics: terms.map(({ term, count: times }) => ({ label: term, value: `${times.toLocaleString()}회` }))
      }
    }
  },
  {
    id: 'table-audit',
    label: '표 점검',
    description: '줄마다 칸 수가 다른 표와 빈 칸을 찾습니다. 합친 칸(<-2>, <|2>)은 펼쳐서 셉니다.',
    icon: Table,
    run: (ctx) => {
      const tables = auditTables(ctx.rawContent)
      if (tables.length === 0) return { summary: '표가 없는 문서입니다.' }
      const uneven = tables.filter((table) => table.uneven)
      const widths = (table: (typeof tables)[number]) => [...new Set(table.widths)].join('/')
      return {
        summary: uneven.length
          ? `표 ${tables.length}개 중 ${uneven.length}개가 줄마다 칸 수가 다릅니다.${limitNote(uneven.length)}`
          : `표 ${tables.length}개 모두 줄마다 칸 수가 같습니다.`,
        metrics: tables.slice(0, MATCH_LIMIT).map((table, index) => ({
          label: `표 ${index + 1} (${table.startLine}번째 줄부터)`,
          value: `${table.rows}줄 · 칸 ${widths(table)} · 빈 칸 ${table.emptyCells}`
        })),
        matches: uneven.slice(0, MATCH_LIMIT).map((table) => ({
          label: `${table.startLine}번째 줄 표 — 칸 수 ${widths(table)} (줄별 ${table.widths.join(', ')})`
        }))
      }
    }
  },
  {
    id: 'repeated-phrases',
    label: '반복 표현',
    description: '세 번 넘게 쓴 같은 표현과, 두 번 똑같이 나온 긴 구절(복사해 붙인 문단)을 찾습니다.',
    icon: Repeat,
    run: (ctx) => {
      const { phrases, passages, truncated } = repeatedPhrases(ctx.plainText)
      const note = truncated ? ' (문서가 길어 앞부분 5만 어절만 봤습니다)' : ''
      if (phrases.length === 0 && passages.length === 0) {
        return { summary: `눈에 띄게 반복된 표현이 없습니다.${note}` }
      }
      const matches = [
        ...passages.map((item) => ({ label: `구절 "${item.phrase}…" · ${item.count}번` })),
        ...phrases.map((item) => ({ label: `"${item.phrase}" · ${item.count}회` }))
      ]
      return {
        summary: `3번 이상 쓴 표현 ${phrases.length}개, 두 번 이상 똑같이 나온 긴 구절 ${passages.length}개.${limitNote(matches.length)}${note}`,
        matches: matches.slice(0, MATCH_LIMIT)
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

  // 함수를 바꾸면 입력값과 결과를 비운다 (입력형 함수 결과가 다른 함수로 넘어가지 않게)
  useEffect(() => {
    setInputValue('')
    setResult(null)
  }, [selectedId])

  // 입력이 없는 함수는 고르거나 본문이 바뀔 때 바로 다시 계산한다.
  // 입력형 함수의 결과는 목차 객체가 새로 만들어져도 지우지 않는다.
  useEffect(() => {
    if (selected.requiresInput) return
    try {
      setResult(selected.run(context))
    } catch (err) {
      setResult({
        summary: err instanceof Error ? err.message : '함수 실행 중 오류가 발생했습니다.'
      })
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
    if (selected.requiresInput && !selected.inputOptional && !value) {
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
      lines.push('목록:')
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
    const target =
      document.getElementById(anchor) ||
      (typeof CSS !== 'undefined' && CSS.escape ? document.querySelector(`#${CSS.escape(anchor)}`) : null)
    if (target instanceof HTMLElement) {
      // 접힌 문단(==# 제목 #==)이나 >>> 접기 안의 제목이면 먼저 펼쳐야 화면이 움직인다
      revealWikiElement(target)
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
            className="self-start rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-[#fff] hover:opacity-90"
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
                {result.metrics.map((m, i) => (
                  <li
                    key={`${i}-${m.label}`}
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
                {result.matches.map((m, i) => (
                  <li key={`${i}-${m.anchor || m.label}`}>
                    {m.anchor ? (
                      <button
                        type="button"
                        onClick={() => handleMatchClick(m.anchor)}
                        className="flex w-full items-center justify-between rounded-sm border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] px-2 py-1 text-left text-xs text-[color:var(--wiki-link)] hover:underline"
                      >
                        <span>{m.label}</span>
                        <Search className="w-3 h-3 text-[color:var(--wiki-ink-muted)]" />
                      </button>
                    ) : (
                      // 이동할 자리가 없는 결과(긴 문장 등)는 글자로만 보여 준다
                      <p className="rounded-sm border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] px-2 py-1 text-xs text-[color:var(--wiki-ink-soft)]">
                        {m.label}
                      </p>
                    )}
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
