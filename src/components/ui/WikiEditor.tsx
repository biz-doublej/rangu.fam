'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, AlignCenter, AlignLeft, AlignRight, BarChart3, Blocks, Bold, Calendar, CheckCircle,
  ChevronDown, ChevronRight, Code, FileText, Hash, Heading1, Heading2, Heading3, HelpCircle,
  Image as ImageIcon, Info, Italic, Link, Link2, List, ListOrdered, ListTree, Maximize2, Minimize2,
  Minus, Palette, PaintBucket, PenLine, Quote, Save, SpellCheck, Strikethrough, Subscript, Superscript,
  Table, Tag, Type, Underline, X
} from 'lucide-react'
import NamuWikiRenderer from './NamuWikiRenderer'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { COLOR_PICKER_PALETTE, normalizeColor, isValidHexColor } from '@/lib/tableColors'
import { EDITOR_TEMPLATES } from '@/components/wiki/editor/templates'
import { SyntaxHelp } from '@/components/wiki/editor/SyntaxHelp'

type EditorMode = 'write' | 'split' | 'preview'

interface WikiEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  onCancel?: () => void
  /** 편집기 머리에 보이는 제목 */
  title?: string
  /** 실제 문서 제목 — 편집 잠금·임시 저장 키. 새 문서면 생략 */
  documentTitle?: string
  isNewDocument?: boolean
  /** 편집 요약 — 넘기면 하단 저장 영역에 요약 입력이 나온다 */
  summary?: string
  onSummaryChange?: (summary: string) => void
  isMinorEdit?: boolean
  onMinorEditChange?: (isMinor: boolean) => void
  saveLabel?: string
  /** 템플릿: 네임스페이스에 저장된 분야별 템플릿 (예: 인물, 학교) */
  templateCategories?: string[]
  onLoadTemplateCategory?: (category: string) => void
  onOpenFullHelp?: () => void
  showPreview?: boolean
  className?: string
}

type SpellResult = { word: string; suggestions: string[]; position: number }

const EDITOR_PLACEHOLDER = `여기에 문서 내용을 작성하세요.

== 개요 ==
'''굵게''', ''기울임'', [[다른 문서]] 링크, [*] 각주를 쓸 수 있습니다.
툴바의 ? 버튼에서 문법 요약을 볼 수 있어요.`

const DRAFT_PREFIX = 'wiki-editor-draft:'

/* ── 툴바 부품 ───────────────────────────────────────── */

function ToolButton({
  icon: Icon, label, shortcut, onClick, active = false, disabled = false,
}: {
  icon: React.ElementType
  label: string
  shortcut?: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  const tip = shortcut ? `${label} (${shortcut})` : label
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // 텍스트 선택 유지
      onClick={onClick}
      disabled={disabled}
      aria-label={tip}
      aria-pressed={active || undefined}
      title={tip}
      className={`wiki-editor__tool ${active ? 'is-active' : ''}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

type MenuItem =
  | { kind: 'item'; label: string; hint?: string; icon?: React.ElementType; onSelect: () => void }
  | { kind: 'heading'; label: string }
  | { kind: 'divider' }

function ToolMenu({ icon: Icon, label, items }: { icon: React.ElementType; label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className={`wiki-editor__tool wiki-editor__tool--labeled ${open ? 'is-active' : ''}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="wiki-editor__menu">
          {items.map((item, i) => {
            if (item.kind === 'divider') return <div key={i} className="wiki-editor__menu-divider" />
            if (item.kind === 'heading') {
              return <p key={i} className="wiki-editor__menu-heading">{item.label}</p>
            }
            const ItemIcon = item.icon
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className="wiki-editor__menu-item"
              >
                {ItemIcon && <ItemIcon className="h-4 w-4 shrink-0 text-[color:var(--wiki-ink-muted)]" aria-hidden="true" />}
                <span className="flex-1 text-left">{item.label}</span>
                {item.hint && <span className="text-xs text-[color:var(--wiki-ink-faint)]">{item.hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ToolDivider = () => <span className="wiki-editor__divider" aria-hidden="true" />

/* ── 편집기 ─────────────────────────────────────────── */

export default function WikiEditor({
  content,
  onChange,
  onSave,
  onCancel,
  title = '문서 편집',
  documentTitle,
  isNewDocument = false,
  summary,
  onSummaryChange,
  isMinorEdit = false,
  onMinorEditChange,
  saveLabel,
  templateCategories = [],
  onLoadTemplateCategory,
  onOpenFullHelp,
  showPreview = false,
  className = '',
}: WikiEditorProps) {
  const { wikiUser } = useWikiAuth()
  const [mode, setMode] = useState<EditorMode>(showPreview ? 'split' : 'write')
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showTablePanel, setShowTablePanel] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tableColors, setTableColors] = useState<{ backgroundColor?: string; textColor?: string }>({})
  const [customColor, setCustomColor] = useState('')
  const [spellResults, setSpellResults] = useState<SpellResult[] | null>(null)
  const [isSpellChecking, setIsSpellChecking] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ content: string; savedAt: number } | null>(null)

  const lineCount = useMemo(() => content.split('\n').length, [content])
  const draftKey = `${DRAFT_PREFIX}${documentTitle || title}`
  const lockedByOther = Boolean(lockedBy && lockedBy !== wikiUser?.username)

  /* ── 텍스트 조작 ── */

  const restoreCaret = (from: number, to: number = from, scrollTop?: number) => {
    setTimeout(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(from, to)
      if (scrollTop !== undefined) textarea.scrollTop = scrollTop
    }, 0)
  }

  const insertText = (before: string, after: string = '', wrapSelection: boolean = true) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart: start, selectionEnd: end, scrollTop } = textarea
    const selected = content.substring(start, end)
    if (wrapSelection && selected) {
      onChange(content.substring(0, start) + before + selected + after + content.substring(end))
      restoreCaret(start + before.length, start + before.length + selected.length, scrollTop)
    } else {
      onChange(content.substring(0, start) + before + after + content.substring(end))
      restoreCaret(start + before.length, start + before.length, scrollTop)
    }
  }

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart: start, scrollTop } = textarea
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    onChange(content.substring(0, lineStart) + prefix + content.substring(lineStart))
    restoreCaret(start + prefix.length, start + prefix.length, scrollTop)
  }

  /** 여러 줄짜리 블록은 항상 독립된 줄에 들어가도록 앞뒤 줄바꿈을 맞춘다 */
  const insertBlock = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? content.length
    const needsLeadingBreak = start > 0 && content[start - 1] !== '\n'
    insertText(`${needsLeadingBreak ? '\n' : ''}${before}`, after, true)
  }

  const wrapAlignment = (alignment: 'left' | 'center' | 'right') => {
    const textarea = textareaRef.current
    if (!textarea || textarea.selectionStart === textarea.selectionEnd) {
      alert('정렬할 텍스트를 먼저 선택해주세요.')
      return
    }
    const open = alignment === 'left' ? '{{{<<' : alignment === 'center' ? '{{{^' : '{{{>>'
    insertText(open, '}}}')
  }

  /* ── 이미지 ── */

  /** 표 셀/정보상자 안이면 그 자리에, 본문이면 단독 줄로 (렌더러가 단독 줄 [이미지:] 만 인식) */
  const insertImage = (url: string) => {
    const start = textareaRef.current?.selectionStart ?? content.length
    const before = content.substring(0, start)
    const currentLine = before.split('\n').pop() || ''
    const inTable = currentLine.trim().startsWith('||')
    const inTemplate =
      before.lastIndexOf('[[인포박스:') > before.lastIndexOf(']]') ||
      Math.max(before.lastIndexOf('{{인물정보상자'), before.lastIndexOf('{{그룹정보상자')) > before.lastIndexOf('}}')

    if (inTemplate && /\|\s*이미지\s*=\s*$/.test(currentLine)) {
      insertText(url, '', false)
    } else if (inTable || inTemplate) {
      insertText(`[이미지:${url}]`, '', false)
    } else {
      insertBlock(`[이미지:${url}]\n`)
    }
  }

  const uploadImage = async (file: File) => {
    if (file.size > 1024 * 1024) {
      alert('이미지 크기는 최대 1MB까지 업로드할 수 있습니다.')
      return
    }
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/wiki/files/upload', { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!data.success || !data.url) {
        alert(data.error || '이미지 업로드에 실패했습니다.')
        return
      }
      insertImage(data.url as string)
    } catch {
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  /* ── 표 ── */

  const insertTable = (rows: number, cols: number, colors?: { backgroundColor?: string; textColor?: string }) => {
    // 행 단위 색상은 머리 행 첫 셀에 한 번만 적으면 행 전체에 적용된다
    const directive = [
      colors?.backgroundColor && normalizeColor(colors.backgroundColor) && `rowbgcolor:${normalizeColor(colors.backgroundColor)}`,
      colors?.textColor && normalizeColor(colors.textColor) && `rowcolor:${normalizeColor(colors.textColor)}`,
    ].filter(Boolean).join(' ')
    const header = Array.from({ length: cols }, (_, c) => `${c === 0 && directive ? `<${directive}>` : ''}머리${c + 1}`)
    const body = Array.from({ length: rows - 1 }, (_, r) =>
      Array.from({ length: cols }, (_, c) => `내용${r + 1}-${c + 1}`)
    )
    const text = [header, ...body].map((cells) => `|| ${cells.join(' || ')} ||`).join('\n')
    insertBlock(`${text}\n`)
    setShowTablePanel(false)
  }

  const applyCustomColor = (target: 'backgroundColor' | 'textColor') => {
    if (!isValidHexColor(customColor)) {
      alert('올바른 색상 코드를 입력하세요. (예: #2F5D8C)')
      return
    }
    setTableColors((prev) => ({ ...prev, [target]: normalizeColor(customColor) }))
  }

  /* ── 템플릿 ── */

  const insertTemplate = (key: string) => {
    const template = EDITOR_TEMPLATES[key]
    if (!template) return
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? content.length
    const end = textarea?.selectionEnd ?? content.length
    onChange(content.substring(0, start) + template.template + content.substring(end))
    restoreCaret(start, start + template.template.length)
  }

  /* ── 맞춤법 ── */

  const runSpellCheck = async () => {
    if (!content.trim()) {
      alert('맞춤법을 검사할 내용이 없습니다.')
      return
    }
    setIsSpellChecking(true)
    try {
      const res = await fetch('/api/wiki/spell-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setSpellResults((data.results || []) as SpellResult[])
    } catch (error) {
      console.error('맞춤법 검사 오류:', error)
      alert('맞춤법 검사 중 오류가 발생했습니다.')
    } finally {
      setIsSpellChecking(false)
    }
  }

  const applySuggestion = (result: SpellResult, suggestion: string) => {
    onChange(content.substring(0, result.position) + content.substring(result.position).replace(result.word, suggestion))
    setSpellResults((prev) => prev?.filter((r) => r !== result) ?? null)
  }

  const lineOf = (position: number) => {
    const lineNumber = content.substring(0, position).split('\n').length
    return { lineNumber, lineContent: content.split('\n')[lineNumber - 1] || '' }
  }

  /* ── 저장 ── */

  const handleSave = useCallback(() => {
    if (!onSave) return
    if (lockedByOther) {
      alert(`${lockedBy}님이 편집 중인 문서라 지금은 저장할 수 없습니다.`)
      return
    }
    onSave()
  }, [onSave, lockedByOther, lockedBy])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase()
      if (key === 'b') { e.preventDefault(); insertText("'''", "'''") }
      else if (key === 'i') { e.preventDefault(); insertText("''", "''") }
      else if (key === 'k') { e.preventDefault(); insertText('[[', ']]') }
      else if (key === 's') { e.preventDefault(); handleSave() }
      else if (e.key === 'Enter') { e.preventDefault(); setMode((m) => (m === 'write' ? 'split' : 'write')) }
      return
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      insertText('  ', '', false)
    }
    if (e.key === 'Escape' && isFocusMode) setIsFocusMode(false)
  }

  /* ── 임시 저장 (문서별) ── */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const saved = JSON.parse(raw) as { content: string; savedAt: number }
      if (saved?.content && saved.content !== content) setDraft(saved)
      else localStorage.removeItem(draftKey)
    } catch {
      /* 저장소 접근 불가 — 무시 */
    }
    // 처음 열 때 한 번만 확인
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  useEffect(() => {
    if (draft) return // 복원 여부를 고르기 전엔 덮어쓰지 않는다
    const timer = setTimeout(() => {
      try {
        if (content.trim()) localStorage.setItem(draftKey, JSON.stringify({ content, savedAt: Date.now() }))
      } catch {
        /* 무시 */
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [content, draftKey, draft])

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey) } catch { /* 무시 */ }
    setDraft(null)
  }

  /* ── 편집 잠금 (기존 문서만) ── */

  useEffect(() => {
    if (!documentTitle || isNewDocument) return
    const query = `/api/wiki/pages/lock?title=${encodeURIComponent(documentTitle)}`
    let cancelled = false

    const refresh = async () => {
      try {
        const data = await (await fetch(query, { credentials: 'include' })).json()
        if (!cancelled && data.success) setLockedBy(data.isLocked ? data.lockedBy || null : null)
      } catch {
        /* 네트워크 오류는 무시 — 잠금은 참고용 */
      }
    }

    ;(async () => {
      try {
        const res = await fetch('/api/wiki/pages/lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: documentTitle }),
        })
        const data = await res.json()
        if (!cancelled && !data.success && data.lockedBy) setLockedBy(data.lockedBy)
      } catch {
        /* 무시 */
      }
    })()

    const interval = setInterval(refresh, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
      fetch(query, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {})
    }
  }, [documentTitle, isNewDocument])

  // 집중 모드에선 뒤 페이지 스크롤을 막는다
  useEffect(() => {
    if (!isFocusMode) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [isFocusMode])

  /* ── 메뉴 정의 ── */

  const tableMenu: MenuItem[] = [
    { kind: 'heading', label: '표 넣기' },
    ...([[2, 2], [3, 3], [4, 4], [5, 3]] as const).map(([r, c]) => ({
      kind: 'item' as const, label: `${r} × ${c} 표`, icon: Table, onSelect: () => insertTable(r, c),
    })),
    { kind: 'item', label: '색상 표 만들기…', icon: PaintBucket, onSelect: () => setShowTablePanel(true) },
    { kind: 'divider' },
    { kind: 'heading', label: '선택한 글 정렬' },
    { kind: 'item', label: '왼쪽', icon: AlignLeft, onSelect: () => wrapAlignment('left') },
    { kind: 'item', label: '가운데', icon: AlignCenter, onSelect: () => wrapAlignment('center') },
    { kind: 'item', label: '오른쪽', icon: AlignRight, onSelect: () => wrapAlignment('right') },
  ]

  const blockMenu: MenuItem[] = [
    { kind: 'item', label: '정보 상자', icon: Info, hint: ':::info', onSelect: () => insertBlock(':::info\n', '\n:::\n') },
    { kind: 'item', label: '경고 상자', icon: AlertCircle, hint: ':::warn', onSelect: () => insertBlock(':::warn\n', '\n:::\n') },
    { kind: 'item', label: '성공 상자', icon: CheckCircle, hint: ':::success', onSelect: () => insertBlock(':::success\n', '\n:::\n') },
    { kind: 'item', label: '접기', icon: ChevronRight, hint: '>>>', onSelect: () => insertBlock('>>> 자세히 보기\n', '\n<<<\n') },
    { kind: 'divider' },
    { kind: 'item', label: '타임라인', icon: Calendar, onSelect: () => insertBlock(':::timeline\n2026-01-01 | 사건 제목 | 설명\n', ':::\n') },
    { kind: 'item', label: '투표', icon: BarChart3, onSelect: () => insertBlock(':::poll 질문을 입력하세요\n선택지1\n선택지2\n', ':::\n') },
    { kind: 'item', label: '가로줄', icon: Minus, hint: '---', onSelect: () => insertBlock('---\n') },
    { kind: 'item', label: '목차', icon: ListTree, hint: '[[목차]]', onSelect: () => insertBlock('[[목차]]\n') },
  ]

  const styleMenu: MenuItem[] = [
    { kind: 'item', label: '위첨자', icon: Superscript, hint: '^^', onSelect: () => insertText('^^', '^^') },
    { kind: 'item', label: '아래첨자', icon: Subscript, hint: ',,', onSelect: () => insertText(',,', ',,') },
    { kind: 'item', label: '인라인 코드', icon: Code, hint: '`', onSelect: () => insertText('`', '`') },
    { kind: 'divider' },
    { kind: 'item', label: '글자 색', icon: Palette, onSelect: () => insertText('{{{#a33a2e ', '}}}') },
    { kind: 'item', label: '글자 크게', icon: Type, onSelect: () => insertText('{{{+1 ', '}}}') },
    { kind: 'item', label: '글꼴 지정', icon: Type, onSelect: () => insertText('{{{font:"Noto Sans KR" ', '}}}') },
  ]

  const templateMenu: MenuItem[] = [
    { kind: 'heading', label: '기본 틀 (커서 위치에 삽입)' },
    ...Object.entries(EDITOR_TEMPLATES).map(([key, t]) => ({
      kind: 'item' as const, label: t.name, icon: t.icon, onSelect: () => insertTemplate(key),
    })),
    ...(templateCategories.length && onLoadTemplateCategory
      ? [
          { kind: 'divider' as const },
          { kind: 'heading' as const, label: '분야별 템플릿 (본문 전체 교체)' },
          ...templateCategories.map((category) => ({
            kind: 'item' as const, label: category, icon: FileText, onSelect: () => onLoadTemplateCategory(category),
          })),
        ]
      : []),
  ]

  /* ── 렌더 ── */

  const editorPane = (
    <div className="wiki-editor__pane">
      <div ref={lineNumbersRef} className="wiki-editor__gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={() => {
          if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
          }
        }}
        placeholder={EDITOR_PLACEHOLDER}
        spellCheck={false}
        aria-label="문서 내용"
        className="wiki-editor__textarea"
      />
    </div>
  )

  const previewPane = (
    <div className="wiki-editor__preview" aria-label="미리보기">
      <div className="image-render-stable wiki-content">
        {content.trim() ? (
          <NamuWikiRenderer content={content} generateTableOfContents isPreview />
        ) : (
          <p className="text-sm text-[color:var(--wiki-ink-faint)]">왼쪽에 내용을 입력하면 여기에 미리보기가 표시됩니다.</p>
        )}
      </div>
    </div>
  )

  const hasSaveBar = Boolean(onSave || onSummaryChange || onMinorEditChange)

  return (
    <div className={`wiki-editor ${isFocusMode ? 'is-focus' : ''} ${className}`}>
      {/* 머리: 제목 · 보기 방식 · 집중 모드 */}
      <div className="wiki-editor__head">
        <div className="flex min-w-0 items-center gap-2">
          <PenLine className="h-4 w-4 shrink-0 text-[color:var(--wiki-accent)]" aria-hidden="true" />
          <h3 className="truncate text-sm font-semibold text-[color:var(--wiki-ink)]">{title}</h3>
          {isNewDocument && <span className="wiki-chip is-active shrink-0">새 문서</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="wiki-editor__segmented" role="tablist" aria-label="보기 방식">
            {([
              ['write', '편집'],
              ['split', '나란히'],
              ['preview', '미리보기'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`${mode === value ? 'is-active' : ''} ${value === 'split' ? 'hidden lg:inline-flex' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ToolButton
            icon={isFocusMode ? Minimize2 : Maximize2}
            label={isFocusMode ? '집중 모드 끄기' : '집중 모드'}
            shortcut={isFocusMode ? 'Esc' : undefined}
            onClick={() => setIsFocusMode((v) => !v)}
          />
        </div>
      </div>

      {/* 툴바 */}
      {mode !== 'preview' && (
        <div className="wiki-editor__toolbar" role="toolbar" aria-label="서식 도구">
          <ToolButton icon={Bold} label="굵게" shortcut="Ctrl+B" onClick={() => insertText("'''", "'''")} />
          <ToolButton icon={Italic} label="기울임" shortcut="Ctrl+I" onClick={() => insertText("''", "''")} />
          <ToolButton icon={Underline} label="밑줄" onClick={() => insertText('__', '__')} />
          <ToolButton icon={Strikethrough} label="취소선" onClick={() => insertText('~~', '~~')} />
          <ToolMenu icon={Type} label="글자" items={styleMenu} />
          <ToolDivider />
          <ToolButton icon={Heading1} label="큰 제목" onClick={() => insertAtLineStart('= ')} />
          <ToolButton icon={Heading2} label="문단 제목" onClick={() => insertAtLineStart('== ')} />
          <ToolButton icon={Heading3} label="소제목" onClick={() => insertAtLineStart('=== ')} />
          <ToolButton icon={List} label="목록" onClick={() => insertAtLineStart('* ')} />
          <ToolButton icon={ListOrdered} label="번호 목록" onClick={() => insertAtLineStart('1. ')} />
          <ToolButton icon={Quote} label="인용" onClick={() => insertAtLineStart('> ')} />
          <ToolDivider />
          <ToolButton icon={Link2} label="위키 링크" shortcut="Ctrl+K" onClick={() => insertText('[[', ']]')} />
          <ToolButton icon={Link} label="외부 링크" onClick={() => insertText('[', '](https://)')} />
          <ToolButton icon={Hash} label="각주" onClick={() => insertText('[*] ', '')} />
          <ToolButton icon={Tag} label="분류" onClick={() => insertBlock('[[분류:', ']]\n')} />
          <ToolButton
            icon={ImageIcon}
            label={isUploading ? '올리는 중…' : '사진 올리기'}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          />
          <ToolDivider />
          <ToolMenu icon={Table} label="표" items={tableMenu} />
          <ToolMenu icon={Blocks} label="블록" items={blockMenu} />
          <ToolMenu icon={FileText} label="템플릿" items={templateMenu} />
          <span className="ml-auto flex items-center gap-0.5">
            <ToolButton
              icon={SpellCheck}
              label={isSpellChecking ? '검사 중…' : '맞춤법 검사'}
              disabled={isSpellChecking}
              onClick={runSpellCheck}
            />
            <ToolButton icon={HelpCircle} label="문법 요약" active={showHelp} onClick={() => setShowHelp((v) => !v)} />
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadImage(file)
              e.currentTarget.value = ''
            }}
          />
        </div>
      )}

      {/* 알림 줄 */}
      {lockedByOther && (
        <div className="wiki-mbox wiki-mbox--danger wiki-editor__notice" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--wiki-danger)]" aria-hidden="true" />
          <span>
            <strong>{lockedBy}</strong>님이 이 문서를 편집 중입니다. 편집이 끝날 때까지(최대 10분) 저장할 수 없어요.
          </span>
        </div>
      )}
      {draft && (
        <div className="wiki-mbox wiki-mbox--info wiki-editor__notice">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--wiki-accent)]" aria-hidden="true" />
          <span className="flex-1">
            {new Date(draft.savedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}에 저장되지 않은
            임시 원고가 있습니다.
          </span>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              className="wiki-editor__btn wiki-editor__btn--primary"
              onClick={() => {
                onChange(draft.content)
                setDraft(null)
              }}
            >
              복원
            </button>
            <button type="button" className="wiki-editor__btn" onClick={discardDraft}>버리기</button>
          </span>
        </div>
      )}

      {showHelp && mode !== 'preview' && <SyntaxHelp onOpenFullHelp={onOpenFullHelp} />}

      {/* 색상 표 만들기 */}
      {showTablePanel && (
        <div className="wiki-editor__panel">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[color:var(--wiki-ink)]">색상 표 만들기</h4>
            <button type="button" aria-label="닫기" className="wiki-editor__tool" onClick={() => setShowTablePanel(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-2 text-xs text-[color:var(--wiki-ink-muted)]">머리 행 배경색</p>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PICKER_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={tableColors.backgroundColor === c.value}
                onClick={() => setTableColors((prev) => ({ ...prev, backgroundColor: c.value }))}
                className="h-7 w-7 rounded-md border border-[color:var(--wiki-rule-strong)] aria-pressed:ring-2 aria-pressed:ring-[color:var(--wiki-accent)] aria-pressed:ring-offset-1"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="color"
              aria-label="색 고르기"
              value={/^#[0-9a-fA-F]{6}$/.test(normalizeColor(customColor.trim())) ? normalizeColor(customColor.trim()) : '#2F5D8C'}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-md p-0.5"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#2F5D8C"
              className="w-28 px-2 py-1 text-sm"
            />
            <button type="button" className="wiki-editor__btn" disabled={!customColor.trim()} onClick={() => applyCustomColor('backgroundColor')}>
              배경으로
            </button>
            <button type="button" className="wiki-editor__btn" disabled={!customColor.trim()} onClick={() => applyCustomColor('textColor')}>
              글자색으로
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded-md border border-[color:var(--wiki-rule)] px-3 py-1.5 text-sm"
              style={{ backgroundColor: tableColors.backgroundColor, color: tableColors.textColor }}
            >
              머리 행 미리보기
            </span>
            {(tableColors.backgroundColor || tableColors.textColor) && (
              <button type="button" className="text-xs text-[color:var(--wiki-ink-muted)] hover:underline" onClick={() => setTableColors({})}>
                색 초기화
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {([[2, 2], [3, 3], [4, 4], [5, 3]] as const).map(([r, c]) => (
              <button key={`${r}x${c}`} type="button" className="wiki-editor__btn" onClick={() => insertTable(r, c, tableColors)}>
                {r} × {c} 넣기
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div className={`wiki-editor__body wiki-editor__body--${mode}`}>
        {mode !== 'preview' && editorPane}
        {mode !== 'write' && previewPane}
      </div>

      <div className="wiki-editor__status">
        <span>{content.length.toLocaleString('ko-KR')}자 · {lineCount.toLocaleString('ko-KR')}줄</span>
        <span className="hidden sm:inline">Ctrl+S 저장 · Ctrl+Enter 미리보기 · Ctrl+K 링크</span>
      </div>

      {/* 맞춤법 결과 */}
      {spellResults && (
        <div className="wiki-editor__panel">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[color:var(--wiki-ink)]">맞춤법 검사 결과</h4>
            <button type="button" aria-label="닫기" className="wiki-editor__tool" onClick={() => setSpellResults(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {spellResults.filter((r) => lineOf(r.position).lineContent.includes(r.word)).length === 0 ? (
            <p className="text-sm text-[color:var(--wiki-success)]">맞춤법 오류가 발견되지 않았습니다.</p>
          ) : (
            <ul className="space-y-2">
              {spellResults
                .filter((r) => lineOf(r.position).lineContent.includes(r.word))
                .map((result) => {
                  const { lineNumber, lineContent } = lineOf(result.position)
                  return (
                    <li key={`${result.position}-${result.word}`} className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg)] p-3 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-[color:var(--wiki-danger)]">“{result.word}”</span>
                        <span className="text-xs text-[color:var(--wiki-ink-muted)]">{lineNumber}줄</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-[color:var(--wiki-ink-soft)]">{lineContent || '(빈 줄)'}</p>
                      {result.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {result.suggestions.map((s) => (
                            <button key={s} type="button" className="wiki-editor__btn" onClick={() => applySuggestion(result, s)}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </div>
      )}

      {/* 저장 영역 */}
      {hasSaveBar && (
        <div className="wiki-editor__savebar">
          {onSummaryChange && (
            <label className="flex-1 min-w-0">
              <span className="sr-only">편집 요약</span>
              <input
                value={summary ?? ''}
                onChange={(e) => onSummaryChange(e.target.value)}
                placeholder="편집 요약 — 무엇을 바꿨나요? (선택)"
                maxLength={200}
                className="w-full px-3 py-2 text-sm"
              />
            </label>
          )}
          {onMinorEditChange && (
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm text-[color:var(--wiki-ink-soft)]" title="오타 수정처럼 내용에 큰 변화가 없는 편집">
              <input
                type="checkbox"
                checked={isMinorEdit}
                onChange={(e) => onMinorEditChange(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--wiki-accent)]"
              />
              사소한 편집
            </label>
          )}
          <div className="flex shrink-0 gap-2">
            {onCancel && (
              <button type="button" className="wiki-editor__btn" onClick={onCancel}>취소</button>
            )}
            {onSave && (
              <button
                type="button"
                className="wiki-editor__btn wiki-editor__btn--primary"
                onClick={handleSave}
                disabled={lockedByOther}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saveLabel || (isNewDocument ? '새 문서 만들기' : '저장')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
