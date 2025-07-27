'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { motion } from 'framer-motion'
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
    
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          {...props}
        >
          {children}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    
    if (isInternal) {
      return (
        <a
          href={href}
          className="text-primary-600 hover:text-primary-800 underline font-medium"
          {...props}
        >
          {children}
        </a>
      );
    }
    
    // 나무위키 내부 링크 스타일
    return (
      <span className="text-primary-600 hover:text-primary-800 underline cursor-pointer font-medium inline-flex items-center gap-1">
        <LinkIcon className="w-3 h-3" />
        {children}
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

// 앵커 ID 생성 함수
function generateAnchor(children: any): string {
  if (typeof children === 'string') {
    return children.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  if (Array.isArray(children)) {
    return children.map(child => 
      typeof child === 'string' ? child : ''
    ).join('').toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  return '';
}

// 나무위키 특수 문법 전처리
function preprocessNamuWikiSyntax(content: string): string {
  let processed = content;

  // 나무위키 스타일 각주 [*1] -> <sup>[1]</sup>
  processed = processed.replace(/\[\*(\d+)\]/g, '<sup><a href="#footnote-$1" class="text-primary-600 text-xs">[($1)]</a></sup>');

  // 나무위키 스타일 내부 링크 [[문서명]] -> [문서명](/wiki/문서명)
  processed = processed.replace(/\[\[([^\]]+)\]\]/g, '[$1](/wiki/$1)');

  // 나무위키 스타일 외부 링크 [http://example.com 링크텍스트] -> [링크텍스트](http://example.com)
  processed = processed.replace(/\[([^\s\]]+)\s+([^\]]+)\]/g, '[$2]($1)');

  // 나무위키 스타일 취소선 ~~텍스트~~ -> ~~텍스트~~
  processed = processed.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 나무위키 스타일 밑줄 __텍스트__ -> <u>텍스트</u>
  processed = processed.replace(/__([^_]+)__/g, '<u>$1</u>');

  // 나무위키 스타일 색상 {{{#색상 텍스트}}} -> <span style="color: 색상">텍스트</span>
  processed = processed.replace(/\{\{\{#([a-fA-F0-9]{6}|[a-zA-Z]+)\s+([^}]+)\}\}\}/g, '<span style="color: #$1">$2</span>');

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

      <style jsx global>{`
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