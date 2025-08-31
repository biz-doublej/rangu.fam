'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Bold, Italic, List, Link, Image, Code, 
  Eye, EyeOff, Save, X, HelpCircle
} from 'lucide-react'
import { Button } from './Button'
import { Textarea } from './Input'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  initialContent?: string
  onSave?: (content: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
}

export function MarkdownEditor({
  initialContent = '',
  onSave,
  onCancel,
  placeholder = '위키 내용을 작성해주세요...',
  className
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isPreview, setIsPreview] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const toolbarButtons = [
    { icon: Bold, label: '굵게', markdown: '**텍스트**', shortcut: 'Ctrl+B' },
    { icon: Italic, label: '기울임', markdown: '*텍스트*', shortcut: 'Ctrl+I' },
    { icon: List, label: '목록', markdown: '- 항목', shortcut: '' },
    { icon: Link, label: '링크', markdown: '[텍스트](URL)', shortcut: 'Ctrl+K' },
    { icon: Image, label: '이미지', markdown: '![설명](이미지URL)', shortcut: '' },
    { icon: Code, label: '코드', markdown: '`코드`', shortcut: '' },
  ]

  const wikiSyntaxHelp = [
    { syntax: '# 제목', description: '대제목 (H1)' },
    { syntax: '## 부제목', description: '중제목 (H2)' },
    { syntax: '### 소제목', description: '소제목 (H3)' },
    { syntax: '**굵은 글씨**', description: '텍스트를 굵게' },
    { syntax: '*기울임 글씨*', description: '텍스트를 기울임' },
    { syntax: '- 목록 항목', description: '순서 없는 목록' },
    { syntax: '1. 번호 목록', description: '순서 있는 목록' },
    { syntax: '[링크 텍스트](URL)', description: '외부 링크' },
    { syntax: '[[페이지명]]', description: '내부 위키 링크' },
    { syntax: '`인라인 코드`', description: '인라인 코드' },
    { syntax: '```\n코드 블록\n```', description: '코드 블록' },
    { syntax: '> 인용문', description: '인용구' },
    { syntax: '---', description: '구분선' },
    { syntax: '![이미지](URL)', description: '이미지 삽입' },
  ]

  const insertMarkdown = (markdownSyntax: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let replacement = markdownSyntax
    if (selectedText && markdownSyntax.includes('텍스트')) {
      replacement = markdownSyntax.replace('텍스트', selectedText)
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end)
    setContent(newContent)

    // 커서 위치 조정
    setTimeout(() => {
      const newCursorPos = start + replacement.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 단축키 처리
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          insertMarkdown('**텍스트**')
          break
        case 'i':
          e.preventDefault()
          insertMarkdown('*텍스트*')
          break
        case 'k':
          e.preventDefault()
          insertMarkdown('[텍스트](URL)')
          break
        case 's':
          e.preventDefault()
          if (onSave) onSave(content)
          break
      }
    }
  }

  const renderPreview = () => {
    // 간단한 마크다운 프리뷰 (실제로는 react-markdown 사용)
    return (
      <div className="prose prose-sm max-w-none">
        <div className="bg-warm-50 p-4 rounded-lg border border-warm-200">
          <p className="text-sm text-gray-600 mb-2">미리보기 (실제 구현에서는 react-markdown 사용)</p>
          <div className="whitespace-pre-wrap text-gray-800">
            {content || '내용이 없습니다.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 툴바 */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {toolbarButtons.map((button, index) => (
              <motion.button
                key={index}
                className="p-2 rounded-lg glass-button hover:bg-primary-100 transition-colors"
                onClick={() => insertMarkdown(button.markdown)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={`${button.label} ${button.shortcut}`}
              >
                <button.icon className="w-4 h-4 text-gray-600" />
              </motion.button>
            ))}
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            <motion.button
              className={cn(
                'p-2 rounded-lg transition-colors',
                isPreview 
                  ? 'bg-primary-500 text-white' 
                  : 'glass-button hover:bg-primary-100'
              )}
              onClick={() => setIsPreview(!isPreview)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="미리보기 토글"
            >
              {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </motion.button>

            <motion.button
              className="p-2 rounded-lg glass-button hover:bg-primary-100 transition-colors"
              onClick={() => setShowHelp(!showHelp)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="도움말"
            >
              <HelpCircle className="w-4 h-4 text-gray-600" />
            </motion.button>
          </div>

          <div className="flex items-center space-x-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                취소
              </Button>
            )}
            {onSave && (
              <Button variant="primary" size="sm" onClick={() => onSave(content)}>
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            )}
          </div>
        </div>

        {/* 도움말 패널 */}
        {showHelp && (
          <motion.div
            className="mb-4 p-4 bg-primary-50 rounded-lg border border-primary-200"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4 className="font-semibold text-primary-700 mb-3">위키 문법 도움말</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wikiSyntaxHelp.map((help, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <code className="bg-white px-2 py-1 rounded text-sm font-mono text-primary-600 flex-shrink-0">
                    {help.syntax}
                  </code>
                  <span className="text-sm text-gray-600">{help.description}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-primary-200">
              <p className="text-xs text-gray-500">
                💡 팁: Ctrl+B (굵게), Ctrl+I (기울임), Ctrl+K (링크), Ctrl+S (저장) 단축키를 사용할 수 있습니다.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* 에디터/프리뷰 영역 */}
      <div className="glass-card overflow-hidden">
        {isPreview ? (
          <div className="p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-700">미리보기</h3>
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setIsPreview(false)}
              >
                편집으로 돌아가기
              </Button>
            </div>
            {renderPreview()}
          </div>
        ) : (
          <div className="p-6">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={20}
              className="w-full min-h-[400px] font-mono text-sm"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>마크다운 문법을 사용하여 작성하세요</span>
              <span>{content.length} 글자</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 