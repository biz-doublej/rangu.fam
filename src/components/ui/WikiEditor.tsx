'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bold, Italic, Underline, Strikethrough, Link, 
  Image, Code, Quote, List, ListOrdered, 
  Heading1, Heading2, Heading3, Eye, EyeOff,
  Save, Undo, Redo, HelpCircle, Palette,
  Plus, Minus, Hash, Type, Link2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import NamuWikiRenderer from './NamuWikiRenderer'

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

export default function WikiEditor({ 
  content, 
  onChange, 
  onSave, 
  title = '문서 편집',
  showPreview: initialShowPreview = false,
  className = ''
}: WikiEditorProps) {
  const [showPreview, setShowPreview] = useState(initialShowPreview)
  const [selectedText, setSelectedText] = useState('')
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const insertAtLineStart = (prefix: string) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const lines = content.split('\n')
    const currentLineIndex = content.substring(0, start).split('\n').length - 1
    
    lines[currentLineIndex] = prefix + lines[currentLineIndex]
    const newContent = lines.join('\n')
    
    onChange(newContent)
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length)
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
      { icon: Link, label: '외부 링크', action: () => insertText('[', ']') },
      { icon: Image, label: '이미지', action: () => insertText('[이미지:', ']') },
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

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      localStorage.setItem('wiki-editor-autosave', content)
    }, 30000)

    return () => clearInterval(autoSaveInterval)
  }, [content])

  return (
    <div className={`wiki-editor ${className}`}>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-1 text-gray-400 hover:text-gray-200"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPreview ? '편집' : '미리보기'}</span>
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  onClick={onSave}
                  className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 text-gray-200"
                >
                  <Save className="w-4 h-4" />
                  <span>저장</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b border-gray-600 pb-4">
            <div className="flex flex-wrap gap-2">
              {toolbarButtons.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  {group.map((button) => (
                    <motion.button
                      key={button.label}
                      className="p-2 rounded hover:bg-gray-700 transition-colors relative group"
                      onClick={button.action}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <button.icon className="w-4 h-4 text-gray-400" />
                      
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {button.label}
                        {button.shortcut && (
                          <span className="ml-2 text-gray-400">({button.shortcut})</span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                  {groupIndex < toolbarButtons.length - 1 && (
                    <div className="w-px bg-gray-600 mx-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={showPreview ? 'hidden lg:block' : ''}>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => onChange(e.target.value)}
                  onSelect={handleTextSelection}
                  onKeyDown={handleKeyDown}
                  className="w-full h-96 p-4 border border-gray-600 rounded-lg font-mono text-sm resize-y bg-gray-900 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="문서 내용을 작성하세요...

나무위키 문법을 사용할 수 있습니다:
- '''굵게''' 또는 **굵게**
- ''기울임'' 또는 *기울임*
- [[내부 링크]]
- [외부링크 https://example.com]
- {{{#ff0000 빨간 글씨}}}
- [*1] 각주
- :::info 정보 박스

단축키:
- Ctrl+B: 굵게
- Ctrl+I: 기울임  
- Ctrl+S: 저장
- Ctrl+Enter: 미리보기 토글"
                />
                
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {content.length.toLocaleString()} 글자
                </div>
              </div>
            </div>

            <div className={showPreview ? '' : 'hidden lg:block'}>
              <div className="border border-gray-600 rounded-lg p-4 h-96 overflow-y-auto bg-gray-900">
                <h4 className="text-sm font-medium text-gray-400 mb-4 border-b border-gray-600 pb-2">
                  미리보기
                </h4>
                <NamuWikiRenderer
                  content={content || '*편집 영역에 내용을 입력하면 여기에 미리보기가 표시됩니다.*'}
                  generateTableOfContents={false}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-400">
                <h4 className="font-medium mb-2 text-gray-300">편집 도움말</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium mb-1 text-gray-300">기본 서식:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">'''굵게'''</code> → <strong>굵게</strong></li>
                      <li><code className="bg-gray-700 px-1 rounded">''기울임''</code> → <em>기울임</em></li>
                      <li><code className="bg-gray-700 px-1 rounded">~~취소선~~</code> → <del>취소선</del></li>
                      <li><code className="bg-gray-700 px-1 rounded">__밑줄__</code> → <u>밑줄</u></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-300">링크와 참조:</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li><code className="bg-gray-700 px-1 rounded">[[내부링크]]</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">[외부링크 URL]</code></li>
                      <li><code className="bg-gray-700 px-1 rounded">[*1]</code> → 각주</li>
                      <li><code className="bg-gray-700 px-1 rounded">{`{{{#색상 텍스트}}}`}</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 