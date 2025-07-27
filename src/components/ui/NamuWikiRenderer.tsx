'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, ArrowUpRight, Quote, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react'

interface NamuWikiRendererProps {
  content: string
  generateTableOfContents?: boolean
  onLinkClick?: (link: string) => void
}

interface TableOfContentsItem {
  level: number
  title: string
  anchor: string
}

export default function NamuWikiRenderer({ content, generateTableOfContents = false, onLinkClick }: NamuWikiRendererProps) {
  const [toc, setToc] = useState<TableOfContentsItem[]>([])
  const [footnotes, setFootnotes] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (generateTableOfContents) {
      generateTOC(content)
    }
    extractFootnotes(content)
  }, [content, generateTableOfContents])

  const generateTOC = (text: string) => {
    const headings: TableOfContentsItem[] = []
    const lines = text.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      let level = 0
      let title = ''
      
      const namuHeadingMatch = trimmed.match(/^(=+)\s*(.+?)\s*=+$/)
      if (namuHeadingMatch) {
        level = namuHeadingMatch[1].length
        title = namuHeadingMatch[2].trim()
      } else {
        const markdownHeadingMatch = trimmed.match(/^(#+)\s*(.+)$/)
        if (markdownHeadingMatch) {
          level = markdownHeadingMatch[1].length
          title = markdownHeadingMatch[2].trim()
        }
      }
      
      if (level > 0 && title) {
        const anchor = title.toLowerCase()
          .replace(/[^\w\s가-힣]/g, '')
          .replace(/\s+/g, '-')
        
        headings.push({ level, title, anchor })
      }
    }
    
    setToc(headings)
  }

  const extractFootnotes = (text: string) => {
    const footnoteMap: {[key: string]: string} = {}
    
    const footnoteDefRegex = /\[\*(\d+)\]\s*([^\n]+)/g
    let match
    
    while ((match = footnoteDefRegex.exec(text)) !== null) {
      footnoteMap[match[1]] = match[2].trim()
    }
    
    setFootnotes(footnoteMap)
  }

  const parseContent = (text: string): React.ReactNode => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let listStack: Array<{ type: 'ul' | 'ol', level: number }> = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      if (!trimmed) {
        elements.push(<br key={i} />)
        continue
      }
      
      const headingMatch = trimmed.match(/^(=+)\s*(.+?)\s*=+$/) || trimmed.match(/^(#+)\s*(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        const anchor = title.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '-')
        
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
        elements.push(
          <HeadingTag key={i} id={anchor} className={`
            font-bold mb-4 mt-6 text-gray-200
            ${level === 1 ? 'text-3xl border-b-2 border-gray-600 pb-2' : ''}
            ${level === 2 ? 'text-2xl' : ''}
            ${level === 3 ? 'text-xl' : ''}
            ${level >= 4 ? 'text-lg' : ''}
          `}>
            {parseInlineElements(title)}
          </HeadingTag>
        )
        continue
      }
      
      const listMatch = trimmed.match(/^(\s*)([*-]|\d+\.)\s+(.+)$/)
      if (listMatch) {
        const indent = listMatch[1].length
        const marker = listMatch[2]
        const content = listMatch[3]
        const level = Math.floor(indent / 2)
        const isOrdered = /\d+\./.test(marker)
        
        while (listStack.length > level + 1) {
          listStack.pop()
        }
        
        if (listStack.length === level) {
          listStack.push({ type: isOrdered ? 'ol' : 'ul', level })
        }
        
        elements.push(
          <li key={i} className="mb-1 text-gray-300" style={{ marginLeft: `${level * 20}px` }}>
            {parseInlineElements(content)}
          </li>
        )
        continue
      }
      
      if (trimmed.startsWith('>')) {
        const quoteContent = trimmed.substring(1).trim()
        elements.push(
          <blockquote key={i} className="border-l-4 border-gray-600 pl-4 py-2 my-4 bg-gray-800 italic text-gray-400">
            <Quote className="w-4 h-4 inline mr-2 text-gray-500" />
            {parseInlineElements(quoteContent)}
          </blockquote>
        )
        continue
      }
      
      if (trimmed.startsWith(':::')) {
        const boxMatch = trimmed.match(/^:::(\w+)\s*(.*)$/)
        if (boxMatch) {
          const boxType = boxMatch[1]
          const boxContent = boxMatch[2]
          
          let boxClass = ''
          let icon = <Info className="w-5 h-5" />
          
          switch (boxType) {
            case 'info':
              boxClass = 'bg-gray-800 border-gray-600 text-gray-300'
              icon = <Info className="w-5 h-5 text-blue-400" />
              break
            case 'warning':
              boxClass = 'bg-gray-800 border-gray-600 text-gray-300'
              icon = <AlertCircle className="w-5 h-5 text-yellow-400" />
              break
            case 'danger':
              boxClass = 'bg-gray-800 border-gray-600 text-gray-300'
              icon = <XCircle className="w-5 h-5 text-red-400" />
              break
            case 'success':
              boxClass = 'bg-gray-800 border-gray-600 text-gray-300'
              icon = <CheckCircle className="w-5 h-5 text-green-400" />
              break
            default:
              boxClass = 'bg-gray-800 border-gray-600 text-gray-300'
          }
          
          elements.push(
            <div key={i} className={`border rounded-lg p-4 my-4 ${boxClass}`}>
              <div className="flex items-start space-x-2">
                {icon}
                <div className="flex-1">
                  {parseInlineElements(boxContent)}
                </div>
              </div>
            </div>
          )
          continue
        }
      }
      
      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={i} className="my-6 border-gray-600" />)
        continue
      }
      
      elements.push(
        <p key={i} className="mb-4 leading-relaxed text-gray-300">
          {parseInlineElements(line)}
        </p>
      )
    }
    
    return elements
  }

  const parseInlineElements = (text: string): React.ReactNode => {
    let result: React.ReactNode[] = []
    let currentIndex = 0
    
    const patterns = [
      { regex: /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, type: 'internal-link' },
      { regex: /\[([^\s\]]+)(\s+([^\]]+))?\]/g, type: 'external-link' },
      { regex: /\[\*(\d+)\]/g, type: 'footnote' },
      { regex: /'''([^']+)'''|\*\*([^*]+)\*\*/g, type: 'bold' },
      { regex: /''([^']+)''|\*([^*]+)\*/g, type: 'italic' },
      { regex: /~~([^~]+)~~/g, type: 'strikethrough' },
      { regex: /__([^_]+)__/g, type: 'underline' },
      { regex: /\{\{\{#([a-fA-F0-9]{3,6})\s+([^}]+)\}\}\}/g, type: 'colored-text' },
      { regex: /\{\{\{([+-]\d+)\s+([^}]+)\}\}\}/g, type: 'sized-text' },
      { regex: /`([^`]+)`/g, type: 'code' }
    ]
    
    while (currentIndex < text.length) {
      let nearestMatch: { index: number, length: number, type: string, groups: RegExpMatchArray } | null = null
      
      for (const pattern of patterns) {
        pattern.regex.lastIndex = currentIndex
        const match = pattern.regex.exec(text)
        
        if (match && (nearestMatch === null || match.index < nearestMatch.index)) {
          nearestMatch = {
            index: match.index,
            length: match[0].length,
            type: pattern.type,
            groups: match
          }
        }
      }
      
      if (nearestMatch) {
        if (nearestMatch.index > currentIndex) {
          result.push(text.substring(currentIndex, nearestMatch.index))
        }
        
        const element = renderInlineElement(nearestMatch.type, nearestMatch.groups)
        result.push(element)
        
        currentIndex = nearestMatch.index + nearestMatch.length
      } else {
        result.push(text.substring(currentIndex))
        break
      }
    }
    
    return result.map((item, index) => 
      typeof item === 'string' ? 
        <span key={index}>{item}</span> : 
        React.cloneElement(item as React.ReactElement, { key: index })
    )
  }

  const renderInlineElement = (type: string, groups: RegExpMatchArray): React.ReactElement => {
    switch (type) {
      case 'internal-link':
        const linkTarget = groups[1]
        const linkText = groups[3] || linkTarget
        return (
          <button
            className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
            onClick={() => onLinkClick?.(linkTarget)}
          >
            {linkText}
          </button>
        )
        
      case 'external-link':
        const url = groups[1]
        const urlText = groups[3] || url
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center"
          >
            {urlText}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        )
        
      case 'footnote':
        const footnoteNum = groups[1]
        const footnoteText = footnotes[footnoteNum] || ''
        return (
          <sup
            className="text-blue-400 hover:text-blue-300 cursor-help text-xs"
            title={footnoteText}
          >
            [{footnoteNum}]
          </sup>
        )
        
      case 'bold':
        const boldText = groups[1] || groups[2]
        return <strong className="font-bold text-gray-200">{boldText}</strong>
        
      case 'italic':
        const italicText = groups[1] || groups[2]
        return <em className="italic text-gray-300">{italicText}</em>
        
      case 'strikethrough':
        return <del className="line-through text-gray-400">{groups[1]}</del>
        
      case 'underline':
        return <u className="underline text-gray-300">{groups[1]}</u>
        
      case 'colored-text':
        const color = groups[1]
        const coloredText = groups[2]
        return (
          <span style={{ color: `#${color}` }} className="font-medium">
            {coloredText}
          </span>
        )
        
      case 'sized-text':
        const sizeModifier = parseInt(groups[1])
        const sizedText = groups[2]
        const fontSize = sizeModifier > 0 ? `${1 + sizeModifier * 0.2}em` : `${1 + sizeModifier * 0.1}em`
        return (
          <span style={{ fontSize }} className="font-medium text-gray-300">
            {sizedText}
          </span>
        )
        
      case 'code':
        return (
          <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
            {groups[1]}
          </code>
        )
        
      default:
        return <span>{groups[0]}</span>
    }
  }

  return (
    <div className="namu-wiki-content text-gray-300">
      {generateTableOfContents && toc.length > 0 && (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <h3 className="font-bold text-lg mb-3 text-gray-200">목차</h3>
          <ul className="space-y-1">
            {toc.map((item, index) => (
              <li key={index} style={{ marginLeft: `${(item.level - 1) * 20}px` }}>
                <a
                  href={`#${item.anchor}`}
                  className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="prose prose-lg max-w-none prose-invert">
        {parseContent(content)}
      </div>
      
      {Object.keys(footnotes).length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-600">
          <h3 className="font-bold text-lg mb-4 text-gray-200">각주</h3>
          <div className="space-y-2">
            {Object.entries(footnotes).map(([num, text]) => (
              <div key={num} className="text-sm text-gray-400">
                <sup className="text-blue-400 mr-2">[{num}]</sup>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 