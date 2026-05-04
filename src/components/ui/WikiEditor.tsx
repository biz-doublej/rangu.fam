'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Bold, Italic, Underline, Strikethrough, Link, 
  Image as ImageIcon, Code, Quote, List, ListOrdered, 
  Heading1, Heading2, Heading3, Eye, EyeOff,
  Save, Undo, Redo, HelpCircle, Palette,
  Plus, Minus, Hash, Type, Link2, FileText, 
  User, Users, Bookmark, Layout, AlignLeft, AlignCenter, AlignRight,
  Table, TableProperties, Columns, Menu, ChevronDown, ChevronRight,
  Superscript, Subscript, CheckCircle, X, PaintBucket, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import NamuWikiRenderer from './NamuWikiRenderer'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { 
  COLOR_PICKER_PALETTE, 
  generateTableColorSyntax, 
  normalizeColor, 
  isValidHexColor 
} from '@/lib/tableColors'

interface WikiEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  title?: string
  showPreview?: boolean
  className?: string
}

interface ToolbarButton {
  icon: React.ElementType
  label: string
  action: () => void
  shortcut?: string
}

const WIKI_EDITOR_PLACEHOLDER = `문서 내용을 작성하세요...

나무위키 문법을 사용할 수 있습니다:
- **굵게** 또는 '''굵게'''
- *기울임* 또는 ''기울임''
- ~~취소선~~ __밑줄__
- ^^상첨자^^ ,,하첨자,,
- [[내부 링크]] [링크텍스트](URL)
- [*1] 각주 (자동 번호: [*])
- {{{#ff0000 빨간 글씨}}} {{{+1 큰 글씨}}}
- !icon:{home} [!icon:{insta}](URL)
- ||<bgcolor:#ff0000> 색상 표 ||

단축키:
- Ctrl+B: 굵게, Ctrl+I: 기울임  
- Ctrl+S: 저장, Ctrl+Enter: 미리보기 토글"
`

export default function WikiEditor({ 
  content, 
  onChange, 
  onSave, 
  title = '문서 편집',
  showPreview: initialShowPreview = false,
  className = ''
}: WikiEditorProps) {
  const { wikiUser } = useWikiAuth()
  const [showPreview, setShowPreview] = useState(initialShowPreview)
  const [selectedText, setSelectedText] = useState('')
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isMinorEdit, setIsMinorEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tableOfContents, setTableOfContents] = useState<Array<{level: number, title: string, anchor: string}>>([])
  const [showTableTools, setShowTableTools] = useState(false)
  const [spellCheckResults, setSpellCheckResults] = useState<Array<{word: string, suggestions: string[], position: number}>>([])
  const [isSpellChecking, setIsSpellChecking] = useState(false)
  const [showSpellCheckResults, setShowSpellCheckResults] = useState(false)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [showTableColorPicker, setShowTableColorPicker] = useState(false)
  const [selectedTableColors, setSelectedTableColors] = useState<{
    backgroundColor?: string
    textColor?: string
    borderColor?: string
  }>({})
  const [customColor, setCustomColor] = useState('')
  const [highlightColor, setHighlightColor] = useState('#ffeb3b')
  const [formattingMessage, setFormattingMessage] = useState<string | null>(null)
  const highlightPresets = ['#ffeb3b', '#ffe082', '#ff8a80', '#80deea', '#b388ff', '#1de9b6']
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTableOfContents, setShowTableOfContents] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [editorHeight, setEditorHeight] = useState<'normal' | 'tall' | 'full'>('tall')

  // Document lock tracking
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockCheckInterval, setLockCheckInterval] = useState<NodeJS.Timeout | null>(null)

  const handleTextSelection = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = content.substring(start, end)
      
      setSelectedText(selected)
      setCursorPosition({ start, end })
    }
  }

  const insertText = (before: string, after: string = '', replaceSelected: boolean = true) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const scrollTop = textarea.scrollTop  // 현재 스크롤 위치 저장
    
    let newText: string
    let newCursorPos: number
    
    if (replaceSelected && selectedText) {
      newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
      newCursorPos = start + before.length + selectedText.length + after.length
    } else {
      newText = content.substring(0, start) + before + after + content.substring(end)
      newCursorPos = start + before.length
    }
    
    onChange(newText)
    
    // 렌더링 후 커서 위치와 스크롤 위치 복원
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        textareaRef.current.scrollTop = scrollTop  // 스크롤 위치 복원
      }
    }, 0)
  }

  // Enhanced image insertion logic: Allow images anywhere with smart positioning
  const canInsertImageHere = (): boolean => {
    // Allow image insertion anywhere - no restrictions
    return true
  }

  // Enhanced cursor-based image insertion
  const getImageInsertionInfo = (): { canInsert: boolean; insertionType: 'table' | 'template' | 'inline' | 'block'; position: number } => {
    const start = textareaRef.current?.selectionStart ?? 0
    const textUpToCursor = content.substring(0, start)
    const textFromCursor = content.substring(start)
    const currentLine = textUpToCursor.split('\n').pop() || ''
    
    // Check if cursor is in a table row
    if (currentLine.trim().startsWith('||') && currentLine.includes('||')) {
      return { canInsert: true, insertionType: 'table', position: start }
    }
    
    // Check if cursor is in a template (infobox, personinfobox, groupinfobox)
    const inInfobox = textUpToCursor.lastIndexOf('[[인포박스:') > textUpToCursor.lastIndexOf(']]')
    const inPersonInfobox = Math.max(
      textUpToCursor.lastIndexOf('{{인물정보상자'),
      textUpToCursor.lastIndexOf('{{그룹정보상자')
    ) > textUpToCursor.lastIndexOf('}}')
    
    if (inInfobox || inPersonInfobox) {
      return { canInsert: true, insertionType: 'template', position: start }
    }
    
    // Check if at start of line (good for block image)
    if (currentLine.trim() === '' || start === 0 || textUpToCursor.endsWith('\n')) {
      return { canInsert: true, insertionType: 'block', position: start }
    }
    
    // Default to inline insertion
    return { canInsert: true, insertionType: 'inline', position: start }
  }

  const insertAtLineStart = (prefix: string) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const scrollTop = textarea.scrollTop  // 현재 스크롤 위치 저장
    const lines = content.split('\n')
    const currentLineIndex = content.substring(0, start).split('\n').length - 1
    
    lines[currentLineIndex] = prefix + lines[currentLineIndex]
    const newContent = lines.join('\n')
    
    onChange(newContent)
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length)
        textareaRef.current.scrollTop = scrollTop  // 스크롤 위치 복원
      }
    }, 0)
  }

  const toolbarButtons: ToolbarButton[][] = [
    [
      { icon: Bold, label: '굵게', action: () => insertText("'''", "'''"), shortcut: 'Ctrl+B' },
      { icon: Italic, label: '기울임', action: () => insertText("''", "''"), shortcut: 'Ctrl+I' },
      { icon: Underline, label: '밑줄', action: () => insertText('__', '__') },
      { icon: Strikethrough, label: '취소선', action: () => insertText('~~', '~~') },
    ],
    [
      { icon: Heading1, label: '제목 1', action: () => insertAtLineStart('= ') },
      { icon: Heading2, label: '제목 2', action: () => insertAtLineStart('== ') },
      { icon: Heading3, label: '제목 3', action: () => insertAtLineStart('=== ') },
    ],
    [
      { icon: Link2, label: '내부 링크', action: () => insertText('[[', ']]') },
      { icon: Link, label: '외부 링크', action: () => insertText('[', '](https://)') },
      { icon: ImageIcon, label: '이미지', action: () => {
        const info = getImageInsertionInfo()
        if (info.insertionType === 'table') {
          insertText('[이미지:', ']')
        } else if (info.insertionType === 'template') {
          insertText('[이미지:', ']')
        } else if (info.insertionType === 'block') {
          insertText('[이미지:', ']\n', false)
        } else {
          insertText('[이미지:', ']')
        }
      } },
    ],
    [
      { icon: List, label: '불릿 목록', action: () => insertAtLineStart('* ') },
      { icon: ListOrdered, label: '번호 목록', action: () => insertAtLineStart('1. ') },
      { icon: Quote, label: '인용구', action: () => insertAtLineStart('> ') },
    ],
    [
      { icon: Code, label: '인라인 코드', action: () => insertText('`', '`') },
      { icon: Hash, label: '각주', action: () => insertText('[*', ']') },
      { icon: Palette, label: '색상 텍스트', action: () => insertText('{{{#ff0000 ', '}}}') },
    ],
    [
      { icon: AlertCircle, label: '콜아웃 (정보)', action: () => insertText('\n:::info\n', '\n:::\n', false) },
      { icon: AlertCircle, label: '콜아웃 (경고)', action: () => insertText('\n:::warn\n', '\n:::\n', false) },
      { icon: CheckCircle, label: '콜아웃 (성공)', action: () => insertText('\n:::success\n', '\n:::\n', false) },
      { icon: ChevronRight, label: '접기 블록', action: () => insertText('\n>>> 자세히 보기\n', '\n<<<\n', false) },
      { icon: Minus, label: '수평선', action: () => insertText('\n---\n', '', false) },
    ],
    [
      { icon: Superscript, label: '상첨자', action: () => insertSuperscript() },
      { icon: Subscript, label: '하첨자', action: () => insertSubscript() },
    ],
    [
      { icon: AlignLeft, label: '왼쪽 정렬', action: () => insertTableAlignment('left') },
      { icon: AlignCenter, label: '가운데 정렬', action: () => insertTableAlignment('center') },
      { icon: AlignRight, label: '오른쪽 정렬', action: () => insertTableAlignment('right') },
    ],
    [
      { icon: Menu, label: '목차 생성', action: () => generateTableOfContents() },
      { icon: Table, label: '표 삽입', action: () => setShowTableTools(!showTableTools) },
      { icon: Columns, label: '분류 태그', action: () => insertText('\n[[분류:', ']]') },
    ],
    [
      { icon: CheckCircle, label: isSpellChecking ? '검사 중...' : '맞춤법 검사', action: () => performSpellCheck() },
    ]
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          insertText("'''", "'''")
          break
        case 'i':
          e.preventDefault()
          insertText("''", "''")
          break
        case 's':
          e.preventDefault()
          onSave?.()
          break
        case 'Enter':
          e.preventDefault()
          setShowPreview(!showPreview)
          break
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      insertText('  ', '', false)
    }
  }

  // Enhanced upload and insert with smart positioning
  const uploadImageAndInsert = async (file: File) => {
    try {
      const maxSizeBytes = 1 * 1024 * 1024
      if (file.size > maxSizeBytes) {
        alert('이미지 크기는 최대 1MB까지 업로드할 수 있습니다.')
        return
      }

      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/wiki/files/upload', {
        method: 'POST',
        body: form,
        credentials: 'include'
      })
      const data = await res.json()
      if (!data.success || !data.url) {
        alert(data.error || '이미지 업로드 실패')
        return
      }
      const url = data.url as string
      insertImageAtCursorPosition(url)
    } catch (e) {
      alert('이미지 업로드 중 오류')
    }
  }

  // Smart image insertion based on cursor position
  const insertImageAtCursorPosition = (url: string) => {
    const info = getImageInsertionInfo()
    const start = info.position
    
    if (info.insertionType === 'table') {
      // Insert image directly in table cell
      insertText(`[이미지:${url}]`, '', false)
    } else if (info.insertionType === 'template') {
      // Check if we're in a specific field that supports images
      const { type, blockStart, blockEnd } = getCurrentBlockInfo()
      if (type && blockStart >= 0 && blockEnd > blockStart) {
        insertImageUrlIntoContext(url)
      } else {
        // Fallback to direct insertion
        insertText(`[이미지:${url}]`, '', false)
      }
    } else if (info.insertionType === 'block') {
      // Insert as block-level image
      insertText(`[이미지:${url}]\n`, '', false)
    } else {
      // 일반 본문 inline: 본문 렌더러(NamuWikiRenderer)는 [이미지:URL]을 line 단독일 때만
      // 매칭하므로, 항상 단독 라인이 되도록 앞뒤 줄바꿈 보장.
      insertText(`\n[이미지:${url}]\n`, '', false)
    }
  }

  const getCurrentBlockInfo = (): { type: 'infobox' | 'cardgrid' | 'personinfobox' | null; blockStart: number; blockEnd: number } => {
    const start = textareaRef.current?.selectionStart ?? 0
    const lastInfobox = content.lastIndexOf('[[인포박스:', start)
    const lastCard = content.lastIndexOf('[[카드그리드:', start)
    const lastPersonInfobox = Math.max(
      content.lastIndexOf('{{인물정보상자', start),
      content.lastIndexOf('{{그룹정보상자', start)
    )
    
    const blockStart = Math.max(lastInfobox, lastCard, lastPersonInfobox)
    if (blockStart < 0) return { type: null, blockStart: -1, blockEnd: -1 }
    
    let blockEnd: number
    let type: 'infobox' | 'cardgrid' | 'personinfobox'
    
    if (lastPersonInfobox === blockStart) {
      blockEnd = content.indexOf('}}', blockStart)
      type = 'personinfobox'
      return { type, blockStart, blockEnd: blockEnd < 0 ? content.length : blockEnd + 2 }
    } else {
      blockEnd = content.indexOf(']]', blockStart)
      type = lastInfobox > lastCard ? 'infobox' : 'cardgrid'
      return { type, blockStart, blockEnd: blockEnd < 0 ? content.length : blockEnd + 2 }
    }
  }

  const insertImageUrlIntoContext = (url: string) => {
    const { type, blockStart, blockEnd } = getCurrentBlockInfo()
    if (!type || blockStart < 0 || blockEnd <= blockStart) {
      // If not in a recognized block, just insert at cursor position
      insertText(`[이미지:${url}]`, '', false)
      return
    }
    const block = content.substring(blockStart, blockEnd)
    let updatedBlock = block
    if (type === 'infobox') {
      const hasImage = /\|\s*이미지\s*=/.test(block)
      if (hasImage) {
        updatedBlock = block.replace(/(\|\s*이미지\s*=)[^|\]]*/i, `$1 ${url} `)
      } else {
        updatedBlock = block.replace(/\]\]$/i, ` | 이미지=${url} ]]`)
      }
    } else if (type === 'personinfobox') {
      // 인물정보상자의 경우 이미지 필드가 있는지 확인하고 업데이트
      const hasImage = /\|\s*이미지\s*=/.test(block)
      if (hasImage) {
        updatedBlock = block.replace(/(\|\s*이미지\s*=)[^|}\n]*/i, `$1 ${url}`)
      } else {
        // 이미지 필드가 없으면 첫 번째 | 뒤에 추가
        const firstParamMatch = block.match(/(\{\{인물정보상자[^\n]*\n)/)
        if (firstParamMatch) {
          updatedBlock = block.replace(firstParamMatch[1], `${firstParamMatch[1]}| 이미지= ${url}\n`)
        }
      }
    } else if (type === 'cardgrid') {
      const m = block.match(/items\s*=\s*(\[[\s\S]*?\])/i)
      if (m) {
        try {
          const arr = JSON.parse(m[1]) as Array<any>
          if (arr.length === 0) arr.push({ title: '', image: url })
          else {
            // 커서 기준으로 첫 아이템에 이미지 설정(간단 규칙)
            arr[0] = { ...arr[0], image: url }
          }
          updatedBlock = block.replace(m[1], JSON.stringify(arr))
        } catch {
          updatedBlock = block
        }
      }
    }
    const newContent = content.substring(0, blockStart) + updatedBlock + content.substring(blockEnd)
    onChange(newContent)
  }

  // 목차 생성 함수
  const generateTableOfContents = useCallback(() => {
    const lines = content.split('\n')
    const toc: Array<{level: number, title: string, anchor: string}> = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      let level = 0
      let title = ''
      
      // 나무위키 스타일 헤딩 매칭
      const namuHeadingMatch = trimmed.match(/^(=+)\s*(.+?)\s*=+$/)
      if (namuHeadingMatch) {
        level = namuHeadingMatch[1].length
        title = namuHeadingMatch[2].trim()
      } else {
        // 마크다운 스타일 헤딩 매칭
        const markdownHeadingMatch = trimmed.match(/^(#+)\s*(.+)$/)
        if (markdownHeadingMatch) {
          level = markdownHeadingMatch[1].length
          title = markdownHeadingMatch[2].trim()
        }
      }
      
      if (level > 0 && title) {
        const anchor = title
          .toLowerCase()
          .replace(/[^\w\s가-힣]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        toc.push({ level, title, anchor })
      }
    }
    
    setTableOfContents(toc)
    setShowTableOfContents(true)
  }, [content])

  // 목차 삽입 함수
  const insertTableOfContents = () => {
    const tocText = `
[[목차]]

`
    insertText(tocText, '', false)
  }

  // 표 삽입 함수 (색상 지원)
  const insertTable = (rows: number = 3, cols: number = 3, colors?: {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
  }) => {
    let tableText = '\n'
    
    // 색상 속성 생성
    const colorSyntax = colors ? generateTableColorSyntax(colors) : ''
    
    // 헤더 행
    tableText += '|| '
    for (let i = 0; i < cols; i++) {
      const cellContent = colorSyntax ? `${colorSyntax}헤더${i + 1}` : `헤더${i + 1}`
      tableText += `${cellContent} || `
    }
    tableText += '\n'
    
    // 데이터 행들
    for (let r = 1; r < rows; r++) {
      tableText += '|| '
      for (let c = 0; c < cols; c++) {
        tableText += `데이터${r}-${c + 1} || `
      }
      tableText += '\n'
    }
    
    tableText += '\n'
    insertText(tableText, '', false)
    setShowTableTools(false) // 표 삽입 후 도구 패널 닫기
    setShowTableColorPicker(false) // 색상 선택기 닫기
  }

  // 색상 표 삽입 함수
  const insertColoredTable = (rows: number, cols: number) => {
    insertTable(rows, cols, selectedTableColors)
  }

  // 커스텀 색상 적용
  const applyCustomColor = (colorType: 'backgroundColor' | 'textColor' | 'borderColor') => {
    if (isValidHexColor(customColor)) {
      const normalizedColor = normalizeColor(customColor)
      setSelectedTableColors(prev => ({
        ...prev,
        [colorType]: normalizedColor
      }))
      setCustomColor('')
    } else {
      alert('올바른 RGB 색상 코드를 입력하세요. (예: #FF0000 또는 FF0000)')
    }
  }

  // 색상 초기화
  const resetTableColors = () => {
    setSelectedTableColors({})
  }

  // 표 정렬 기능
  const insertTableAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const scrollTop = textarea.scrollTop  // 현재 스크롤 위치 저장
    
    // 선택된 텍스트가 있는지 확인
    const selectedText = content.substring(start, end)
    if (!selectedText) {
      alert('정렬할 텍스트를 먼저 선택해주세요.')
      return
    }
    
    // 정렬 문법 적용
    let alignedText = ''
    switch (alignment) {
      case 'left':
        alignedText = `{{{<<${selectedText}}}}`
        break
      case 'center':
        alignedText = `{{{^${selectedText}}}}`
        break
      case 'right':
        alignedText = `{{{>>${selectedText}}}}`
        break
    }
    
    const newContent = content.substring(0, start) + alignedText + content.substring(end)
    onChange(newContent)
    
    // 커서 위치와 스크롤 위치 복원
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPos = start + alignedText.length
        textareaRef.current.setSelectionRange(newPos, newPos)
        textareaRef.current.scrollTop = scrollTop  // 스크롤 위치 복원
      }
    }, 0)
  }

  const insertSuperscript = () => {
    if (selectedText) {
      insertText('<sup>', '</sup>')
    } else {
      insertText('<sup>상첨자</sup>')
    }
  }

  const insertSubscript = () => {
    if (selectedText) {
      insertText('<sub>', '</sub>')
    } else {
      insertText('<sub>하첨자</sub>')
    }
  }

  const performSpellCheck = async () => {
    if (!content.trim()) {
      alert('맞춤법을 검사할 내용이 없습니다.')
      return
    }

    setIsSpellChecking(true)
    try {
      // 한국어 맞춤법 검사 API 호출
      const response = await fetch('/api/wiki/spell-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      })

      if (!response.ok) {
        throw new Error('맞춤법 검사 서비스에 연결할 수 없습니다.')
      }

      const data = await response.json()
      setSpellCheckResults(data.results || [])
      setShowSpellCheckResults(true)
    } catch (error) {
      console.error('맞춤법 검사 오류:', error)
      alert('맞춤법 검사 중 오류가 발생했습니다.')
    } finally {
      setIsSpellChecking(false)
    }
  }

  const applySpellCheckSuggestion = (originalWord: string, suggestion: string, position: number) => {
    const newContent = content.substring(0, position) + 
                      content.substring(position).replace(originalWord, suggestion)
    onChange(newContent)
    
    // 해당 결과를 제거
    setSpellCheckResults(prev => prev.filter(result => 
      !(result.word === originalWord && result.position === position)
    ))
  }

  // 텍스트 영역과 줄 번호 스크롤 동기화
  const handleTextareaScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // 위치를 줄 번호로 변환하고 해당 줄 내용도 반환하는 함수
  const getLineInfoFromPosition = (position: number): { lineNumber: number, lineContent: string, wordInLine: string } => {
    const textUpToPosition = content.substring(0, position)
    const lineNumber = textUpToPosition.split('\n').length
    const lines = content.split('\n')
    const lineContent = lines[lineNumber - 1] || ''
    
    // 해당 위치 주변의 단어 찾기
    const start = Math.max(0, position - 10)
    const end = Math.min(content.length, position + 10)
    const wordInLine = content.substring(start, end).trim()
    
    return { lineNumber, lineContent, wordInLine }
  }

  // 템플릿 데이터
  const templates = {
    personInfobox: {
      name: '인물정보상자 (완전판)',
      icon: User,
      template: `{{인물정보상자
|상단로고 = 
|상단제목 = 태릉고등학교 37기 학생회장
|상단부제목 = 재학 당시의 모습
|상단설명 = 촬영일 : 정재원
|이름 = 정재원
|영문명 = Jung Jae Won
|이미지 = /images/default-music-cover.jpg
|이미지설명 = Jung 'Jay' Jae-Won
|출생 = 2005년 7월 27일 (만 19세)
|출생지 = 🇰🇷 대한민국 서울특별시
|국적 = 🇰🇷 대한민국
|거주지 = 서울특별시 중구 목동
|소속 = 🔵 경북대학교 빅데이터학과<br/>🔴 태릉고등학교 부동창장<br/>🟢 2024.03.20 ~ (🔴 현 재)<br/>🟡 태릉고등학교 서기부장 ▼
|직업 = 대학생
|학력 = 태릉고등학교 부동창장<br/>2024.03.20 ~ (현 재)<br/>태릉고등학교 서기부장<br/>2022.04.08 ~ 2023.04.30<br/>한창초등학교 전학<br/>(2012 ~ 2014)<br/>원목초등학교 졸업<br/>(2014 ~ 2018)<br/>해룡중학교 졸업<br/>(2018 ~ 2021)<br/>태릉고등학교 졸업<br/>(2021 ~ 2024)<br/>경북대학교<sup>(빅데이터학과)</sup><br/>(2024 ~ )
|경력 = 전 태릉고등학교 중구 미디어팀<br/>전 FCA를 유스넘 축구부에서 선수단으로 활동한 적이 있다.<br/>전 태릉고등학교 3학년 학급 부회장<br/>전 태릉고등학교 3학년 학급 반장<br/>전 이랑가입원 운영진<br/>전 에스팀 이스쿨다운 6571<br/>현 태릉고등학교 3기 졸업회 부동창장
|본관 = 은평 정씨
|신체 = 186cm, INTJ-T
|별명 = 산업기능요원<sup>(예정)</sup><br/>(미정)
|종교 = 천주교
|서명 = (서명 이미지)
|링크 = 📸 인스타그램
}}

== 개요 ==
대한민국의 모델 겸 대학생이다.

[[태릉고등학교]]를 졸업했으며, 경북대학교 [[빅데이터학과]]에 재학하고 있다. 랑구 그룹의 창립자로, 랑구 그룹 멤버이다.

== 생애 ==
2005년 7월 27일 출생했다.

=== 친구관계 ===
친구들과의 관계에 대한 내용...

=== 취미 ===
여러 장르의 게임을 즐긴다...

== 학습 ==

=== 프로그래밍 ===
어느정도 하는 편이다. 주로 사용하는 프로그램은 [[비주얼 스튜디오]]로 보인다.
사용 가능한 언어는 [[PYTHON]], [[JAVASCRIPT]], [[HTML5]], [[CSS3]], [[PYCHARM]], [[SQLITE3]]

== 여담 ==

== 작품 목록 ==

[[카드그리드: items=[
  {
    "title": "Rangu.fam 웹사이트", 
    "image": "/images/default-music-cover.jpg",
    "description": "Next.js로 구축한 개인 포트폴리오",
    "date": "2024년"
  },
  {
    "title": "이랑위키",
    "description": "나무위키 스타일 개인 위키",
    "date": "2024년"
  }
]]]

[[분류:RANGU.FAM]]
[[분류:대학생]]`
    },
    groupInfobox: {
      name: '그룹정보상자',
      icon: Users,
      template: `{{그룹정보상자
|상단로고 = 
|상단제목 = Rangu.fam
|상단부제목 = 랑구닷팸
|그룹명 = Rangu.fam
|메인제목 = 랑구
|메인멤버 = R27 정재원, R7 정진규, R20 정민석, R17 강한울
|서브제목 = 랑구 객원
|서브멤버 = R1 이승찬, R10 윤의현
|설립일 = 2024년 3월
|본부 = 서울특별시
|설명 = 태릉고등학교 동창회 기반 그룹
}}

== 개요 ==
Rangu.fam은 태릉고등학교 동창들로 구성된 그룹이다.

== 멤버 ==

=== 메인 멤버 ===
* '''R27 정재원''' - 리더
* '''R7 정진규''' - 
* '''R20 정민석''' - 
* '''R17 강한울''' - 

=== 객원 멤버 ===
* '''R1 이승찬''' - 
* '''R10 윤의현''' - 

== 활동 ==

== 여담 ==

[[분류:RANGU.FAM]]
[[분류:그룹]]`
    },
    simpleInfobox: {
      name: '간단한 인포박스',
      icon: Bookmark,
      template: `[[인포박스: 제목=정재원 | 이미지=/images/default-music-cover.jpg | 본명=정재원 | 출생=2005년 7월 27일 | 국적=대한민국 | 신체=186cm | 학력=경북대학교 | 소속=빅데이터학과 | 직업=대학생 | 링크=인스타그램]]

== 개요 ==

== 활동 ==

== 여담 ==`
    },
    cardGrid: {
      name: '카드그리드',
      icon: Layout,
      template: `[[카드그리드: items=[
  {
    "title": "프로젝트 제목",
    "image": "/images/default-music-cover.jpg",
    "description": "프로젝트 설명",
    "date": "2024년"
  },
  {
    "title": "두 번째 프로젝트",
    "description": "다른 프로젝트 설명",
    "date": "2024년"
  }
]]]`
    },
    basicArticle: {
      name: '기본 문서 구조',
      icon: FileText,
      template: `= 문서 제목 =

== 개요 ==
문서의 개요를 작성하세요.

== 상세 내용 ==

=== 하위 제목 ===
상세한 내용을 작성하세요.

== 참고 ==
* [[관련 문서]]
* [외부 링크 https://example.com]

[[분류:분류명]]`
    }
  }

  const insertTemplate = (templateKey: keyof typeof templates) => {
    const template = templates[templateKey]
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    const newContent = content.substring(0, start) + template.template + content.substring(end)
    onChange(newContent)
    
    // 커서를 템플릿 시작 부분으로 이동
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, start + template.template.length)
      }
    }, 0)
    
    setShowTemplates(false)
  }

  const handlePickImage = () => fileInputRef.current?.click()
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadImageAndInsert(file)
    e.currentTarget.value = ''
  }

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      localStorage.setItem('wiki-editor-autosave', content)
    }, 30000)

    return () => clearInterval(autoSaveInterval)
  }, [content])

  // 내용이 변경될 때마다 목차 자동 업데이트
  useEffect(() => {
    if (showTableOfContents) {
      generateTableOfContents()
    }
  }, [content, showTableOfContents, generateTableOfContents])

  // 문서 편집 잠금 획득
  const acquireEditLock = useCallback(async (): Promise<boolean> => {
    if (!title || title === '문서 편집') return true
    
    try {
      const response = await fetch('/api/wiki/pages/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 잠금 획득 성공
        setIsLocked(true)
        setLockedBy(wikiUser?.username || null)
        return true
      } else {
        // 잠금 획득 실패 (다른 사용자가 편집 중)
        setIsLocked(true)
        setLockedBy(data.lockedBy || null)
        return false
      }
    } catch (error) {
      console.error('편집 잠금 획득 오류:', error)
      return false
    }
  }, [title, wikiUser?.username])

  // 문서 편집 잠금 해제
  const releaseEditLock = useCallback(async (): Promise<void> => {
    if (!title || title === '문서 편집') return
    
    try {
      await fetch(`/api/wiki/pages/lock?title=${encodeURIComponent(title)}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      // 상태 업데이트
      setIsLocked(false)
      setLockedBy(null)
    } catch (error) {
      console.error('편집 잠금 해제 오류:', error)
    }
  }, [title])

  // 문서 편집 잠금 상태 확인
  useEffect(() => {
    const checkEditLock = async () => {
      if (!title || title === '문서 편집') return
      
      try {
        const response = await fetch(`/api/wiki/pages/lock?title=${encodeURIComponent(title)}`)
        const data = await response.json()
        
        if (data.success) {
          setIsLocked(data.isLocked)
          setLockedBy(data.lockedBy)
        }
      } catch (error) {
        console.error('편집 잠금 상태 확인 오류:', error)
      }
    }
    
    // 초기 잠금 상태 확인
    checkEditLock()
    
    // 주기적으로 잠금 상태 확인 (30초마다)
    const interval = setInterval(checkEditLock, 30000)
    setLockCheckInterval(interval)
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [title, acquireEditLock, releaseEditLock])

  // 편집 잠금 획득 및 해제
  useEffect(() => {
    const handleLock = async () => {
      if (!title || title === '문서 편집') return
      
      // 편집 잠금 획득 시도
      const lockAcquired = await acquireEditLock()
      
      if (!lockAcquired) {
        // 잠금 획득 실패 시 사용자에게 알림
        console.warn('편집 잠금 획득 실패')
      }
    }
    
    handleLock()
    
    // 컴포넌트 언마운트 시 잠금 해제
    return () => {
      releaseEditLock()
    }
  }, [title, acquireEditLock, releaseEditLock])

  return (
    <div className={`wiki-editor ${className}`}>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
            <div className="flex items-center space-x-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePickImage}
                className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                title="사진 선택 후 커서 위치에 삽입"
              >
                <ImageIcon className="w-4 h-4" aria-hidden="true" />
                <span>사진 선택</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                title="템플릿 불러오기"
              >
                <FileText className="w-4 h-4" />
                <span>템플릿</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertTableOfContents}
                className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                title="목차 삽입"
              >
                <Menu className="w-4 h-4" />
                <span>목차</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEditorHeight(
                    editorHeight === 'normal' ? 'tall' : editorHeight === 'tall' ? 'full' : 'normal'
                  )
                }
                className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                title="편집창 크기 (보통 / 크게 / 전체)"
              >
                <Layout className="w-4 h-4" />
                <span>
                  {editorHeight === 'normal' ? '보통' : editorHeight === 'tall' ? '크게' : '전체'}
                </span>
              </Button>
              <Button
                variant={showPreview ? "primary" : "ghost"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center space-x-1 ${
                  showPreview
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPreview ? '편집모드' : '미리보기'}</span>
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  onClick={async () => {
                    // 편집 잠금 상태 확인
                    if (isLocked && lockedBy && lockedBy !== wikiUser?.username) {
                      alert(`${lockedBy}님이 편집 중인 문서입니다. 저장할 수 없습니다.`)
                      return
                    }
                    
                    // 편집 잠금 갱신
                    try {
                      const response = await fetch('/api/wiki/pages/lock', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ title })
                      })
                      
                      const data = await response.json()
                      
                      if (!data.success) {
                        console.warn('편집 잠금 갱신 실패:', data.error)
                      }
                    } catch (error) {
                      console.error('편집 잠금 갱신 오류:', error)
                    }
                    
                    onSave?.()
                  }}
                  className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 text-gray-200"
                >
                  <Save className="w-4 h-4" />
                  <span>저장</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {/* 편집 잠금 경고 메시지 */}
        {isLocked && lockedBy && lockedBy !== wikiUser?.username && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mx-4 mt-2">
            <div className="flex items-center text-red-400">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium">
                이 문서는 <span className="font-bold">{lockedBy}</span>님이 편집 중입니다.
              </span>
            </div>
          </div>
        )}
        <CardContent className="space-y-4">
          {/* 툴바 — 깔끔한 그룹 + 호버 라벨 */}
          <div className="border-b border-gray-700 pb-3">
            <div className="flex flex-wrap items-center gap-1 bg-gray-900/40 rounded-lg p-1.5 border border-gray-700/60">
              {toolbarButtons.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  <div className="flex items-center gap-0.5">
                    {group.map((button) => (
                      <motion.button
                        key={button.label}
                        className={`px-2.5 py-1.5 rounded-md transition-all relative group inline-flex items-center justify-center ${
                          button.label.includes('검사 중')
                            ? 'bg-gray-700 cursor-not-allowed opacity-60'
                            : 'hover:bg-gray-700/80 active:bg-gray-600 text-gray-400 hover:text-gray-100'
                        }`}
                        onClick={button.label.includes('검사 중') ? undefined : button.action}
                        whileHover={button.label.includes('검사 중') ? {} : { scale: 1.04 }}
                        whileTap={button.label.includes('검사 중') ? {} : { scale: 0.96 }}
                      >
                        <button.icon className="w-4 h-4" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black/90 text-white text-[11px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                          {button.label}
                          {button.shortcut && (
                            <span className="ml-1.5 text-gray-400">{button.shortcut}</span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  {groupIndex < toolbarButtons.length - 1 && (
                    <div className="w-px h-5 bg-gray-700 mx-0.5" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 마이너 편집 옵션 */}
          <div className="flex items-center gap-3 text-sm text-gray-300 py-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="accent-blue-500" 
                checked={isMinorEdit} 
                onChange={(e) => setIsMinorEdit(e.target.checked)} 
              />
              <span className="select-none">마이너 편집</span>
            </label>
            <div className="text-xs text-gray-400">
              (오타 수정, 문법 교정 등 내용에 큰 변화가 없는 편집)
            </div>
          </div>

          {/* 목차 표시 영역 */}
          {showTableOfContents && tableOfContents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">목차</h4>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={insertTableOfContents}
                    className="text-gray-400 hover:text-gray-200 text-xs"
                  >
                    문서에 삽입
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTableOfContents(false)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    닫기
                  </Button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {tableOfContents.map((item, index) => (
                  <div
                    key={index}
                    className={`py-1 px-2 text-sm text-gray-300 hover:bg-gray-700 rounded cursor-pointer`}
                    style={{ paddingLeft: `${8 + item.level * 12}px` }}
                    onClick={() => {
                      // 해당 제목으로 스크롤
                      const element = document.getElementById(item.anchor)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 표 도구 영역 */}
          {showTableTools && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4"
            >
              <h4 className="text-sm font-medium text-gray-300 mb-3">표 도구</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.button
                  onClick={() => insertTable(2, 2)}
                  className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Table className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-200">2×2 표</span>
                </motion.button>
                <motion.button
                  onClick={() => insertTable(3, 3)}
                  className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Table className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-200">3×3 표</span>
                </motion.button>
                <motion.button
                  onClick={() => insertTable(4, 4)}
                  className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Table className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-200">4×4 표</span>
                </motion.button>
                <motion.button
                  onClick={() => insertTable(5, 3)}
                  className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Table className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-200">5×3 표</span>
                </motion.button>
              </div>
              
              {/* 표 색상 선택 영역 */}
              <div className="mt-4 border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-300">표 색상 설정</h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTableColorPicker(!showTableColorPicker)}
                    className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
                  >
                    <PaintBucket className="w-4 h-4" />
                    <span>{showTableColorPicker ? '숨기기' : '색상 선택'}</span>
                  </Button>
                </div>
                
                {showTableColorPicker && (
                  <div className="space-y-4">
                    {/* 미리 정의된 색상 팔레트 */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">미리 정의된 색상:</p>
                      <div className="grid grid-cols-6 gap-2">
                        {COLOR_PICKER_PALETTE.map((colorItem, index) => (
                          <button
                            key={index}
                            className="w-8 h-8 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
                            style={{ backgroundColor: colorItem.value }}
                            title={colorItem.name}
                            onClick={() => setSelectedTableColors(prev => ({
                              ...prev,
                              backgroundColor: colorItem.value
                            }))}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* 커스텀 색상 입력 */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">커스텀 RGB 색상 (예: #FF0000 또는 FF0000):</p>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          placeholder="#FF0000"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <Button
                          size="sm"
                          onClick={() => applyCustomColor('backgroundColor')}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3"
                          disabled={!customColor.trim()}
                        >
                          배경 적용
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => applyCustomColor('textColor')}
                          className="bg-green-600 hover:bg-green-500 text-white px-3"
                          disabled={!customColor.trim()}
                        >
                          글자 적용
                        </Button>
                      </div>
                    </div>
                    
                    {/* 선택된 색상 미리보기 */}
                    {(selectedTableColors.backgroundColor || selectedTableColors.textColor) && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">선택된 색상 미리보기:</p>
                        <div 
                          className="p-3 rounded border border-gray-600 text-center"
                          style={{
                            backgroundColor: selectedTableColors.backgroundColor || 'transparent',
                            color: selectedTableColors.textColor || '#e5e7eb'
                          }}
                        >
                          샘플 표 셀 텍스트
                        </div>
                        <div className="flex justify-between mt-2">
                          <div className="text-xs text-gray-400">
                            {selectedTableColors.backgroundColor && `배경: ${selectedTableColors.backgroundColor}`}
                            {selectedTableColors.backgroundColor && selectedTableColors.textColor && ' | '}
                            {selectedTableColors.textColor && `글자: ${selectedTableColors.textColor}`}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={resetTableColors}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            초기화
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* 색상 표 생성 버튼 */}
                    {(selectedTableColors.backgroundColor || selectedTableColors.textColor) && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">색상이 적용된 표 생성:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Button
                            size="sm"
                            onClick={() => insertColoredTable(2, 2)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                          >
                            2×2 색상 표
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => insertColoredTable(3, 3)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                          >
                            3×3 색상 표
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => insertColoredTable(4, 4)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                          >
                            4×4 색상 표
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => insertColoredTable(5, 3)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                          >
                            5×3 색상 표
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTableTools(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  닫기
                </Button>
              </div>
            </motion.div>
          )}

          {/* 템플릿 선택 영역 */}
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4"
            >
              <h4 className="text-sm font-medium text-gray-300 mb-3">템플릿 선택</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(templates).map(([key, template]) => (
                  <motion.button
                    key={key}
                    onClick={() => insertTemplate(key as keyof typeof templates)}
                    className="flex flex-col items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <template.icon className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-200">{template.name}</span>
                    <span className="text-xs text-gray-400 mt-1 text-center">
                      {key === 'personInfobox' && '구글 문서와 동일한 복잡한 구조'}
                      {key === 'groupInfobox' && '여러 표로 나뉘는 그룹/팀 구조'}
                      {key === 'simpleInfobox' && '기존 호환 버전'}
                      {key === 'cardGrid' && '작품/프로젝트 목록'}
                      {key === 'basicArticle' && '일반 문서 구조'}
                    </span>
                  </motion.button>
                ))}
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  닫기
                </Button>
              </div>
            </motion.div>
          )}

                    {showPreview ? (
            /* 미리보기 모드: 편집창 + 미리보기 */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="hidden lg:block">
                <div className="relative">
                  <div className={`flex border border-gray-600 rounded-lg bg-gray-900 ${editorHeight === 'normal' ? 'h-96' : editorHeight === 'tall' ? 'h-[640px]' : 'h-[80vh]'}`}>
                    {/* 줄 번호 표시 영역 */}
                    <div 
                      ref={lineNumbersRef}
                      className="flex-shrink-0 bg-gray-800 border-r border-gray-600 p-2 font-mono text-sm text-gray-500 min-w-[50px] overflow-hidden"
                    >
                      {content.split('\n').map((_, index) => (
                        <div key={index} className="text-right pr-2 leading-5 select-none h-5">
                          {index + 1}
                        </div>
                      ))}
                    </div>
                    
                    {/* 텍스트 입력 영역 */}
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => onChange(e.target.value)}
                      onSelect={handleTextSelection}
                      onKeyDown={handleKeyDown}
                      onScroll={handleTextareaScroll}
                      className="flex-1 p-4 font-mono text-sm resize-none bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none leading-5"
                      style={{ lineHeight: '1.25rem' }}
                      placeholder={WIKI_EDITOR_PLACEHOLDER}
                    />
                  </div>
                  
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    {content.length.toLocaleString()} 글자 | {content.split('\n').length} 줄
                  </div>
                </div>
              </div>

              <div>
                <div className={`border border-gray-600 rounded-lg p-4 overflow-y-auto bg-gray-900 ${editorHeight === 'normal' ? 'h-96' : editorHeight === 'tall' ? 'h-[640px]' : 'h-[80vh]'}`}>
                  <h4 className="text-sm font-medium text-gray-400 mb-4 border-b border-gray-600 pb-2">
                    미리보기
                  </h4>
                  <div className="image-render-stable">
                    <NamuWikiRenderer
                      content={content || '*편집 영역에 내용을 입력하면 여기에 미리보기가 표시됩니다.*'}
                      generateTableOfContents={true}
                      isPreview
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 편집 모드: 편집창만 풀사이즈 */
            <div className="w-full">
              <div className="relative">
                <div className="flex border border-gray-600 rounded-lg bg-gray-900 h-96">
                  {/* 줄 번호 표시 영역 */}
                  <div 
                    ref={lineNumbersRef}
                    className="flex-shrink-0 bg-gray-800 border-r border-gray-600 p-2 font-mono text-sm text-gray-500 min-w-[50px] overflow-hidden"
                  >
                    {content.split('\n').map((_, index) => (
                      <div key={index} className="text-right pr-2 leading-5 select-none h-5">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                  
                  {/* 텍스트 입력 영역 */}
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onSelect={handleTextSelection}
                    onKeyDown={handleKeyDown}
                    onScroll={handleTextareaScroll}
                    className="flex-1 p-4 font-mono text-sm resize-none bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none leading-5"
                    style={{ lineHeight: '1.25rem' }}
                    placeholder={WIKI_EDITOR_PLACEHOLDER}
                  />
                </div>
                
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {content.length.toLocaleString()} 글자 | {content.split('\n').length} 줄
                </div>
              </div>
            </div>
          )}

          {/* 도움말 토글 버튼 */}
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800/60 hover:bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:text-gray-100 transition-colors"
              title={showHelp ? '도움말 숨기기' : '문법 도움말 펼치기'}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHelp ? '도움말 숨기기' : '문법 도움말'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showHelp && (
          <div className="mt-3 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-400 w-full">
                <h4 className="font-medium mb-2 text-gray-300">편집 도움말</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-medium mb-1 text-gray-300">기본 서식:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">**굵게**</code> 또는 <code className="bg-gray-700 px-1 rounded">{"'''굵게'''"}</code> → <strong>굵게</strong></li>
                      <li><code className="bg-gray-700 px-1 rounded">*기울임*</code> 또는 <code className="bg-gray-700 px-1 rounded">{"''기울임''"}</code> → <em>기울임</em></li>
                      <li><code className="bg-gray-700 px-1 rounded">~~취소선~~</code> → <del>취소선</del></li>
                      <li><code className="bg-gray-700 px-1 rounded">__밑줄__</code> → <u>밑줄</u></li>
                      <li><code className="bg-gray-700 px-1 rounded">^^상첨자^^</code> → x<sup>2</sup></li>
                      <li><code className="bg-gray-700 px-1 rounded">,,하첨자,,</code> → H<sub>2</sub>O</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-300">링크와 참조:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">[[내부링크]]</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">[링크텍스트](URL)</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">[*1]</code> 또는 <code className="bg-gray-700 px-1 rounded">[*]</code> → 각주</li>
                      <li><code className="bg-gray-700 px-1 rounded">`코드`</code> → 인라인 코드</li>
                      <li><code className="bg-gray-700 px-1 rounded">!icon:{`{home}`}</code> → 아이콘</li>
                      <li><code className="bg-gray-700 px-1 rounded">[!icon:{`{insta}`}](URL)</code> → 아이콘 링크</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-300">고급 기능:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">[[목차]]</code> → 목차 삽입</li>
                      <li><code className="bg-gray-700 px-1 rounded">|| 셀1 || 셀2 ||</code> → 표</li>
                      <li><code className="bg-gray-700 px-1 rounded">{`||<bgcolor:#ff0000> 셀 ||`}</code> → 색상 표 (헤더만)</li>
                      <li><code className="bg-gray-700 px-1 rounded">{`{{{#ff0000 빨간글씨}}}`}</code> → 색상 텍스트</li>
                      <li><code className="bg-gray-700 px-1 rounded">{`{{{+1 큰글씨}}}`}</code> → 크기 조절</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-300">편집 기능:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><strong>미리보기:</strong> 실시간 렌더링 확인</li>
                      <li><strong>각주 자동 번호:</strong> [*]로 순서 자동 배정</li>
                      <li><strong>각주 클릭 이동:</strong> 각주↔본문 이동</li>
                      <li><strong>맞춤법 검사:</strong> 한국어 오타 검출</li>
                      <li><strong>Ctrl+Enter:</strong> 미리보기 토글</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-300">표 색상 문법:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">{`||<bgcolor:#ff0000> 빨간 배경 ||`}</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">{`||<color:#ffffff> 흰 글자 ||`}</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">{`||<bgcolor:#ff0000 color:#fff> 조합 ||`}</code></li>
                      <li><strong>색상 도구:</strong> 표 삽입 시 색상 선택기 이용</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-300">템플릿:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><strong>인물정보상자:</strong> 동적 이미지 표시</li>
                      <li><strong>그룹정보상자:</strong> 색상 속성 지원</li>
                      <li><strong>카드그리드:</strong> 프로젝트 목록</li>
                      <li><strong>간단 인포박스:</strong> 기본 정보</li>
                      <li>템플릿 버튼으로 쉽게 삽입</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-emerald-300">새 기능 (2026):</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">{':::info\\n본문\\n:::'}</code> → 정보 박스</li>
                      <li><code className="bg-gray-700 px-1 rounded">{':::warn'}</code> / <code className="bg-gray-700 px-1 rounded">{':::success'}</code> / <code className="bg-gray-700 px-1 rounded">{':::error'}</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">{':::note'}</code> / <code className="bg-gray-700 px-1 rounded">{':::tip'}</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">{'>>> 제목\\n내용\\n<<<'}</code> → 접기 블록</li>
                      <li><code className="bg-gray-700 px-1 rounded">---</code> → 수평선</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-blue-300">각주 (개선):</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">[*]</code> 자동 번호 / <code className="bg-gray-700 px-1 rounded">[*1]</code> 수동</li>
                      <li>본문 [N] 클릭 → 각주 영역 점프 + 깜빡임</li>
                      <li>각주의 <strong>↑[N]</strong> 클릭 → 본문 위치로 복귀</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* 맞춤법 검사 결과 */}
          {showSpellCheckResults && (
            <div className="mt-4 p-4 border border-red-600 rounded-lg bg-red-900/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-red-400 flex items-center">
                  맞춤법 검사 결과
                  {isSpellChecking && (
                    <div className="ml-2 w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpellCheckResults(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </Button>
              </div>
              
              {spellCheckResults.length === 0 ? (
                <p className="text-green-400">맞춤법 오류가 발견되지 않았습니다!</p>
              ) : (
                <div className="space-y-2">
                  {spellCheckResults.map((result, index) => {
                    const lineInfo = getLineInfoFromPosition(result.position)
                    const actualWordExists = lineInfo.lineContent.includes(result.word)
                    
                    // 실제로 단어가 없는 경우 건너뛰기
                    if (!actualWordExists) {
                      return null
                    }
                    
                    return (
                      <div key={index} className="p-3 bg-gray-800 rounded border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 font-medium">&quot;{result.word}&quot;</span>
                          <span className="text-xs text-gray-400">{lineInfo.lineNumber}줄</span>
                        </div>
                        
                        {/* 해당 줄 내용 표시 */}
                        <div className="mb-2 p-2 bg-gray-700 rounded text-xs">
                          <span className="text-gray-500">{lineInfo.lineNumber}줄: </span>
                          <span className="text-gray-300 font-mono">
                            {lineInfo.lineContent.length > 60 
                              ? lineInfo.lineContent.substring(0, 60) + '...' 
                              : lineInfo.lineContent || '(빈 줄)'}
                          </span>
                        </div>
                        
                        {result.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400 mb-1">제안:</p>
                            <div className="flex flex-wrap gap-1">
                              {result.suggestions.map((suggestion, suggestionIndex) => (
                                <Button
                                  key={suggestionIndex}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => applySpellCheckSuggestion(result.word, suggestion, result.position)}
                                  className="text-xs bg-blue-600 hover:bg-blue-500 border border-blue-500"
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }).filter(Boolean)}
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
} 
