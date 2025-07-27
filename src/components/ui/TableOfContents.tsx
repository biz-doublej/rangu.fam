'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { List, ChevronRight, ChevronDown } from 'lucide-react'
import { WikiTableOfContents } from '@/types'

interface TableOfContentsProps {
  content: string
  isFixed?: boolean
  className?: string
}

interface TocItem {
  id: string
  title: string
  level: number
  anchor: string
  children: TocItem[]
}

// 헤딩에서 앵커 생성
function generateAnchor(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// 마크다운 콘텐츠에서 목차 추출
function extractTableOfContents(content: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: { level: number; title: string; anchor: string }[] = []
  
  let match
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const title = match[2].trim()
    const anchor = generateAnchor(title)
    
    headings.push({ level, title, anchor })
  }
  
  // 계층 구조 생성
  const toc: TocItem[] = []
  const stack: TocItem[] = []
  
  headings.forEach((heading, index) => {
    const item: TocItem = {
      id: `toc-${index}`,
      title: heading.title,
      level: heading.level,
      anchor: heading.anchor,
      children: []
    }
    
    // 스택에서 현재 레벨보다 높은 항목들 제거
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }
    
    if (stack.length === 0) {
      // 루트 레벨
      toc.push(item)
    } else {
      // 하위 레벨
      stack[stack.length - 1].children.push(item)
    }
    
    stack.push(item)
  })
  
  return toc
}

// 목차 아이템 컴포넌트
const TocItemComponent = ({ 
  item, 
  activeId, 
  onItemClick,
  level = 0 
}: { 
  item: TocItem
  activeId: string
  onItemClick: (anchor: string) => void
  level?: number
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = item.children.length > 0
  const isActive = activeId === item.anchor
  
  const handleClick = () => {
    onItemClick(item.anchor)
  }
  
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }
  
  return (
    <div className="toc-item">
      <motion.div
        className={`
          flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors group
          ${isActive ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-100'}
          ${level > 0 ? 'ml-' + (level * 4) : ''}
        `}
        onClick={handleClick}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.2 }}
      >
        {hasChildren && (
          <button
            onClick={toggleExpanded}
            className="mr-1 p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        
        <span 
          className={`
            text-sm leading-5 truncate
            ${item.level === 1 ? 'font-semibold' : ''}
            ${item.level === 2 ? 'font-medium' : ''}
            ${item.level >= 3 ? 'text-gray-600' : ''}
          `}
          style={{ paddingLeft: hasChildren ? 0 : '20px' }}
        >
          {item.title}
        </span>
      </motion.div>
      
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children.map((child) => (
              <TocItemComponent
                key={child.id}
                item={child}
                activeId={activeId}
                onItemClick={onItemClick}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TableOfContents({ 
  content, 
  isFixed = false, 
  className = '' 
}: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // 목차 생성
  useEffect(() => {
    const extractedToc = extractTableOfContents(content)
    setToc(extractedToc)
  }, [content])
  
  // 현재 활성 섹션 추적
  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const scrollY = window.scrollY + 100 // 100px offset
      
      let current = ''
      
      headings.forEach((heading) => {
        const element = heading as HTMLElement
        if (element.offsetTop <= scrollY) {
          current = element.id
        }
      })
      
      setActiveId(current)
    }
    
    window.addEventListener('scroll', handleScroll)
    handleScroll() // 초기 설정
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const handleItemClick = (anchor: string) => {
    const element = document.getElementById(anchor)
    if (element) {
      const yOffset = -80 // 헤더 높이 고려
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      })
    }
  }
  
  if (toc.length === 0) {
    return null
  }
  
  return (
    <motion.div
      className={`
        bg-white border border-gray-200 rounded-lg shadow-sm
        ${isFixed ? 'sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto' : ''}
        ${className}
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <List className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-primary-700">목차</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* 목차 내용 */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="p-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-1">
              {toc.map((item) => (
                <TocItemComponent
                  key={item.id}
                  item={item}
                  activeId={activeId}
                  onItemClick={handleItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 스크롤 상단 이동 버튼 */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-full text-xs text-gray-500 hover:text-primary-600 transition-colors"
          >
            ↑ 맨 위로
          </button>
        </div>
      )}
    </motion.div>
  )
} 