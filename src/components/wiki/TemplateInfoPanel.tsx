'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Puzzle } from 'lucide-react'
import { templateParameters } from '@/lib/wiki/templates'

/**
 * `틀:이름` 문서 위에 붙는 안내 — 이 틀이 받는 칸, 부르는 법, 이 틀을 쓰는 문서.
 */
export function TemplateInfoPanel({ name, content }: { name: string; content: string }) {
  const parameters = useMemo(() => templateParameters(content), [content])
  const [usages, setUsages] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setUsages(null)
    fetch(`/api/wiki/templates?usages=${encodeURIComponent(name)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setUsages(data?.success && Array.isArray(data.titles) ? data.titles : [])
      })
      .catch(() => {
        if (!cancelled) setUsages([])
      })
    return () => {
      cancelled = true
    }
  }, [name])

  const example =
    parameters.length === 0
      ? `{{${name}}}`
      : `{{${name}\n${parameters.map((parameter) => `|${parameter.name}=`).join('\n')}\n}}`

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(example)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 복사를 못 해도 예시는 화면에 있다 */
    }
  }

  return (
    <section aria-label="틀 안내" className="wiki-panel mb-4">
      <div className="flex items-center gap-2">
        <Puzzle className="h-4 w-4 text-[color:var(--wiki-accent)]" aria-hidden="true" />
        <h2 className="wiki-serif text-base font-semibold">틀 문서</h2>
      </div>
      <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">
        다른 문서에서 아래처럼 부르면 이 문서 내용이 그 자리에 들어갑니다. 틀 안의 <code>@칸@</code>은 넘긴 값으로 바뀝니다.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[color:var(--wiki-ink-soft)]">부르는 법</h3>
            <button
              type="button"
              onClick={copy}
              className="text-xs text-[color:var(--wiki-link)] hover:underline"
            >
              {copied ? '복사했습니다' : '복사'}
            </button>
          </div>
          <pre className="mt-1 overflow-x-auto rounded-sm border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] px-2 py-1.5 text-xs text-[color:var(--wiki-ink)]">
            {example}
          </pre>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[color:var(--wiki-ink-soft)]">받는 칸 ({parameters.length})</h3>
          {parameters.length === 0 ? (
            <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">칸이 없는 틀입니다. 본문에 @칸 이름@ 을 쓰면 칸이 생깁니다.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-xs">
              {parameters.map((parameter) => (
                <li key={parameter.name} className="flex justify-between gap-2 border-b border-[color:var(--wiki-rule)] py-0.5">
                  <code>{parameter.name}</code>
                  <span className="text-[color:var(--wiki-ink-muted)]">
                    {parameter.fallback !== undefined ? `기본값: ${parameter.fallback || '(빈칸)'}` : '값을 안 넘기면 빈칸'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-xs font-semibold text-[color:var(--wiki-ink-soft)]">
          이 틀을 쓰는 문서{usages ? ` (${usages.length})` : ''}
        </h3>
        {usages === null ? (
          <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">찾는 중…</p>
        ) : usages.length === 0 ? (
          <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">아직 이 틀을 쓰는 문서가 없습니다.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {usages.map((title) => (
              <li key={title}>
                <Link href={`/wiki/${encodeURIComponent(title)}`} className="text-[color:var(--wiki-link)] hover:underline">
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
