'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { List } from 'lucide-react'

interface TocItem {
  level: number
  title: string // 표시용 (인라인 마크업 제거)
  anchor: string // NamuWikiRenderer 의 heading id 와 동일해야 함
}

// NamuWikiRenderer.toSlug 와 반드시 동일하게 유지할 것 (앵커 매칭).
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// 표시용으로 흔한 인라인 마크업만 제거 (앵커 계산에는 사용하지 않음)
function stripInline(text: string): string {
  return text
    .replace(/'''|''|~~|__|\^\^|,,/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, p1, p2) => (p2 || p1))
    .replace(/`/g, '')
    .trim()
}

function extractHeadings(content: string): TocItem[] {
  const out: TocItem[] = []
  const lines = (content || '').split('\n')
  let inFence = false
  for (const raw of lines) {
    const trimmed = raw.trim()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    let level = 0
    let title = ''
    const namu = trimmed.match(/^(=+)\s*(.+?)\s*=+$/)
    if (namu) {
      level = namu[1].length
      title = namu[2].trim()
    } else {
      const md = trimmed.match(/^(#+)\s*(.+)$/)
      if (md) {
        level = md[1].length
        title = md[2].trim()
      }
    }
    if (level > 0 && title) {
      out.push({ level, title: stripInline(title), anchor: toSlug(title) })
    }
  }
  return out
}

interface Props {
  content: string
}

/**
 * 문서 우측에 떠 있는 sticky 목차. 스크롤에 따라 현재 섹션을 강조(scroll-spy)한다.
 * 앵커는 NamuWikiRenderer 가 헤딩에 부여하는 id(toSlug)와 동일하게 맞춰져 있다.
 * 헤딩이 2개 미만이면 렌더하지 않는다.
 */
export function WikiTableOfContents({ content }: Props) {
  const headings = useMemo(() => extractHeadings(content), [content])
  const [active, setActive] = useState<string>('')

  // 최소 레벨을 기준으로 들여쓰기 정규화 (문서가 == 부터 시작하든 # 부터 시작하든 일관)
  const minLevel = useMemo(
    () => (headings.length ? Math.min(...headings.map((h) => h.level)) : 1),
    [headings]
  )

  useEffect(() => {
    if (headings.length < 2) return
    let observer: IntersectionObserver | null = null
    // 렌더 직후 헤딩 DOM 이 존재하도록 한 프레임 양보
    const raf = requestAnimationFrame(() => {
      const els = headings
        .map((it) => document.getElementById(it.anchor))
        .filter((el): el is HTMLElement => Boolean(el))
      if (els.length === 0) return
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting)
          if (visible.length > 0) {
            visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
            setActive(visible[0].target.id)
          }
        },
        { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
      )
      els.forEach((el) => observer!.observe(el))
    })
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [headings])

  if (headings.length < 2) return null

  const handleClick = (e: React.MouseEvent, anchor: string) => {
    e.preventDefault()
    const el = document.getElementById(anchor)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActive(anchor)
      try {
        history.replaceState(null, '', `#${anchor}`)
      } catch {
        /* noop */
      }
    }
  }

  return (
    <nav
      aria-label="목차"
      className="wiki-panel sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      <div className="mb-2 flex items-center gap-1.5 border-b border-[color:var(--wiki-rule)] pb-2">
        <List className="h-3.5 w-3.5 text-[color:var(--wiki-accent)]" />
        <span className="wiki-label text-[color:var(--wiki-ink-soft)]">목차</span>
        <span className="ml-auto text-[10px] tabular-nums text-[color:var(--wiki-ink-muted)]">
          {headings.length}
        </span>
      </div>
      <ul className="space-y-0.5 text-[13px] leading-snug">
        {headings.map((h, idx) => {
          const isActive = active === h.anchor
          return (
            <li key={`${h.anchor}-${idx}`}>
              <a
                href={`#${h.anchor}`}
                onClick={(e) => handleClick(e, h.anchor)}
                style={{ paddingLeft: `${(h.level - minLevel) * 12}px` }}
                className={`block truncate border-l-2 py-0.5 pl-2 transition-colors ${
                  isActive
                    ? 'border-[color:var(--wiki-accent)] text-[color:var(--wiki-link)] font-medium'
                    : 'border-transparent text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-rule-strong)] hover:text-[color:var(--wiki-ink)]'
                }`}
                title={h.title}
              >
                {h.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default WikiTableOfContents
