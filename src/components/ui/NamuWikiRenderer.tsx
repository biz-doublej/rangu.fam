/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import 'highlight.js/styles/github-dark.css'
import { motion } from 'framer-motion'
import { ExternalLink, ArrowUpRight, Quote, AlertCircle, Info, CheckCircle, XCircle, Star } from 'lucide-react'
import { WikiIcon, parseIconSyntax } from './WikiIcon'
import { parseTableColorAttributes, getTableCellStyles, normalizeColor } from '@/lib/tableColors'

const registerHighlightLanguages = (() => {
  let registered = false
  return () => {
    if (registered) return
    hljs.registerLanguage('javascript', javascript)
    hljs.registerLanguage('js', javascript)
    hljs.registerLanguage('typescript', typescript)
    hljs.registerLanguage('ts', typescript)
    hljs.registerLanguage('python', python)
    hljs.registerLanguage('py', python)
    hljs.registerLanguage('bash', bash)
    hljs.registerLanguage('shell', bash)
    hljs.registerLanguage('json', json)
    hljs.registerLanguage('css', css)
    hljs.registerLanguage('html', xml)
    hljs.registerLanguage('xml', xml)
    hljs.registerLanguage('yaml', yaml)
    hljs.registerLanguage('yml', yaml)
    registered = true
  }
})()

interface NamuWikiRendererProps {
  content: string
  generateTableOfContents?: boolean
  onLinkClick?: (link: string) => void
  isPreview?: boolean
}

interface TableOfContentsItem {
  level: number
  title: string
  anchor: string
}

// 역할 배너 매핑
const ROLE_BANNERS: Record<string, { title: string; desc: string; color: string; icon: typeof Info }> = {
  developer: {
    title: '이랑위키 개발자',
    desc: '이 사람은 이랑위키의 개발자 입니다.',
    color: 'from-emerald-500/20 via-emerald-400/15 to-emerald-600/20',
    icon: Info
  },
  admin: {
    title: '이랑위키 운영자',
    desc: '이 사람은 이랑위키 운영자 입니다.',
    color: 'from-sky-500/20 via-sky-400/15 to-indigo-600/20',
    icon: AlertCircle
  },
  rangu: {
    title: '랑구팸 멤버',
    desc: '이 사람은 랑구팸 입니다.',
    color: 'from-amber-500/20 via-orange-400/15 to-rose-500/20',
    icon: Star
  },
  workshop: {
    title: '작업공작소 운영자',
    desc: '이 사람은 작업공작소 운영자 입니다.',
    color: 'from-purple-500/20 via-fuchsia-400/15 to-blue-500/20',
    icon: CheckCircle
  }
}


// 간단한 인라인 파서 (위키 내부 링크 전용)
function renderInlineLinks(value: string): React.ReactNode {
  if (typeof value !== 'string') return value
  const parts: React.ReactNode[] = []
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = wikiLinkRegex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(value.slice(lastIndex, match.index))
    }
    const linkContent = match[1]
    const [page, display] = linkContent.split('|')
    const href = `/wiki/${encodeURIComponent(page.trim())}`
    parts.push(
      <a
        key={`${page}-${match.index}`}
        href={href}
        className="text-blue-300 hover:text-blue-100 underline"
      >
        {display?.trim() || page.trim()}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex))
  }

  return <>{parts}</>
}

const RoleBanner = ({ role }: { role: string }) => {
  const banner = ROLE_BANNERS[role]
  if (!banner) return null
  const Icon = banner.icon

  // rangu 전용 추가 메타
  const ranguMeta = role === 'rangu'
    ? [
        { label: '그룹명', value: '랑구' },
        { label: '메인제목', value: 'Rang-Gu' },
        { label: '메인멤버', value: 'R27 [[정재원]], R7 [[정진규]], R20 [[정민석]], R17 [[강한울]], R1 [[이승찬]]' },
        { label: '서브제목', value: '랑구 객원' },
      ]
    : []

  return (
    <motion.div
      className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 text-white shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${banner.color} opacity-80`} />
      <div className="relative flex items-start gap-3">
        <div className="mt-1">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-white/80">Role</p>
          <h4 className="text-lg font-semibold">{banner.title}</h4>
          <p className="text-sm text-white/85">{banner.desc}</p>
        </div>
      </div>

      {ranguMeta.length > 0 && (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 text-sm divide-y divide-white/10 sm:divide-y-0 sm:divide-x">
            {ranguMeta.map((item) => (
              <div key={item.label} className="flex min-h-[64px]">
                <div className="w-28 flex-shrink-0 bg-white/5 px-3 py-2 text-white/70 text-xs uppercase tracking-[0.14em] flex items-center">
                  {item.label}
                </div>
                <div className="flex-1 px-4 py-2 text-white leading-relaxed">
                  {renderInlineLinks(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function NamuWikiRenderer({ content, generateTableOfContents = false, onLinkClick, isPreview = false }: NamuWikiRendererProps): JSX.Element {
  const [toc, setToc] = useState<TableOfContentsItem[]>([])
  const [footnotes, setFootnotes] = useState<{[key: string]: string}>({})
  const footnoteCounterRef = React.useRef(0)
  const footnoteMappingRef = React.useRef<{[key: string]: number}>({})
  const PLACEHOLDER_IMAGE = '/images/default-music-cover.jpg'

  // 컨텐츠가 변경될 때 각주 카운터 리셋
  React.useEffect(() => {
    footnoteCounterRef.current = 0
    footnoteMappingRef.current = {}
    extractFootnotes(content)
  }, [content])

  function toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function renderHtml(html: string) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  // 템플릿 색상 속성 파싱 함수
  function parseTemplateColorAttributes(colorAttribs?: string): {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
  } {
    const result: {
      backgroundColor?: string
      textColor?: string
      borderColor?: string
    } = {}
    
    if (!colorAttribs) return result
    
    // 색상 속성 매칭: <bgcolor:#color>, <color:#color>, <border:#color>
    const colorAttributePattern = /<(bgcolor|color|border):(#?[^>\s]+)>/g
    let match
    
    while ((match = colorAttributePattern.exec(colorAttribs)) !== null) {
      const [, attribute, colorValue] = match
      const normalizedColor = normalizeColor(colorValue.trim())
      
      if (normalizedColor) {
        switch (attribute) {
          case 'bgcolor':
            result.backgroundColor = normalizedColor
            break
          case 'color':
            result.textColor = normalizedColor
            break
          case 'border':
            result.borderColor = normalizedColor
            break
        }
      }
    }
    
    return result
  }

  function parseTemplateParams(block: string): Record<string, string> {
    const params: Record<string, string> = {}
    const bLines = block.split('\n')
    let currentKey = ''
    let currentValue = ''
    
    for (const ln of bLines) {
      const m = ln.match(/^\s*\|?\s*([^=]+?)\s*=\s*(.*?)\s*$/)
      if (m) {
        // 이전 키-값 쌍이 있으면 저장
        if (currentKey) {
          params[currentKey] = currentValue.trim()
        }
        // 새로운 키-값 쌍 시작
        currentKey = m[1].trim()
        currentValue = m[2].trim()
      } else if (currentKey && ln.trim()) {
        // 기존 값에 줄바꿈 추가 (연속된 라인)
        if (currentValue) {
          currentValue += '\n' + ln.trim()
        } else {
          currentValue = ln.trim()
        }
      }
    }
    
    // 마지막 키-값 쌍 저장
    if (currentKey) {
      params[currentKey] = currentValue.trim()
    }
    
    return params
  }

  function parseTemplateParamsOrdered(block: string): Array<[string, string]> {
    const params: Array<[string, string]> = []
    const bLines = block.split('\n')
    let currentKey = ''
    let currentValue = ''
    
    for (const ln of bLines) {
      const m = ln.match(/^\s*\|?\s*([^=]+?)\s*=\s*(.*?)\s*$/)
      if (m) {
        // 이전 키-값 쌍이 있으면 저장
        if (currentKey && currentValue.trim()) {
          params.push([currentKey, currentValue.trim()])
        }
        // 새로운 키-값 쌍 시작
        currentKey = m[1].trim()
        currentValue = m[2].trim()
      } else if (currentKey && ln.trim()) {
        // 기존 값에 줄바꿈 추가 (연속된 라인)
        if (currentValue) {
          currentValue += '\n' + ln.trim()
        } else {
          currentValue = ln.trim()
        }
      }
    }
    
    // 마지막 키-값 쌍 저장
    if (currentKey && currentValue.trim()) {
      params.push([currentKey, currentValue.trim()])
    }
    
    return params
  }

  function parseInlineElements(text: string): React.ReactNode {
    if (typeof text !== 'string') {
      return text
    }
    
    // 하이퍼링크를 최우선으로 처리하는 패턴들
    const patterns = [
      // 1. 마크다운 하이퍼링크 [텍스트](URL) - 최우선 처리
        {
          regex: /\[([^\]]+)\]\(([^)]+)\)/g,
          render: (match: RegExpMatchArray, key: number) => {
            const [, linkText, url] = match
            const isExternal = url.startsWith('http') || url.startsWith('//')
            
            // 링크 텍스트에서 아이콘 문법 파싱
            const parsedLinkContent = parseIconSyntax(linkText)
            const hasIcons = parsedLinkContent.some(part => typeof part !== 'string')
            
            // 아이콘만 있는 경우 (텍스트가 아이콘 문법만 포함)
            const isIconOnly = linkText.trim().startsWith('!icon:') && parsedLinkContent.length === 1 && typeof parsedLinkContent[0] !== 'string'
            
            return (
              <a 
                key={key} 
                href={url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={`text-blue-400 hover:text-blue-300 ${isIconOnly ? '' : 'underline'} inline-flex items-center gap-1 whitespace-nowrap`}
                style={{ display: 'inline-flex', alignItems: 'center' }}
                onClick={(e) => {
                  if (onLinkClick && !isExternal) {
                    e.preventDefault()
                    onLinkClick(url)
                  }
                }}
              >
                {hasIcons ? parsedLinkContent.map((part, idx) => (
                  <React.Fragment key={idx}>{part}</React.Fragment>
                )) : linkText}
                {isExternal && !isIconOnly && <ExternalLink size={12} />}
              </a>
            )
          }
        },
        // 2. 위키 링크 [[페이지|표시텍스트]]
        {
          regex: /\[\[([^\]]+)\]\]/g,
          render: (match: RegExpMatchArray, key: number) => {
            const linkContent = match[1]
            const [page, display] = linkContent.split('|')
            const displayText = display?.trim() || page.trim()
            
            // 표시 텍스트에서 아이콘 문법 파싱
            const parsedDisplayContent = parseIconSyntax(displayText)
            const hasIcons = parsedDisplayContent.some(part => typeof part !== 'string')
            
            // 아이콘만 있는 경우
            const isIconOnly = displayText.trim().startsWith('!icon:') && parsedDisplayContent.length === 1 && typeof parsedDisplayContent[0] !== 'string'
            
            return (
              <a 
                key={key} 
                href={`#${page.trim()}`} 
                className={`text-blue-400 hover:text-blue-300 ${isIconOnly ? '' : 'underline'} inline-flex items-center gap-1 whitespace-nowrap`}
                style={{ display: 'inline-flex', alignItems: 'center' }}
                onClick={(e) => {
                  e.preventDefault()
                  onLinkClick?.(page.trim())
                }}
              >
                {hasIcons ? parsedDisplayContent.map((part, idx) => (
                  <React.Fragment key={idx}>{part}</React.Fragment>
                )) : displayText}
              </a>
            )
          }
        },
        // 5. 상첨자 ^^텍스트^^
        {
          regex: /\^\^([^^]+)\^\^/g,
          render: (match: RegExpMatchArray, key: number) => (
            <sup key={key} className="text-xs text-gray-300">{match[1]}</sup>
          )
        },
        // 6. 하첨자 ,,텍스트,,
        {
          regex: /,,([^,]+),,/g,
          render: (match: RegExpMatchArray, key: number) => (
            <sub key={key} className="text-xs text-gray-300">{match[1]}</sub>
          )
        },
        // 7. 각주 참조 [*숫자] 또는 [*]
        {
          regex: /\[\*(\d*)\]/g,
          render: (match: RegExpMatchArray, key: number) => {
            const footnoteKey = match[1] || 'auto'
            let footnoteNumber: number
            
            // 키 정규화 및 매핑 로직 개선
            if (footnoteKey === 'auto' || footnoteKey === '') {
              // 자동 번호 배정 - 고유 키 생성
              footnoteCounterRef.current += 1
              footnoteNumber = footnoteCounterRef.current
              const uniqueAutoKey = `auto_ref_${footnoteCounterRef.current}_${key}`
              footnoteMappingRef.current[uniqueAutoKey] = footnoteNumber
              console.log(`자동 각주 생성: ${uniqueAutoKey} = ${footnoteNumber}`)
            } else {
              // 수동 번호 지정
              if (!footnoteMappingRef.current[footnoteKey]) {
                footnoteCounterRef.current += 1
                footnoteNumber = footnoteCounterRef.current
                footnoteMappingRef.current[footnoteKey] = footnoteNumber
                console.log(`수동 각주 생성: ${footnoteKey} = ${footnoteNumber}`)
              } else {
                footnoteNumber = footnoteMappingRef.current[footnoteKey]
                console.log(`기존 각주 참조: ${footnoteKey} = ${footnoteNumber}`)
              }
            }
            
            const scrollToFootnote = () => {
              const footnoteElement = document.getElementById(`footnote-${footnoteNumber}`)
              if (footnoteElement) {
                footnoteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                footnoteElement.style.backgroundColor = '#fef3c7'
                setTimeout(() => {
                  footnoteElement.style.backgroundColor = ''
                }, 2000)
              }
            }
            
            return (
              <sup 
                key={key} 
                className="text-blue-400 hover:text-blue-300 cursor-pointer text-xs underline"
                onClick={scrollToFootnote}
                title={`각주 ${footnoteNumber}로 이동`}
              >
                [{footnoteNumber}]
              </sup>
            )
          }
        },
        // 8. 굵은 글씨 '''텍스트'''
        {
          regex: /'''([^']+?)'''/g,
          render: (match: RegExpMatchArray, key: number) => renderInlineElement('bold', match)
        },
        // 9. 이탤릭 ''텍스트''
        {
          regex: /''([^']+?)''/g,
          render: (match: RegExpMatchArray, key: number) => renderInlineElement('italic', match)
        },
        // 8. 인라인 코드 ```텍스트``` (라인 내부)
        {
          regex: /```([^`]+)```/g,
          render: (match: RegExpMatchArray, key: number) => (
            <code key={key} className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
              {match[1]}
            </code>
          )
        },
        // 9. 인라인 코드 ``텍스트`` (라인 내부)
        {
          regex: /``([^`]+)``/g,
          render: (match: RegExpMatchArray, key: number) => (
            <code key={key} className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
              {match[1]}
            </code>
          )
        },
        // 10. 굵게 '''텍스트''' (나무위키 스타일)
        {
          regex: /(?<!')'''([^']+?)'''/g,
          render: (match: RegExpMatchArray, key: number) => renderInlineElement('bold', match)
        },
        // 11. 굵게 **텍스트** (마크다운)
        {
          regex: /(?<!\*)\*\*(?!\s)(.+?)(?<!\s)\*\*(?!\*)/g,
          render: (match: RegExpMatchArray, key: number) => renderInlineElement('bold', match)
        },
        // 12. 이탤릭 ''텍스트'' (나무위키 스타일)
        {
          regex: /(?<!')''([^'`]+?)''(?!')/g,
          render: (match: RegExpMatchArray, key: number) => renderInlineElement('italic', match)
        },
        // 13. 이탤릭 *텍스트* (마크다운)
        {
          regex: /(?<![\*`])\*(?!\s)(.+?)(?<!\s)\*(?![\*`])/g,
          render: (match: RegExpMatchArray, key: number) => renderInlineElement('italic', match)
        },
        // 14. 취소선 ~~텍스트~~
        {
          regex: /~~([^~]+)~~/g,
          render: (match: RegExpMatchArray, key: number) => (
            <del key={key} className="line-through text-gray-400">{match[1]}</del>
          )
        },
        // 13. 밑줄 __텍스트__
        {
          regex: /__([^_]+)__/g,
          render: (match: RegExpMatchArray, key: number) => (
            <u key={key} className="underline text-gray-300">{match[1]}</u>
          )
        },
        // 14. 색상 텍스트 {{{#색상 텍스트}}}
        {
          regex: /\{\{\{#([a-fA-F0-9]{6}|[a-zA-Z]+)\s+([^}]+)\}\}\}/g,
          render: (match: RegExpMatchArray, key: number) => {
            const [, color, text] = match
            const cssColor = /^[a-fA-F0-9]{6}$/.test(color) ? `#${color}` : color
            return (
              <span key={key} style={{ color: cssColor }} className="font-medium">
                {text}
              </span>
            )
          }
        },
        // 15. 큰 텍스트 {{{+숫자 텍스트}}}
        {
          regex: /\{\{\{\+(\d+)\s+([^}]+)\}\}\}/g,
          render: (match: RegExpMatchArray, key: number) => {
            const [, sizeNum, text] = match
            const size = parseInt(sizeNum)
            return (
              <span key={key} className={`font-bold ${size >= 2 ? 'text-xl' : 'text-lg'} text-gray-100`}>
                {text}
              </span>
            )
          }
        },
        // 16. 작은 텍스트 {{{-숫자 텍스트}}}
        {
          regex: /\{\{\{-(\d+)\s+([^}]+)\}\}\}/g,
          render: (match: RegExpMatchArray, key: number) => (
            <span key={key} className="text-sm text-gray-400">{match[2]}</span>
          )
        },
        // 17. 인라인 코드 `코드`
        {
          regex: /`([^`]+)`/g,
          render: (match: RegExpMatchArray, key: number) => (
            <code key={key} className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
              {match[1]}
            </code>
          )
        },
        // 18. 아이콘 !icon:{name} - 단독 아이콘 처리
        {
          regex: /!icon:\{([^}]+)\}/g,
          render: (match: RegExpMatchArray, key: number) => {
            const iconParams = match[1]
            const [name, ...options] = iconParams.split(',').map(s => s.trim())
            
            // Parse options
            let size = 16
            let className = ''
            let color = undefined
            
            options.forEach(option => {
              if (option.startsWith('size:')) {
                size = parseInt(option.split(':')[1]) || 16
              } else if (option.startsWith('class:')) {
                className = option.split(':')[1] || ''
              } else if (option.startsWith('color:')) {
                color = option.split(':')[1] || undefined
              }
            })
            
            return (
              <WikiIcon 
                key={key}
                name={name} 
                size={size}
                className={className}
                color={color}
              />
            )
          }
        },
        // 19. URL 자동 링크
        {
          regex: /(https?:\/\/[^\s]+)/g,
          render: (match: RegExpMatchArray, key: number) => (
            <a 
              key={key} 
              href={match[1]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
            >
              {match[1]}
              <ExternalLink size={12} />
            </a>
          )
        }
      ]
    
    // 모든 패턴의 매치들을 찾아서 위치순으로 정렬
    const matches: Array<{ index: number; length: number; element: React.ReactNode; patternIndex: number }> = []
    patterns.forEach((pattern, patternIndex) => {
      let match
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          element: pattern.render(match, matches.length),
          patternIndex
        })
      }
    })
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index)
    
    // 겹치는 매치 제거 (앞선 매치 우선)
    const filteredMatches = []
    let lastEnd = 0
    for (const match of matches) {
      if (match.index >= lastEnd) {
        filteredMatches.push(match)
        lastEnd = match.index + match.length
      }
    }
    
    // 텍스트와 요소들을 순서대로 조합
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    filteredMatches.forEach((match, idx) => {
      // 매치 이전의 일반 텍스트 추가
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index)
        if (beforeText) {
          elements.push(beforeText)
        }
      }
      // 매치된 요소 추가
      elements.push(match.element)
      lastIndex = match.index + match.length
    })
    
    // 마지막 남은 텍스트 추가
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      if (remainingText) {
        elements.push(remainingText)
      }
    }
    
    if (elements.length === 0) return text
    return elements.map((el, idx) => (
      <React.Fragment key={`inline-${idx}`}>{el}</React.Fragment>
    ))
  }

  function renderGroupInfoboxElement(params: Record<string, string>, orderedParams: Array<[string, string]>, key: React.Key, colorAttribs?: string) {
    const templateColors = parseTemplateColorAttributes(colorAttribs)
    const templateStyle: React.CSSProperties = {}
    
    if (templateColors.backgroundColor) {
      templateStyle.backgroundColor = templateColors.backgroundColor
    }
    if (templateColors.textColor) {
      templateStyle.color = templateColors.textColor
    }
    if (templateColors.borderColor) {
      templateStyle.borderColor = templateColors.borderColor
    }
    
    // 기존 코드에서 복사
    return (
      <React.Fragment key={key}>
        <div className="group-infobox bg-gray-900 border border-gray-700 rounded-lg shadow-lg float-right ml-6 mb-4 w-full max-w-[340px]" style={templateStyle}>
          <div className="bg-blue-700 text-white text-center py-2 px-3">
            <div className="text-base font-bold mt-2">{params['이름'] || params['그룹명'] || ''}</div>
            {params['설명'] && <div className="text-xs opacity-80 mt-1">{params['설명']}</div>}
          </div>
          <div className="border-t border-gray-700">
            <table className="w-full text-sm">
              <tbody>
                {orderedParams.map(([key, value], index) => {
                  // Parse color attributes from template values
                  const colorAttributes = parseTableColorAttributes(value)
                  
                  // 헤더 셀(key)에만 색상 적용, 값 셀은 기본 배경 유지
                  const headerCellStyles = getTableCellStyles(colorAttributes)
                  const defaultHeaderStyle = { backgroundColor: '#1e40af', color: '#ffffff' } // bg-blue-700
                  const finalHeaderStyle = {
                    ...defaultHeaderStyle,
                    ...headerCellStyles
                  }
                  
                  return (
                    <tr key={index} className="border-b border-gray-700">
                      <td 
                        className="px-3 py-2 font-semibold w-24 align-top"
                        style={finalHeaderStyle}
                      >
                        {key}
                      </td>
                      <td className="px-3 py-2 text-gray-200 whitespace-pre-line bg-gray-800">
                        {parseInlineElements(colorAttributes.content)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ clear: 'both' }} />
      </React.Fragment>
    )
  }

  const generateTOC = useCallback((text: string) => {
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
        const anchor = toSlug(title)
        headings.push({ level, title, anchor })
      }
    }
    
    setToc(headings)
  }, [])

  useEffect(() => {
    if (generateTableOfContents) {
      generateTOC(content)
    }
    extractFootnotes(content)
  }, [content, generateTableOfContents, generateTOC])

  const extractFootnotes = (text: string) => {
    const footnoteMap: {[key: string]: string} = {}
    
    // 1. 독립된 라인에서 각주 정의 찾기
    const lines = text.split('\n')
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim()
      // 라인 전체가 각주 정의인 경우만 처리
      const match = trimmed.match(/^\[\*(\d*)\]\s*(.+)$/)
      if (match) {
        const key = match[1] || `auto_${lineIndex}` // auto 키에 고유성 부여
        const content = match[2].trim()
        
        // 내용이 실제로 있고, 또 다른 각주 참조가 아닌 경우
        if (content && content.length > 0 && !content.match(/^\[\*/)) {
          footnoteMap[key] = content
          console.log(`독립 라인 각주 추가: ${key} = ${content}`)
        }
      }
    })
    
    // 2. 인라인 각주 정의 찾기 (문장 중간의 [*1] 각주내용 또는 [*] 각주내용)
    const inlineFootnoteRegex = /\[\*(\d*)\]\s+([^[\n\r]+)/g
    let match
    let autoInlineCounter = 0
    while ((match = inlineFootnoteRegex.exec(text)) !== null) {
      const rawKey = match[1]
      const key = rawKey || `auto_inline_${autoInlineCounter++}` // auto 키에 고유성 부여
      const content = match[2].trim()
      
      // 의미있는 내용이 있는 경우만 각주로 인식
      if (content && content.length > 0 && !content.match(/^\[\*/)) {
        footnoteMap[key] = content
        console.log(`인라인 각주 추가: ${key} = ${content}`)
      }
    }
    
    console.log('추출된 각주:', footnoteMap) // 디버깅용
    setFootnotes(footnoteMap)
  }

  // 인라인 각주 정의를 각주 참조로 변환하는 전처리 함수
  const preprocessInlineFootnotes = (text: string): string => {
    // [*1] ??????? ?? [*1] (????????? extractFootnotes???? ?????)
    // [*] ??????? ?? [*] (??? ??? ????)
    return (text || '').replace(/\[\*(\d*)\]\s+([^[[\n\r]+)/g, '[*$1]')
  }

  const parseContent = (originalText: string): React.ReactNode => {
  // 인라인 각주 전처리
    const text = preprocessInlineFootnotes(originalText)
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let listStack: Array<{ type: 'ul' | 'ol', level: number }> = []

    const parseMarkdownTableRow = (row: string) => {
      const parts = row.split('|')
      parts.shift()
      parts.pop()
      return parts.map((cell) => cell.trim())
    }

    const isMarkdownTableLine = (value: string) => /^\|.*\|\s*$/.test(value)
    const isSeparatorRow = (cells: string[]) => cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))

    const renderPersonInfoboxElement = (params: Record<string, string>, orderedParams: Array<[string, string]>, key: React.Key, colorAttribs?: string) => {
      const templateColors = parseTemplateColorAttributes(colorAttribs)
      const templateStyle: React.CSSProperties = {}
      
      if (templateColors.backgroundColor) {
        templateStyle.backgroundColor = templateColors.backgroundColor
      }
      if (templateColors.textColor) {
        templateStyle.color = templateColors.textColor
      }
      if (templateColors.borderColor) {
        templateStyle.borderColor = templateColors.borderColor
      }
      
      return (
        <React.Fragment key={key}>
          <div className="person-infobox bg-gray-900 border border-gray-700 rounded-lg shadow-lg float-right ml-6 mb-4 w-full max-w-[340px]" style={templateStyle}>
            <div className="bg-red-700 text-white text-center py-2 px-3">
              <div className="text-sm flex items-center justify-center gap-2">
                {params['상단로고'] && (
                  <img src={params['상단로고']} alt="로고" className="w-6 h-6 object-contain" 
                       onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                )}
                {params['상단제목'] || ''}
              </div>
              {params['상단부제목'] && (
                <>
                  <hr className="border-white/30 my-1" />
                  <div className="text-sm">{params['상단부제목']}</div>
                </>
              )}
              {params['상단설명'] && <div className="text-xs opacity-80 mt-1">{params['상단설명']}</div>}
              <div className="text-base font-bold mt-2">{params['이름'] || params['본명'] || ''}</div>
              {params['영문명'] && <div className="text-sm opacity-90 mt-1">{params['영문명']}</div>}
              {params['한문명'] && <div className="text-sm opacity-90 mt-1">{params['한문명']}</div>}
            </div>
            {params['이미지'] && (
              <div className="text-center bg-gray-800 p-3">
                <img src={params['이미지']} alt={params['이름'] || '인물 사진'} className="w-full max-w-56 mx-auto max-h-[300px] object-contain rounded"
                     onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE }} />
                {params['이미지설명'] && (
                  <div className="text-xs text-gray-400 mt-2">{parseInlineElements(params['이미지설명'])}</div>
                )}
              </div>
            )}
            <div className="border-t border-gray-700">
              <table className="w-full text-sm">
                <tbody>
                  {(() => {
                    // 헤더에서 사용하는 특수 필드들만 제외하고, 나머지는 작성 순서대로 표시
                    const excludeFields = new Set([
                      '상단로고', '상단제목', '상단부제목', '상단설명', 
                      '이름', '본명', '영문명', '한문명', '이미지', '이미지설명'
                    ])
                    
                    return orderedParams
                      .filter(([key, value]) => !excludeFields.has(key) && value && value.trim())
                      .map(([key, value], index) => {
                        // Parse color attributes from template values
                        const colorAttributes = parseTableColorAttributes(value)
                        const cellStyles = getTableCellStyles(colorAttributes)
                        
                        return (
                          <tr key={index} className="border-b border-gray-700">
                            <td className="bg-red-700 text-white px-3 py-2 font-semibold w-24 align-top">
                              {key}
                            </td>
                            <td 
                              className="px-3 py-2 text-gray-200 whitespace-pre-line"
                              style={cellStyles}
                            >
                              {/* 서명 필드는 인라인 이미지만 허용 */}
                              {key === '서명' ? 
                                <span style={{ display: 'inline-block', maxWidth: '100%' }}>
                                  {colorAttributes.content.includes('[[파일:') || colorAttributes.content.includes('[이미지:') ? (
                                    <div dangerouslySetInnerHTML={{
                                      __html: colorAttributes.content
                                        .replace(/\[\[파일:([^\]|]+)(?:\|([^\]]+))?\]\]/g, '<img src="$1" alt="서명" style="max-width: 120px; max-height: 60px; display: inline-block; vertical-align: middle;" />')
                                        .replace(/\[이미지:([^\]]+)\]/g, '<img src="$1" alt="서명" style="max-width: 120px; max-height: 60px; display: inline-block; vertical-align: middle;" />')
                                    }}
                                  />
                                  ) : (
                                    parseInlineElements(colorAttributes.content)
                                  )}
                                </span> :
                                parseInlineElements(colorAttributes.content)
                              }
                            </td>
                          </tr>
                        )
                      })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ clear: 'both' }} />
        </React.Fragment>
      )
    }
    const imageRegex = /^\[이미지:([^\]]+)\]$/
    const fileRegex = /^\[\[파일:([^\]|]+)(?:\|([^\]]+))?\]\]$/
    const infoboxRegex = /^\[\[인포박스:(.+)\]\]$/
    const cardGridRegex = /^\[\[카드그리드:(.*)\]\]$/
    const tabsRegex = /^\[\[탭바:(.+)\]\]$/
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      // 인물정보상자 블록 처리: {{인물정보상자<bgcolor:#E8F4FD> \n |키=값 ... \n }}
      if (/^\{\{\s*인물정보상자(<[^>]+>)?\s*$/i.test(trimmed) || /^\{\{\s*인물정보상자(<[^>]+>)?\b/i.test(trimmed)) {
        let j = i + 1
        const buf: string[] = []
        
        // 색상 속성 추출
        const colorMatch = trimmed.match(/\{\{\s*인물정보상자(<[^>]+>)/i)
        const colorAttribs = colorMatch ? colorMatch[1] : undefined
        
        // 만약 시작 라인에 내용이 같이 온 경우 처리 ({{인물정보상자|키=값 ...}})
        const after = line.replace(/^.*인물정보상자(<[^>]+>)?/i, '')
        if (after.includes('}}')) {
          const innerInline = after.replace(/^.*?\{\{\s*인물정보상자(<[^>]+>)?\s*/i, '').replace(/}}.*$/, '')
          buf.push(innerInline)
        } else {
          while (j < lines.length) {
            const t = lines[j].trim()
            if (/^}}\s*$/.test(t)) break
            buf.push(lines[j])
            j++
          }
          i = j // 블록 끝으로 이동 (for 루프에서 i++ 되므로 마지막 줄의 다음으로 진행)
        }
        const paramsText = buf.join('\n')
        const params = parseTemplateParams(paramsText)
        const orderedParams = parseTemplateParamsOrdered(paramsText)
        elements.push(renderPersonInfoboxElement(params, orderedParams, i, colorAttribs))
        continue
      }

      // 그룹정보상자 블록 처리: {{그룹정보상자<bgcolor:#E8F4FD> \n |키=값 ... \n }}
      if (/^\{\{\s*그룹정보상자(<[^>]+>)?\s*$/i.test(trimmed) || /^\{\{\s*그룹정보상자(<[^>]+>)?\b/i.test(trimmed)) {
        let j = i + 1
        const buf: string[] = []
        
        // 색상 속성 추출
        const colorMatch = trimmed.match(/\{\{\s*그룹정보상자(<[^>]+>)/i)
        const colorAttribs = colorMatch ? colorMatch[1] : undefined
        
        // 만약 시작 라인에 내용이 같이 온 경우 처리 ({{그룹정보상자|키=값 ...}})
        const after = line.replace(/^.*그룹정보상자(<[^>]+>)?/i, '')
        if (after.includes('}}')) {
          const innerInline = after.replace(/^.*?\{\{\s*그룹정보상자(<[^>]+>)?\s*/i, '').replace(/}}.*$/, '')
          buf.push(innerInline)
        } else {
          while (j < lines.length) {
            const t = lines[j].trim()
            if (/^}}\s*$/.test(t)) break
            buf.push(lines[j])
            j++
          }
          i = j // 블록 끝으로 이동 (for 루프에서 i++ 되므로 마지막 줄의 다음으로 진행)
        }
        const paramsText = buf.join('\n')
        const params = parseTemplateParams(paramsText)
        const orderedParams = parseTemplateParamsOrdered(paramsText)
        elements.push(renderGroupInfoboxElement(params, orderedParams, i, colorAttribs))
        continue
      }
      
      if (!trimmed) {
        // 빈 줄은 건너뛰고, 문단 구분 처리는 나중에
        continue
      }

      // 분류 태그 렌더링 (예: 분류: A | B | C)
      if (trimmed.startsWith('분류:')) {
        const rawSegment = trimmed.substring(3).replace(/^:/, '')
        const categories = rawSegment
          .split('|')
          .map((value) => value.replace(/^\{?|\}?$/g, '').trim())
          .filter(Boolean)

        elements.push(
          <div key={i} className="my-3 text-xs text-gray-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400">분류:</span>
              {categories.map((category, idx) => {
                const href = `/wiki/category/${encodeURIComponent(category)}`
                return (
                  <a
                    key={`${category}-${idx}`}
                    href={href}
                    className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded hover:border-blue-400 hover:text-blue-200 transition-colors"
                  >
                    {category}
                  </a>
                )
              })}
            </div>
          </div>
        )
        continue
      }

      // 역할 배너: {{role:developer}} 등
      const roleMatch = trimmed.match(/^\{\{\s*role\s*:\s*([a-zA-Z0-9_-]+)\s*\}\}$/i)
      if (roleMatch) {
        const roleKey = roleMatch[1].toLowerCase()
        elements.push(<RoleBanner key={`role-${i}`} role={roleKey} />)
        continue
      }

      // 탭바 렌더링: [[탭바: 항목=링크 | 항목2=링크2 | ...]] (링크 생략 시 슬러그 동일 가정)
      const tabsMatch = trimmed.match(tabsRegex)
      if (tabsMatch) {
        const raw = tabsMatch[1]
        const items = raw.split('|').map(s => s.trim()).filter(Boolean).map(pair => {
          const [label, link] = pair.split('=').map(v => (v || '').trim())
          return { label, link: link || label }
        })
        elements.push(
          <div key={i} className="my-4">
            <div className="flex items-center justify-center gap-8 text-sm">
              {items.map((it, idx) => (
                <a key={idx} href={`#/wiki/${encodeURIComponent(it.link)}`} className="text-gray-300 hover:text-gray-100">
                  {it.label}
                </a>
              ))}
            </div>
          </div>
        )
        continue
      }

      // 인포박스 렌더링: [[인포박스: 키=값 | 키2=값2 | ...]]
      const infoboxMatch = trimmed.match(infoboxRegex)
      if (infoboxMatch) {
        const raw = infoboxMatch[1]
        const pairs = raw.split('|').map(s => s.trim()).filter(Boolean)
        const rows: Array<{ key: string; value: string }> = []
        let title = ''
        let image = ''
        pairs.forEach(p => {
          const [k, ...rest] = p.split('=')
          const key = (k || '').trim()
          const value = rest.join('=').trim()
          if (!key) return
          if (key === '제목' || key.toLowerCase() === 'title') title = value
          else if (key === '이미지' || key.toLowerCase() === 'image') image = value
          else rows.push({ key, value })
        })
        const resolvedImage = image || PLACEHOLDER_IMAGE
        elements.push(
          <div key={i} className="my-6 border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
            {(
              <div className="w-full bg-gray-800 border-b border-gray-700 text-center">
                <img
                  src={resolvedImage}
                  alt={title || '문서 이미지'}
                  className="w-full h-auto max-h-[420px] object-cover"
                  onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE }}
                />
              </div>
            )}
            {title && (
              <div className="px-4 py-3 border-b border-gray-700">
                <h4 className="text-center text-gray-200 font-semibold">{title}</h4>
              </div>
            )}
            <div className="divide-y divide-gray-800">
              {rows.map((r, idx) => (
                <div key={idx} className="grid grid-cols-3 md:grid-cols-3 gap-2 px-4 py-2">
                  <div className="col-span-1 text-gray-400 text-sm">{r.key}</div>
                  <div className="col-span-2 text-gray-200 text-sm whitespace-pre-line">{parseInlineElements(r.value)}</div>
                </div>
              ))}
            </div>
          </div>
        )
        continue
      }

      // 카드 그리드 렌더링: [[카드그리드: items=[{"title":"...","subtitle":"...","image":"...","tag":"...","date":"...","link":"..."}]]]
      // 목차 렌더링: [[목차]]
      if (trimmed === '[[목차]]') {
        if (generateTableOfContents && toc.length > 0) {
          elements.push(
            <div key={i} className="my-6 p-4 bg-gray-800 border border-gray-600 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">목차</h3>
              <nav className="space-y-1">
                {toc.map((item, tocIndex) => (
                  <div key={tocIndex} className="flex items-center">
                    <div className="flex-shrink-0 w-6 text-xs text-gray-500">
                      {tocIndex + 1}.
                    </div>
                    <a
                      href={`#${item.anchor}`}
                      className={`text-blue-400 hover:text-blue-300 hover:underline block py-1 transition-colors`}
                      style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                      onClick={(e) => {
                        e.preventDefault()
                        const element = document.getElementById(item.anchor)
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                    >
                      {item.title}
                    </a>
                  </div>
                ))}
              </nav>
            </div>
          )
        } else {
          elements.push(
            <div key={i} className="my-6 p-4 bg-gray-800 border border-gray-600 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">목차</h3>
              <p className="text-gray-400 text-sm">문서에 제목이 없어 목차를 생성할 수 없습니다.</p>
            </div>
          )
        }
        continue
      }

      // 카드그리드 처리 (멀티라인 지원)
      if (trimmed.startsWith('[[카드그리드:')) {
        let j = i
        let cardGridContent = ''
        let foundEnd = false
        
        // 단일 라인 카드그리드인지 확인
        if (trimmed.endsWith(']]')) {
          cardGridContent = trimmed
          foundEnd = true
        } else {
          // 멀티라인 카드그리드 수집
          while (j < lines.length) {
            const currentLine = lines[j].trim()
            cardGridContent += (j === i ? currentLine : '\n' + currentLine)
            
            if (currentLine.endsWith(']]')) {
              foundEnd = true
              break
            }
            j++
          }
        }
        
        if (!foundEnd) {
          elements.push(
            <div key={i} className="my-4 p-4 bg-red-900 border border-red-700 rounded-lg">
              <div className="text-red-200 font-semibold">카드그리드 문법 오류</div>
              <div className="text-red-300 text-sm mt-1">닫는 ]] 를 찾을 수 없습니다</div>
            </div>
          )
          continue
        }
        
        const cardGridMatch = cardGridContent.match(/^\[\[카드그리드:([\s\S]*)\]\]$/)
        if (cardGridMatch) {
          const raw = cardGridMatch[1].trim()
          let items: Array<{ title?: string; subtitle?: string; description?: string; image?: string; tag?: string; date?: string; link?: string }> = []
          
          // 더 유연한 JSON 파싱을 위한 여러 시도
          try {
            // 1. items= 형태로 시작하는 경우
            const arrMatch = raw.match(/items\s*=\s*(\[[\s\S]*\])/)
            if (arrMatch) {
              items = JSON.parse(arrMatch[1])
            } else {
              // 2. 직접 JSON 배열인 경우
              if (raw.startsWith('[')) {
                items = JSON.parse(raw)
              }
            }
          } catch (error) {
            console.error('카드그리드 JSON 파싱 오류:', error, 'Raw 데이터:', raw)
            // 파싱 실패 시 오류 메시지 표시
            elements.push(
              <div key={i} className="my-4 p-4 bg-red-900 border border-red-700 rounded-lg">
                <div className="text-red-200 font-semibold">카드그리드 데이터 파싱 오류</div>
                <div className="text-red-300 text-xs mt-2 font-mono whitespace-pre-wrap">{raw}</div>
                <div className="text-red-300 text-sm mt-1">오류: {(error as Error).message}</div>
              </div>
            )
            i = j // 멀티라인이었다면 해당 라인들을 건너뛰기
            continue
          }

          if (!Array.isArray(items) || items.length === 0) {
            elements.push(
              <div key={i} className="my-4 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
                <div className="text-yellow-200">카드그리드 데이터가 올바르지 않습니다</div>
                <div className="text-yellow-300 text-sm mt-1">배열 형태의 데이터가 필요합니다</div>
                <div className="text-yellow-300 text-xs mt-1 font-mono">{raw}</div>
              </div>
            )
            i = j // 멀티라인이었다면 해당 라인들을 건너뛰기
            continue
          }

          elements.push(
            <div key={i} className="my-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((it, idx) => (
                  <div key={idx} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
                    <div className="aspect-[1/1] bg-gray-800">
                      <img src={it.image || PLACEHOLDER_IMAGE} alt={it.title || ''} className="w-full h-full object-cover"
                           onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE }} />
                    </div>
                    <div className="p-3 space-y-1">
                      {it.tag && <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300">{it.tag}</span>}
                      <div className="text-gray-200 font-medium leading-tight">{it.title}</div>
                      {(it.subtitle || it.description) && <div className="text-xs text-gray-400">{it.subtitle || it.description}</div>}
                      {it.date && <div className="text-[11px] text-gray-500">{it.date}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        
        i = j // 멀티라인이었다면 해당 라인들을 건너뛰기
        continue
      }

      // 파일/이미지 렌더링
      const imageMatch = trimmed.match(imageRegex)
      if (imageMatch) {
        const src = imageMatch[1].trim()
        elements.push(
          <div key={i} className="my-4 text-center">
            <img
              src={src}
              alt="문서 이미지"
              className="max-w-full h-auto rounded border border-gray-700 inline-block"
              onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE }}
            />
          </div>
        )
        continue
      }
      const fileMatch = trimmed.match(fileRegex)
      if (fileMatch) {
        const path = fileMatch[1].trim()
        const caption = (fileMatch[2] || '').trim()
        elements.push(
          <div key={i} className="my-4 text-center">
            <img src={path} alt={caption} className="max-w-full h-auto rounded border border-gray-700 inline-block"
                 onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE }} />
            {caption && <div className="text-xs text-gray-400 mt-1">{caption}</div>}
          </div>
        )
        continue
      }
      
      const headingMatch = trimmed.match(/^(=+)\s*(.+?)\s*=+$/) || trimmed.match(/^(#+)\s*(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        const anchor = toSlug(title)
        
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
      
      // 표 렌더링 (나무위키 스타일: || 셀1 || 셀2 ||)
      if (isMarkdownTableLine(trimmed)) {
        const tableLines: string[] = []
        let j = i
        while (j < lines.length) {
          const candidate = lines[j].trim()
          if (!isMarkdownTableLine(candidate)) break
          tableLines.push(candidate)
          j++
        }
        if (tableLines.length >= 2) {
          const headerCells = parseMarkdownTableRow(tableLines[0])
          const separatorCells = parseMarkdownTableRow(tableLines[1])
          if (headerCells.length > 0 && isSeparatorRow(separatorCells)) {
            const alignments = separatorCells.map((cell) => {
              const starts = cell.startsWith(':')
              const ends = cell.endsWith(':')
              if (starts && ends) return 'center'
              if (ends) return 'right'
              if (starts) return 'left'
              return 'left'
            })
            const bodyRows = tableLines.slice(2).map(parseMarkdownTableRow)
            const tableElement = (
              <div key={i} className="my-4 overflow-x-auto flex justify-center">
                <table className="border-collapse border border-gray-600 bg-gray-900 text-gray-200 w-full">
                  <thead>
                    <tr>
                      {headerCells.map((cell, idx) => (
                        <th
                          key={idx}
                          className="border border-gray-600 px-3 py-2 text-sm font-semibold bg-gray-800"
                          style={{ textAlign: alignments[idx] || 'left' }}
                        >
                          {parseInlineElements(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.length === 0 && (
                      <tr>
                        {headerCells.map((_, idx) => (
                          <td key={idx} className="border border-gray-600 px-3 py-2 text-sm text-gray-300" />
                        ))}
                      </tr>
                    )}
                    {bodyRows.map((cells, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-gray-600">
                        {headerCells.map((_, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border border-gray-600 px-3 py-2 text-sm text-gray-300"
                            style={{ textAlign: alignments[cellIndex] || 'left' }}
                          >
                            {parseInlineElements(cells[cellIndex] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
            elements.push(tableElement)
            i = j - 1
            continue
          }
        }
      }

      if (trimmed.startsWith('||') && trimmed.endsWith('||')) {
        // 연속된 표 행들을 수집
        const tableRows: string[] = []
        let j = i
        
        while (j < lines.length && lines[j].trim().startsWith('||') && lines[j].trim().endsWith('||')) {
          tableRows.push(lines[j].trim())
          j++
        }
        
        if (tableRows.length > 0) {
          // 표 생성
          const tableElement = (
            <div key={i} className="my-4 overflow-x-auto flex justify-center">
              <table className="border-collapse border border-gray-600 bg-gray-900 text-gray-200 mx-auto">
                <tbody>
                  {tableRows.map((row, rowIndex) => {
                    // || 기준으로 셀 분리
                    const cells = row.split('||').filter(cell => cell.trim() !== '')
                    const isHeaderRow = rowIndex === 0
                    
                    return (
                      <tr key={rowIndex} className="border-b border-gray-600">
                        {cells.map((cell, cellIndex) => {
                          const cellContent = cell.trim()
                          const CellTag = isHeaderRow ? 'th' : 'td'
                          
                          // Parse color attributes from cell content
                          const colorAttributes = parseTableColorAttributes(cellContent)
                          
                          // 색상은 헤더 행에만 적용, 일반 행은 기본 그레이 유지
                          let cellStyles = {}
                          if (isHeaderRow) {
                            cellStyles = getTableCellStyles(colorAttributes)
                            // 헤더에 색상이 지정되지 않은 경우 기본 헤더 색상 사용
                            if (!colorAttributes.backgroundColor) {
                              cellStyles = { ...cellStyles, backgroundColor: '#374151' }
                            }
                          } else {
                            // 일반 행은 항상 기본 그레이 배경 유지
                            cellStyles = { backgroundColor: '#1f2937' }
                          }
                          
                          return (
                            <CellTag
                              key={cellIndex}
                              className={`border border-gray-600 px-3 py-2 text-sm whitespace-pre-line ${
                                isHeaderRow ? 'font-semibold' : ''
                              }`}
                              style={cellStyles}
                            >
                              {parseInlineElements(colorAttributes.content)}
                            </CellTag>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
          
          elements.push(tableElement)
          i = j - 1 // 다음 반복에서 i++가 되므로 -1
          continue
        }
      }
      
      // 독립된 각주 정의 라인 건너뛰기 (인라인 각주는 parseInlineElements에서 처리됨)
      // 라인 전체가 각주 정의인 경우만 건너뛰기 (문장 중간의 인라인 각주는 제외)
      const footnoteDefMatch = trimmed.match(/^\[\*(\d+|[a-zA-Z가-힣\d]+)\]\s*(.+)$/)
      if (footnoteDefMatch && footnoteDefMatch[2].trim().length > 5 && trimmed === line.trim()) {
        continue
      }
      
      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={i} className="my-6 border-gray-600" />)
        continue
      }

      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim().toLowerCase()
        const codeLines: string[] = []
        let j = i + 1
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeLines.push(lines[j])
          j++
        }
        const rawCode = codeLines.join('\n')
        i = j

        registerHighlightLanguages()
        let highlightedCode = rawCode
        let usedLanguage = lang
        try {
          if (lang && hljs.getLanguage(lang)) {
            highlightedCode = hljs.highlight(rawCode, { language: lang }).value
          } else {
            const auto = hljs.highlightAuto(rawCode)
            highlightedCode = auto.value
            usedLanguage = auto.language || lang
          }
        } catch (error) {
          console.warn('코드 하이라이트 오류:', error)
        }

        elements.push(
          <div key={`code-${i}`} className="my-4 rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
            <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-800 bg-gray-800/60 uppercase tracking-wide">
              {usedLanguage ? usedLanguage.toUpperCase() : 'CODE'}
            </div>
            <pre className="overflow-x-auto p-4 text-sm bg-gray-900 whitespace-pre hljs rounded-none">
              <code
                className="hljs"
                dangerouslySetInnerHTML={{ __html: highlightedCode || rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;') }}
              />
            </pre>
          </div>
        )
        continue
      }
      
      // 일반 텍스트 라인 - 연속된 라인들을 하나의 문단으로 묶기 위해 수집
      const paragraphLines: string[] = [line]
      let j = i + 1
      
      // 다음 라인들이 일반 텍스트인지 확인하고 수집
      while (j < lines.length) {
        const nextLine = lines[j]
        const nextTrimmed = nextLine.trim()
        
        // 빈 줄이거나 특수 문법이 시작되면 문단 종료
        if (!nextTrimmed || 
            nextTrimmed.startsWith('=') || 
            nextTrimmed.startsWith('#') ||
            nextTrimmed.startsWith('*') || 
            nextTrimmed.startsWith('-') ||
            nextTrimmed.startsWith('1.') ||
            nextTrimmed.startsWith('>') ||
            nextTrimmed.startsWith('||') ||
            nextTrimmed.startsWith('[[') ||
            nextTrimmed.startsWith('{{') ||
            nextTrimmed.startsWith(':::') ||
            nextTrimmed === '---' ||
            nextTrimmed === '***' ||
            /^\[\*(\d+|[a-zA-Z가-힣\d]+)\]\s*(.+)$/.test(nextTrimmed)) {
          break
        }
        
        paragraphLines.push(nextLine)
        j++
      }
      
      // 수집된 라인들을 하나의 문단으로 렌더링
      const paragraphContent = paragraphLines.join('\n')
      elements.push(
        <p key={i} className="mb-4 leading-relaxed text-gray-300 whitespace-pre-line">
          {parseInlineElements(paragraphContent)}
        </p>
      )
      
      // 처리한 라인들만큼 인덱스 이동
      i = j - 1
    }
    
    return elements
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
      case 'inline-image':
        const src = groups[1]
        return (
          <img
            src={src}
            alt="인라인 이미지"
            className="inline-block max-h-64 align-middle rounded border border-gray-700"
            onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE }}
          />
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
        
      case 'align-left':
        return (
          <div className="text-left">
            {groups[1]}
          </div>
        )
      
      case 'align-center':
        return (
          <div className="text-center">
            {groups[1]}
          </div>
        )
      
      case 'align-right':
        return (
          <div className="text-right">
            {groups[1]}
          </div>
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

  const renderedContent = parseContent(content);

  return (
    <div className={`namu-wiki-content text-gray-300 ${isPreview ? 'wiki-preview' : ''}`}>
      <div className="prose prose-lg max-w-none prose-invert">
        {renderedContent}
      </div>
      {(Object.keys(footnotes).length > 0 || footnoteCounterRef.current > 0) && (
        <div className="mt-12 pt-6 border-t border-gray-600">
          <h3 className="font-bold text-lg mb-4 text-gray-200">각주</h3>
          <div className="space-y-2">
            {Array.from({ length: footnoteCounterRef.current }, (_, index) => {
              const footnoteNumber = index + 1
              
              // 해당 번호에 매핑된 키 찾기
              const footnoteKey = Object.keys(footnoteMappingRef.current).find(key => footnoteMappingRef.current[key] === footnoteNumber)
              
              // 각주 내용 찾기 - 우선순위: 매핑된 키 > 숫자 키 > auto 키들
              let footnoteText = `각주 ${footnoteNumber}`
              
              if (footnoteKey && footnotes[footnoteKey]) {
                footnoteText = footnotes[footnoteKey]
                console.log(`각주 ${footnoteNumber}: 매핑된 키 ${footnoteKey} 사용 = ${footnoteText}`)
              } else if (footnotes[footnoteNumber.toString()]) {
                footnoteText = footnotes[footnoteNumber.toString()]
                console.log(`각주 ${footnoteNumber}: 숫자 키 사용 = ${footnoteText}`)
              } else {
                // auto 키들 중에서 순서대로 찾기
                const autoKeys = Object.keys(footnotes).filter(key => key.startsWith('auto'))
                if (autoKeys.length > 0 && index < autoKeys.length) {
                  const autoKey = autoKeys[index]
                  footnoteText = footnotes[autoKey]
                  console.log(`각주 ${footnoteNumber}: auto 키 ${autoKey} 사용 = ${footnoteText}`)
                }
              }
              
              return (
                <div key={footnoteNumber} id={`footnote-${footnoteNumber}`} className="text-sm text-gray-400 scroll-mt-20 p-2 rounded hover:bg-gray-800 transition-colors">
                  <sup className="text-blue-400 mr-2">
                    <button
                      className="hover:text-blue-300 cursor-pointer underline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // 각주를 참조하는 곳으로 다시 돌아가기
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      title="본문으로 돌아가기"
                    >
                      [{footnoteNumber}]
                    </button>
                  </sup>
                  <span className="text-gray-300">{parseInlineElements(footnoteText)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

