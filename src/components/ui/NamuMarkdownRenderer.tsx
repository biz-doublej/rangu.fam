'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { motion } from 'framer-motion'
import { parseTableColorAttributes, getTableCellStyles, normalizeColor } from '@/lib/tableColors'
import { 
  ExternalLink, 
  Link as LinkIcon, 
  Quote, 
  Code2, 
  Info, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { parseIconSyntax } from './WikiIcon'

interface NamuMarkdownRendererProps {
  content: string
  onInternalLinkClick?: (href: string) => void
  generateTableOfContents?: boolean
  onTocGenerated?: (toc: any[]) => void
}

// 나무위키 스타일 컴포넌트들
const NamuComponents = {
  // 헤딩 컴포넌트 (목차 생성용)
  h1: ({ children, ...props }: any) => (
    <motion.h1
      className="text-3xl font-bold text-primary-800 mt-8 mb-4 pb-2 border-b-2 border-primary-200"
      id={generateAnchor(children)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.h1>
  ),
  h2: ({ children, ...props }: any) => (
    <motion.h2
      className="text-2xl font-bold text-primary-700 mt-6 mb-3 pb-1 border-b border-primary-200"
      id={generateAnchor(children)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.h2>
  ),
  h3: ({ children, ...props }: any) => (
    <motion.h3
      className="text-xl font-semibold text-primary-600 mt-5 mb-2"
      id={generateAnchor(children)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 className="text-lg font-semibold text-primary-600 mt-4 mb-2" id={generateAnchor(children)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }: any) => (
    <h5 className="text-base font-semibold text-primary-600 mt-3 mb-2" id={generateAnchor(children)} {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }: any) => (
    <h6 className="text-sm font-semibold text-primary-600 mt-3 mb-2" id={generateAnchor(children)} {...props}>
      {children}
    </h6>
  ),

  // 문단 스타일
  p: ({ children, ...props }: any) => (
    <p className="text-gray-800 leading-7 mb-4" {...props}>
      {children}
    </p>
  ),

  // 링크 스타일 (내부/외부 구분)
  a: ({ href, children, ...props }: any) => {
    const isExternal = href?.startsWith('http') || href?.startsWith('//');
    const isInternal = href?.startsWith('/') || href?.startsWith('#');
    
    // children이 문자열인 경우 아이콘 파싱 적용
    const parseChildren = (children: any) => {
      if (typeof children === 'string') {
        const parsedContent = parseIconSyntax(children)
        const hasIcons = parsedContent.some(part => typeof part !== 'string')
        
        // 아이콘만 있는 경우 체크
        const isIconOnly = typeof children === 'string' && children.trim().startsWith('!icon:') && 
                          parsedContent.length === 1 && typeof parsedContent[0] !== 'string'
                          
        return {
          content: hasIcons ? parsedContent.map((part, idx) => (
            <React.Fragment key={idx}>{part}</React.Fragment>
          )) : children,
          isIconOnly
        }
      }
      return { content: children, isIconOnly: false }
    }
    
    const { content, isIconOnly } = parseChildren(children)
    
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-blue-600 hover:text-blue-800 ${isIconOnly ? '' : 'underline'} inline-flex items-center gap-1 whitespace-nowrap transition-colors duration-200`}
          style={{ display: 'inline-flex', alignItems: 'center' }}
          onClick={(e) => {
            // 아이콘 링크의 경우 외부 URL로 이동하도록 처리
            if (isIconOnly && href) {
              e.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }}
          {...props}
        >
          {content}
          {!isIconOnly && <ExternalLink className="w-3 h-3" />}
        </a>
      );
    }
    
    if (isInternal) {
      return (
        <a
          href={href}
          className={`text-primary-600 hover:text-primary-800 ${isIconOnly ? '' : 'underline'} font-medium inline-flex items-center gap-1 whitespace-nowrap transition-colors duration-200`}
          style={{ display: 'inline-flex', alignItems: 'center' }}
          onClick={(e) => {
            // 내부 링크 처리 개선
            if (href && (href.startsWith('/') || href.startsWith('#'))) {
              e.preventDefault();
              if (href.startsWith('#')) {
                // 앵커 링크 스크롤
                const element = document.getElementById(href.substring(1));
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              } else {
                // 내부 페이지 이동
                window.location.href = href;
              }
            }
          }}
          {...props}
        >
          {content}
        </a>
      );
    }
    
    // 나무위키 내부 링크 스타일
    return (
      <span 
        className={`text-primary-600 hover:text-primary-800 ${isIconOnly ? '' : 'underline'} cursor-pointer font-medium inline-flex items-center gap-1 whitespace-nowrap transition-colors duration-200`} 
        style={{ display: 'inline-flex', alignItems: 'center' }}
        onClick={(e) => {
          // 나무위키 링크 클릭 처리
          e.preventDefault();
          if (href) {
            console.log('Wiki link clicked:', href);
            // 필요시 onInternalLinkClick 콜백 호출
          }
        }}
      >
        {!isIconOnly && <LinkIcon className="w-3 h-3" />}
        {content}
      </span>
    );
  },

  // 인용문
  blockquote: ({ children, ...props }: any) => (
    <motion.blockquote
      className="border-l-4 border-primary-300 bg-primary-50 pl-4 py-2 my-4 italic"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <Quote className="w-4 h-4 text-primary-500 mb-2" />
      {children}
    </motion.blockquote>
  ),

  // 코드 블록
  pre: ({ children, ...props }: any) => (
    <motion.pre
      className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 border"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <div className="flex items-center mb-2">
        <Code2 className="w-4 h-4 text-gray-400 mr-2" />
        <span className="text-xs text-gray-400">코드</span>
      </div>
      {children}
    </motion.pre>
  ),

  // 인라인 코드
  code: ({ children, ...props }: any) => (
    <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  ),

  // 리스트
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc pl-6 my-4 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal pl-6 my-4 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-gray-800 leading-6" {...props}>
      {children}
    </li>
  ),

  // 테이블
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-primary-50" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="border-b border-gray-200 hover:bg-gray-50" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-primary-700" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="border border-gray-300 px-4 py-2 text-gray-800" {...props}>
      {children}
    </td>
  ),

  // 구분선
  hr: ({ ...props }: any) => (
    <hr className="my-8 border-t-2 border-gray-200" {...props} />
  ),

  // 이미지
  img: ({ src, alt, ...props }: any) => (
    <motion.div
      className="my-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg shadow-md mx-auto border"
        {...props}
      />
      {alt && (
        <p className="text-sm text-gray-500 mt-2 italic">{alt}</p>
      )}
    </motion.div>
  ),

  // 강조
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold text-primary-800" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-primary-700" {...props}>
      {children}
    </em>
  )
};

// 공통 앵커/슬러그 규칙: 한글 포함, 소문자-하이픈
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// 템플릿 파라미터 파싱 함수 (개선된 버전)
function parseTemplateParams(content: string): Record<string, string> {
  const params: Record<string, string> = {};
  const lines = content.split('\n');
  
  console.log('🔍 파싱할 템플릿 내용:', content); // 디버깅용
  
  for (const line of lines) {
    // | 또는 없이 시작하고, = 으로 구분되는 패턴 매칭
    const match = line.match(/^\s*\|?\s*([^=]+?)\s*=\s*(.*?)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      params[key] = value;
      console.log(`✅ 파라미터 파싱: ${key} = ${value}`); // 디버깅용
    } else if (line.trim()) {
      console.log(`❌ 파싱 실패한 라인: "${line}"`); // 디버깅용
    }
  }
  
  console.log('📋 최종 파라미터:', params); // 디버깅용
  return params;
}

// 인물정보상자 블록을 라인 기준으로 보다 안정적으로 치환
function replacePersonInfoboxBlocks(text: string): string {
  // \r?\n 호환, 시작 {{ 인물정보상자 ... \n }} 단독 라인으로 종료
  const blockPattern = /^\s*\{\{\s*인물정보상자\s*[\r\n]+([\s\S]*?)^\s*\}\}\s*$/gmi;
  return text.replace(blockPattern, (_match, inner: string) => {
    return renderPersonInfobox(inner);
  });
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

// 인물 정보상자 렌더링 함수 (나무위키 스타일 - 복잡한 테이블 구조 지원)
function renderPersonInfobox(content: string, colorAttribs?: string): string {
  const params = parseTemplateParams(content);
  const templateColors = parseTemplateColorAttributes(colorAttribs);
  
  // 복잡한 학력 테이블 생성 함수
  function renderEducationTable(education: string): string {
    if (!education) return '';
    
    // 스크린샷과 같은 복잡한 테이블 구조 생성
    return `
      <div class="education-complex-table">
        <!-- 상단 헤더 테이블 (R27, R7, R20, R17) -->
        <table class="w-full border-collapse text-xs mb-1">
          <tr>
            <td class="border border-gray-400 bg-blue-100 px-2 py-1 text-center font-semibold">R27<br/>학사과정</td>
            <td class="border border-gray-400 bg-blue-100 px-2 py-1 text-center font-semibold">R7<br/>석사과정</td>
            <td class="border border-gray-400 bg-blue-100 px-2 py-1 text-center font-semibold">R20<br/>박사과정</td>
            <td class="border border-gray-400 bg-blue-100 px-2 py-1 text-center font-semibold">R17<br/>기타과정</td>
          </tr>
          <tr>
            <td colspan="4" class="border border-gray-400 bg-blue-200 px-2 py-1 text-center font-bold">R3 과정</td>
          </tr>
          <tr>
            <td class="border border-gray-400 bg-blue-100 px-2 py-1 text-center">R1<br/>학사과정</td>
            <td colspan="3" class="border border-gray-400 bg-blue-100 px-2 py-1 text-center">R10<br/>졸업과정</td>
          </tr>
        </table>
        
        <!-- 실제 학력 정보 -->
        <div class="text-xs leading-relaxed mt-2">
          ${education.replace(/<br\/?>/g, '<br/>')}
        </div>
      </div>
    `;
  }
  
  // 소속 정보에 드롭다운 화살표 추가
  function renderAffiliation(affiliation: string): string {
    if (!affiliation) return '';
    
    return `
      <div class="affiliation-dropdown">
        ${affiliation.replace(/<br\/?>/g, '<br/>')}
        <span class="float-right text-blue-500">▼</span>
      </div>
    `;
  }
  
  // 템플릿 레벨 스타일 생성
  const templateStyle = Object.entries({
    backgroundColor: templateColors.backgroundColor,
    color: templateColors.textColor,
    borderColor: templateColors.borderColor
  }).filter(([, value]) => value)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
  
  return `
    <div class="person-infobox bg-white border border-gray-300 shadow-lg float-right ml-4 mb-4" style="width: 320px; max-width: 100%; ${templateStyle}">
      <!-- 상단 헤더 (태릉고등학교 37기 학생회장...) -->
      <div class="bg-red-700 text-white text-center py-2 px-3">
        <div class="text-sm font-medium">${params['상단제목'] || '태릉고등학교 37기 학생회장'}</div>
        <div class="text-sm">${params['상단부제목'] || '재학 당시의 모습'}</div>
        <div class="text-sm">${params['상단설명'] || '촬영일 : 정재원'}</div>
        <div class="text-base font-bold mt-1">${params['이름'] || params['본명'] || 'Jung Jae Won'}</div>
      </div>
      
      <!-- 이미지 섹션 -->
      ${params['이미지'] ? `
        <div class="text-center bg-gray-800 p-3">
          <img src="${params['이미지']}" alt="${params['이름'] || '인물 사진'}" class="w-full max-w-56 mx-auto rounded" style="max-height: 300px; object-fit: contain;">
          ${params['이미지설명'] ? `<div class="text-xs text-gray-400 mt-2">${params['이미지설명'].replace(/<br\/?>/g, '<br/>')}</div>` : ''}
        </div>
      ` : ''}
      
      <!-- 정보 테이블 -->
      <div class="border-t border-gray-300">
        <table class="w-full text-sm border-collapse">
          ${params['출생'] || params['생년월일'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300" style="width: 80px;">출생</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['출생'] || params['생년월일']}</td>
            </tr>
          ` : ''}
          
          ${params['출생지'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">출생지</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['출생지']}</td>
            </tr>
          ` : ''}
          
          ${params['국적'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">국적</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['국적']}</td>
            </tr>
          ` : ''}
          
          ${params['거주지'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">거주지</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['거주지']}</td>
            </tr>
          ` : ''}
          
          ${params['소속'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">소속</td>
              <td class="px-3 py-2 border-b border-gray-300">${renderAffiliation(params['소속'])}</td>
            </tr>
          ` : ''}
          
          ${params['직업'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">직업</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['직업']}</td>
            </tr>
          ` : ''}
          
          ${params['학력'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300 align-top">학력</td>
              <td class="px-3 py-2 border-b border-gray-300">
                ${renderEducationTable(params['학력'])}
              </td>
            </tr>
          ` : ''}
          
          ${params['경력'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300 align-top">경력</td>
              <td class="px-3 py-2 border-b border-gray-300">
                <div class="text-xs leading-relaxed">
                  ${params['경력'].replace(/<br\/?>/g, '<br/>')}
                </div>
              </td>
            </tr>
          ` : ''}
          
          ${params['본관'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">본관</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['본관']}</td>
            </tr>
          ` : ''}
          
          ${params['신체'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">신체</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['신체']}</td>
            </tr>
          ` : ''}
          
          ${params['별명'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">별명</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['별명'].replace(/<br\/?>/g, '<br/>')}</td>
            </tr>
          ` : ''}
          
          ${params['종교'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">종교</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['종교']}</td>
            </tr>
          ` : ''}
          
          ${params['서명'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold border-b border-gray-300">서명</td>
              <td class="px-3 py-2 border-b border-gray-300">
                ${(() => {
                  const signature = params['서명'];
                  // 다양한 이미지 패턴 처리
                  if (signature.includes('[[파일:') || signature.includes('[이미지:') || signature.includes('<img') || signature.includes('.jpg') || signature.includes('.png') || signature.includes('.gif')) {
                    return signature
                      // [[파일:경로|옵션]] 패턴
                      .replace(/\[\[파일:([^\]|]+)(?:\|([^\]]+))?\]\]/g, '<img src="$1" alt="서명" style="max-width: 120px; max-height: 60px; display: inline-block; border: 1px solid #ddd; background: white; padding: 2px;" />')
                      // [이미지:경로] 패턴
                      .replace(/\[이미지:([^\]]+)\]/g, '<img src="$1" alt="서명" style="max-width: 120px; max-height: 60px; display: inline-block; border: 1px solid #ddd; background: white; padding: 2px;" />')
                      // 직접 이미지 경로 패턴 (https://... 또는 /uploads/...)
                      .replace(/(https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp))/gi, '<img src="$1" alt="서명" style="max-width: 120px; max-height: 60px; display: inline-block; border: 1px solid #ddd; background: white; padding: 2px;" />')
                      .replace(/(\/uploads\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp))/gi, '<img src="$1" alt="서명" style="max-width: 120px; max-height: 60px; display: inline-block; border: 1px solid #ddd; background: white; padding: 2px;" />');
                  }
                  return signature; // 텍스트 서명
                })()}
              </td>
            </tr>
          ` : ''}
          
          ${params['링크'] ? `
            <tr>
              <td class="bg-red-700 text-white px-3 py-2 font-semibold">링크</td>
              <td class="px-3 py-2">${params['링크']}</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

// 그룹정보상자 렌더링 함수
function renderGroupInfobox(content: string, colorAttribs?: string): string {
  const params = parseTemplateParams(content);
  const templateColors = parseTemplateColorAttributes(colorAttribs);
  
  // 템플릿 레벨 스타일 생성
  const templateStyle = Object.entries({
    backgroundColor: templateColors.backgroundColor,
    color: templateColors.textColor,
    borderColor: templateColors.borderColor
  }).filter(([, value]) => value)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
  
  return `
    <div class="group-infobox bg-white border border-gray-300 shadow-lg float-right ml-4 mb-4" style="width: 320px; max-width: 100%; ${templateStyle}">
      <!-- 상단 헤더 -->
      <div class="bg-blue-700 text-white text-center py-2 px-3">
        <div class="text-base font-bold mt-2">${params['그룹명'] || params['이름'] || ''}</div>
        ${params['설명'] && `<div class="text-xs opacity-80 mt-1">${params['설명']}</div>`}
      </div>
      
      <!-- 이미지 섹션 -->
      ${params['이미지'] ? `
        <div class="text-center bg-gray-50 p-3">
          <img src="${params['이미지']}" alt="${params['그룹명'] || '그룹 이미지'}" class="w-full max-w-56 mx-auto" style="max-height: 300px; object-fit: contain;">
          ${params['이미지설명'] ? `<div class="text-xs text-gray-600 mt-2">${params['이미지설명'].replace(/<br\/?>/g, '<br/>')}</div>` : ''}
        </div>
      ` : ''}
      
      <!-- 정보 테이블 -->
      <div class="border-t border-gray-300">
        <table class="w-full text-sm border-collapse">
          ${params['설립일'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold border-b border-gray-300" style="width: 80px;">설립일</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['설립일']}</td>
            </tr>
          ` : ''}
          
          ${params['본부'] || params['본사'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold border-b border-gray-300">본부</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['본부'] || params['본사']}</td>
            </tr>
          ` : ''}
          
          ${params['메인멤버'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold border-b border-gray-300 align-top">메인멤버</td>
              <td class="px-3 py-2 border-b border-gray-300">
                <div class="text-xs leading-relaxed">
                  ${params['메인멤버'].replace(/<br\/?>/g, '<br/>')}
                </div>
              </td>
            </tr>
          ` : ''}
          
          ${params['서브멤버'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold border-b border-gray-300 align-top">서브멤버</td>
              <td class="px-3 py-2 border-b border-gray-300">
                <div class="text-xs leading-relaxed">
                  ${params['서브멤버'].replace(/<br\/?>/g, '<br/>')}
                </div>
              </td>
            </tr>
          ` : ''}
          
          ${params['장르'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold border-b border-gray-300">장르</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['장르']}</td>
            </tr>
          ` : ''}
          
          ${params['활동기간'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold border-b border-gray-300">활동기간</td>
              <td class="px-3 py-2 border-b border-gray-300">${params['활동기간']}</td>
            </tr>
          ` : ''}
          
          ${params['웹사이트'] || params['링크'] ? `
            <tr>
              <td class="bg-blue-700 text-white px-3 py-2 font-semibold">링크</td>
              <td class="px-3 py-2">${params['웹사이트'] || params['링크']}</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

// 기본 정보상자 렌더링 함수
function renderBasicInfobox(content: string, colorAttribs?: string): string {
  const params = parseTemplateParams(content);
  const templateColors = parseTemplateColorAttributes(colorAttribs);
  
  // 템플릿 레벨 스타일 생성
  const templateStyle = Object.entries({
    backgroundColor: templateColors.backgroundColor,
    color: templateColors.textColor,
    borderColor: templateColors.borderColor
  }).filter(([, value]) => value)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
  
  return `
    <div class="basic-infobox bg-white border border-gray-300 rounded-lg shadow-lg float-right ml-4 mb-4 w-80 max-w-full" style="${templateStyle}">
      ${params['제목'] ? `
        <div class="bg-blue-600 text-white p-3 text-center font-bold text-lg">
          ${params['제목']}
        </div>
      ` : ''}
      
      ${params['이미지'] ? `
        <div class="p-4 text-center">
          <img src="${params['이미지']}" alt="${params['제목'] || '이미지'}" class="w-full max-w-64 mx-auto rounded">
        </div>
      ` : ''}
      
      ${params['설명'] ? `
        <div class="p-4 text-sm border-t border-gray-300">
          ${params['설명']}
        </div>
      ` : ''}
      
      ${params['분류'] ? `
        <div class="p-3 bg-gray-50 border-t border-gray-300 text-xs">
          <strong>분류:</strong> ${params['분류']}
        </div>
      ` : ''}
    </div>
  `;
}

// 컬러 박스 렌더링 함수
function renderColorBox(color: string, title: string, content: string): string {
  return `
    <div class="color-box rounded-lg p-4 my-4 border-l-4" style="border-left-color: ${color}; background-color: ${color}20;">
      <div class="font-bold text-lg mb-2" style="color: ${color};">${title}</div>
      <div class="text-gray-700">${content.replace(/\n/g, '<br>')}</div>
    </div>
  `;
}

// 카드그리드 렌더링 함수
function renderCardGrid(itemsStr: string): string {
  try {
    const items = JSON.parse(itemsStr);
    if (!Array.isArray(items)) return '';
    
    return `
      <div class="card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        ${items.map(item => `
          <div class="card-item bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            ${item.image ? `
              <div class="card-image">
                <img src="${item.image}" alt="${item.title || '이미지'}" class="w-full h-48 object-cover">
              </div>
            ` : ''}
            ${item.title ? `
              <div class="card-content p-4">
                <h3 class="font-semibold text-lg text-gray-800">${item.title}</h3>
                ${item.description ? `<p class="text-gray-600 text-sm mt-2">${item.description}</p>` : ''}
                ${item.date ? `<p class="text-gray-500 text-xs mt-2">${item.date}</p>` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    return `<div class="text-red-500 text-sm">카드그리드 데이터 파싱 오류: ${itemsStr}</div>`;
  }
}

// 간단한 인포박스 렌더링 함수
function renderSimpleInfobox(content: string): string {
  // 파라미터 파싱 (키=값 형태)
  const params: Record<string, string> = {};
  const pairs = content.split('|').map(s => s.trim()).filter(Boolean);
  
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      params[key.trim()] = valueParts.join('=').trim();
    }
  }
  
  return `
    <div class="simple-infobox bg-white border border-gray-300 rounded-lg shadow-lg float-right ml-4 mb-4 w-80 max-w-full">
      ${params['제목'] ? `
        <div class="bg-blue-600 text-white p-3 text-center font-bold text-lg">
          ${params['제목']}
        </div>
      ` : ''}
      
      ${params['이미지'] ? `
        <div class="p-4 text-center bg-gray-800">
          <img src="${params['이미지']}" alt="${params['제목'] || '이미지'}" class="w-full max-w-64 mx-auto rounded">
        </div>
      ` : ''}
      
      <div class="border-t border-gray-300">
        <table class="w-full text-sm">
          ${Object.entries(params)
            .filter(([key]) => !['제목', '이미지'].includes(key))
            .map(([key, value]) => `
              <tr class="border-b border-gray-200">
                <td class="bg-blue-600 text-white px-3 py-2 font-semibold w-24">${key}</td>
                <td class="px-3 py-2">${value}</td>
              </tr>
            `).join('')}
        </table>
      </div>
    </div>
  `;
}

// 앵커 ID 생성 함수
function generateAnchor(children: any): string {
  if (typeof children === 'string') {
    return toSlug(children)
  }
  if (Array.isArray(children)) {
    return toSlug(
      children
        .map(child => (typeof child === 'string' ? child : ''))
        .join('')
    )
  }
  return ''
}

// 나무위키 특수 문법 전처리
function preprocessNamuWikiSyntax(content: string): string {
  let processed = content;

  // ⭐ 템플릿 처리를 가장 먼저 실행 (다른 문법 처리보다 우선)
  
  // 라인 앵커 기반 블록 매칭으로 1차 치환 (공백/빈줄 허용)
  processed = replacePersonInfoboxBlocks(processed);

  // 인물 정보상자 템플릿 처리 (색상 속성 지원)
  processed = processed.replace(/\{\{인물정보상자(<[^>]+>)?\s*([\s\S]*?)\}\}/g, (_match, colorAttribs: string, content: string) => {
    console.log('🎯 인물정보상자 템플릿 감지됨!', content.substring(0, 100) + '...'); // 디버깅용
    return renderPersonInfobox(content, colorAttribs);
  });

  // 그룹정보상자 템플릿 처리 (색상 속성 지원)
  processed = processed.replace(/\{\{그룹정보상자(<[^>]+>)?\s*([\s\S]*?)\}\}/g, (_match, colorAttribs: string, content: string) => {
    console.log('🎯 그룹정보상자 템플릿 감지됨!', content.substring(0, 100) + '...'); // 디버깅용
    return renderGroupInfobox(content, colorAttribs);
  });

  // 기본 정보상자 템플릿 처리 (색상 속성 지원)
  processed = processed.replace(/\{\{정보상자(<[^>]+>)?\s*([\s\S]*?)\}\}/g, (_match, colorAttribs: string, content: string) => {
    return renderBasicInfobox(content, colorAttribs);
  });

  // 정보박스 템플릿 처리 (컬러 박스)
  processed = processed.replace(/\{\{정보박스\|색상=([^|]+)\|제목=([^|]+)\|내용=([\s\S]*?)\}\}/g, (_m, color: string, title: string, content: string) => {
    return renderColorBox(color, title, content);
  });

  // 안내 틀 처리
  processed = processed.replace(/\{\{안내\|([^}]+)\}\}/g, (_m, content: string) => {
    return `<div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 my-4 flex items-start space-x-3">
      <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
      </svg>
      <div>${content}</div>
    </div>`;
  });

  // 주의 틀 처리
  processed = processed.replace(/\{\{주의\|([^}]+)\}\}/g, (_m, content: string) => {
    return `<div class="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 my-4 flex items-start space-x-3">
      <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <div>${content}</div>
    </div>`;
  });

  // 공사중 틀 처리
  processed = processed.replace(/\{\{공사중\|([^}]+)\}\}/g, (_m, content: string) => {
    return `<div class="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-4 my-4 flex items-start space-x-3">
      <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
      </svg>
      <div>🚧 ${content}</div>
    </div>`;
  });

  // 카드그리드 템플릿 처리
  processed = processed.replace(/\[\[카드그리드:\s*items=(\[.*?\])\]\]/g, (_m, itemsStr: string) => {
    return renderCardGrid(itemsStr);
  });

  // 인포박스 템플릿 처리 (간단한 버전)
  processed = processed.replace(/\[\[인포박스:\s*(.*?)\]\]/g, (_m, content: string) => {
    return renderSimpleInfobox(content);
  });

  // ⭐ 여기서부터 기본 나무위키 문법 처리

  // 나무위키 스타일 헤딩 (= 제목 =) → 마크다운 헤딩(#)
  processed = processed.replace(/^(\s*)(=+)\s*(.+?)\s*=+\s*$/gm, (_m, indent: string, eqs: string, title: string) => {
    const level = Math.min(eqs.length, 6)
    return `${indent}${'#'.repeat(level)} ${title}`
  })

  // 나무위키 스타일 각주 [*1] 또는 [*] -> <sup>[1]</sup> (자동 번호 지원)
  let footnoteCounter = 0
  const footnoteMapping: {[key: string]: number} = {}
  
  processed = processed.replace(/\[\*(\d*)\]/g, (match, num) => {
    const footnoteKey = num || 'auto'
    let footnoteNumber: number
    
    if (footnoteKey === 'auto' || footnoteKey === '') {
      footnoteCounter++
      footnoteNumber = footnoteCounter
    } else {
      if (!footnoteMapping[footnoteKey]) {
        footnoteCounter++
        footnoteNumber = footnoteCounter
        footnoteMapping[footnoteKey] = footnoteNumber
      } else {
        footnoteNumber = footnoteMapping[footnoteKey]
      }
    }
    
    return `<sup><a href="#footnote-${footnoteNumber}" class="text-primary-600 text-xs hover:text-primary-800 cursor-pointer underline" onclick="document.getElementById('footnote-${footnoteNumber}').scrollIntoView({behavior: 'smooth', block: 'center'}); document.getElementById('footnote-${footnoteNumber}').style.backgroundColor='#fef3c7'; setTimeout(() => document.getElementById('footnote-${footnoteNumber}').style.backgroundColor='', 2000)" title="각주 ${footnoteNumber}로 이동">[${footnoteNumber}]</a></sup>`
  });

  // 분류 링크 처리: [[분류:이름]] → /wiki/category/이름
  processed = processed.replace(/\[\[분류:([^\]]+)\]\]/g, (_m, name: string) => {
    const n = (name || '').trim()
    return `[분류:${n}](/wiki/category/${n})`
  })

  // 나무위키 스타일 내부 링크 [[문서|표시]] -> [표시](/wiki/slug)
  processed = processed.replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const parts = String(inner).split('|')
    const target = parts[0]?.trim() || ''
    const label = (parts[1] ?? parts[0] ?? '').trim()
    const slug = toSlug(target)
    return `[${label}](/wiki/${slug})`
  });

  // 나무위키 스타일 외부 링크 [http://example.com 링크텍스트] -> [링크텍스트](http://example.com)
  processed = processed.replace(/\[([^\s\]]+)\s+([^\]]+)\]/g, '[$2]($1)');

  // 상첨자 ^^텍스트^^ -> <sup>텍스트</sup>
  processed = processed.replace(/\^\^([^^]+)\^\^/g, '<sup class="text-xs">$1</sup>');

  // 하첨자 ,,텍스트,, -> <sub>텍스트</sub>
  processed = processed.replace(/,,([^,]+),,/g, '<sub class="text-xs">$1</sub>');

    // 파일/이미지 렌더링
    // [[파일:/uploads/wiki/name.png|캡션]] -> <img src="/uploads/wiki/name.png" alt="캡션" />
    processed = processed.replace(/\[\[파일:([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, p1: string, p2: string) => {
      const src = p1.trim()
      const caption = (p2 || '').trim()
      return `<img src="${src}" alt="${caption}" />`
    })
    // [이미지:/uploads/wiki/name.png]
    processed = processed.replace(/^\[이미지:([^\]]+)\]$/gm, (_m, p1: string) => {
      const src = p1.trim()
      return `<img src="${src}" />`
    })

  // 나무위키 스타일 볼드체와 기울임체는 ReactMarkdown이 자동 처리하므로 그대로 유지
  // **텍스트** 와 *텍스트* 는 ReactMarkdown이 자동으로 <strong>과 <em>으로 변환

  // 나무위키 스타일 취소선 ~~텍스트~~ -> ~~텍스트~~
  processed = processed.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 나무위키 스타일 밑줄 __텍스트__ -> <u>텍스트</u>
  processed = processed.replace(/__([^_]+)__/g, '<u>$1</u>');

  // 나무위키 스타일 색상 {{{#색상 텍스트}}} -> <span style="color: 색상">텍스트</span>
  processed = processed.replace(/\{\{\{#([a-fA-F0-9]{6}|[a-zA-Z]+)\s+([^}]+)\}\}\}/g, (_m, color: string, text: string) => {
    const cssColor = /^[a-fA-F0-9]{6}$/.test(color) ? `#${color}` : color
    return `<span style=\"color: ${cssColor}\">${text}</span>`
  });

  // 나무위키 스타일 폴더 {{{+1 큰텍스트}}} -> <span class="text-lg font-bold">큰텍스트</span>
  processed = processed.replace(/\{\{\{\+(\d+)\s+([^}]+)\}\}\}/g, '<span class="text-lg font-bold">$2</span>');

  // 나무위키 스타일 작은텍스트 {{{-1 작은텍스트}}} -> <span class="text-sm">작은텍스트</span>
  processed = processed.replace(/\{\{\{-(\d+)\s+([^}]+)\}\}\}/g, '<span class="text-sm">$2</span>');

  return processed;
}

// 나무위키 스타일 알림 박스 컴포넌트
const NamuAlertBox = ({ type, children }: { type: 'info' | 'warning' | 'success' | 'error', children: React.ReactNode }) => {
  const styles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: AlertTriangle },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: XCircle },
  };

  const style = styles[type];
  const IconComponent = style.icon;

  return (
    <motion.div
      className={`${style.bg} ${style.border} ${style.text} border rounded-lg p-4 my-4 flex items-start space-x-3`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
    </motion.div>
  );
};

export default function NamuMarkdownRenderer({
  content,
  onInternalLinkClick,
  generateTableOfContents = false,
  onTocGenerated
}: NamuMarkdownRendererProps) {
  // 나무위키 문법 전처리
  const processedContent = preprocessNamuWikiSyntax(content);

  // 알림 박스 처리
  const contentWithAlerts = processedContent.replace(
    /:::(\w+)\s*([\s\S]*?):::/g,
    (match, type, content) => {
      return `<div data-alert="${type}">${content.trim()}</div>`;
    }
  );

  return (
    <div className="namu-wiki-content prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          ...NamuComponents,
          div: ({ children, ...props }: any) => {
            const alertType = props['data-alert'];
            if (alertType) {
              return (
                <NamuAlertBox type={alertType}>
                  {children}
                </NamuAlertBox>
              );
            }
            return <div {...props}>{children}</div>;
          }
        }}
      >
        {contentWithAlerts}
      </ReactMarkdown>

      <style>{`
        .namu-wiki-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
          line-height: 1.7;
        }
        
        .namu-wiki-content del {
          text-decoration: line-through;
          opacity: 0.7;
        }
        
        .namu-wiki-content u {
          text-decoration: underline;
        }
        
        .namu-wiki-content table {
          font-size: 0.9em;
        }
        
        .namu-wiki-content blockquote {
          position: relative;
        }
        
        .namu-wiki-content blockquote::before {
          content: '"';
          font-size: 3rem;
          color: #3B82F6;
          position: absolute;
          left: -0.5rem;
          top: -1rem;
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
} 
