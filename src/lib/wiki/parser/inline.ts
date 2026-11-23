/**
 * 인라인 AST — 한 문단(또는 표 칸) 글을 글자·링크·서식·각주·매크로 노드로 나눈다.
 * 렌더러의 인라인 규칙과 같은 방식(가장 앞에서 시작하는 문법이 이기고, 같은 자리면 먼저 적은 규칙)으로 읽는다.
 * 목차·문서 함수·검색 발췌·OG 설명이 "읽히는 글자"와 링크를 꺼낼 때 쓴다.
 */
import { ESCAPE_JOINER } from '@/lib/wiki/source'

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'link'; target: string; children: Inline[] }
  | { type: 'external'; url: string; children: Inline[] }
  /** syntax: `[[파일:…]]` 인지 `[이미지:…]` 인지 */
  | { type: 'image'; src: string; syntax: 'file' | 'image' }
  | { type: 'footnote'; key: string }
  | { type: 'break' }
  | { type: 'code'; value: string }
  | { type: 'macro'; name: string; value: string }
  | { type: 'icon'; name: string }
  | { type: 'style'; style: 'bold' | 'italic' | 'strike' | 'underline' | 'sup' | 'sub' | 'color' | 'size' | 'badge' | 'font'; children: Inline[] }

interface Rule {
  regex: RegExp
  build: (match: RegExpExecArray) => Inline
}

const inner = (value: string) => parseInline(value)

const RULES: Rule[] = [
  // [글자](주소)
  { regex: /\[(?!br\])([^\]]+)\]\(([^)]+)\)/gi, build: (m) => ({ type: 'external', url: m[2], children: inner(m[1]) }) },
  { regex: /\[\[파일:([^\]|]+)(?:\|([^\]]+))?\]\]/g, build: (m) => ({ type: 'image', src: m[1].trim(), syntax: 'file' }) },
  { regex: /\[이미지:([^\]]+)\]/g, build: (m) => ({ type: 'image', src: m[1].trim(), syntax: 'image' }) },
  { regex: /\[br\]/gi, build: () => ({ type: 'break' }) },
  { regex: /\[(나이|디데이):(\d{4}-\d{1,2}-\d{1,2})\]|\[오늘\]/g, build: (m) => ({ type: 'macro', name: m[1] || '오늘', value: m[2] || '' }) },
  { regex: /\[(유튜브|youtube|비메오|vimeo|루비):([^\]\n]+)\]/gi, build: (m) => ({ type: 'macro', name: m[1], value: m[2] }) },
  // [[문서]] [[문서|보일 글자]]
  {
    regex: /\[\[([^\]]+)\]\]/g,
    build: (m) => {
      const bar = m[1].indexOf('|')
      const target = (bar < 0 ? m[1] : m[1].slice(0, bar)).trim()
      const label = bar < 0 ? target.replace(/^:(?=(파일|분류|file|category):)/i, '') : m[1].slice(bar + 1).trim()
      return { type: 'link', target, children: inner(label) }
    },
  },
  { regex: /\^\^([^^]+)\^\^/g, build: (m) => ({ type: 'style', style: 'sup', children: inner(m[1]) }) },
  { regex: /,,([^,]+),,/g, build: (m) => ({ type: 'style', style: 'sub', children: inner(m[1]) }) },
  { regex: /\[\*(@\d+|\d*)\]/g, build: (m) => ({ type: 'footnote', key: m[1] }) },
  { regex: /'''([^']+?)'''/g, build: (m) => ({ type: 'style', style: 'bold', children: inner(m[1]) }) },
  { regex: /''([^']+?)''/g, build: (m) => ({ type: 'style', style: 'italic', children: inner(m[1]) }) },
  { regex: /```([^`]+)```/g, build: (m) => ({ type: 'code', value: m[1] }) },
  { regex: /``([^`]+)``/g, build: (m) => ({ type: 'code', value: m[1] }) },
  { regex: /\*\*(.+?)\*\*/g, build: (m) => ({ type: 'style', style: 'bold', children: inner(m[1]) }) },
  { regex: /~~(.+?)~~/g, build: (m) => ({ type: 'style', style: 'strike', children: inner(m[1]) }) },
  { regex: /__(.+?)__/g, build: (m) => ({ type: 'style', style: 'underline', children: inner(m[1]) }) },
  // {{{#!wiki style="…" 줄바꿈 글}}} — 첫 줄(속성)은 글이 아니다
  { regex: /\{\{\{#!wiki[^\n]*\n([\s\S]*?)\}\}\}/g, build: (m) => ({ type: 'style', style: 'color', children: inner(m[1]) }) },
  // {{{#색 글}}} {{{+1 글}}} {{{배지 글}}} {{{font:이름 글}}} — 안쪽이 겹쳐 있어도 짝을 맞춰 읽는다
  {
    regex: /\{\{\{(#[^\s{}]+|[+-]\d|배지(?::[^\s{}]+)?|font:(?:"[^"]*"|[^\s{}]+))\s+((?:[^{}]|\{(?!\{\{)|\{\{\{(?:[^{}]|\{\{\{[^{}]*\}\}\})*\}\}\})*?)\}\}\}/g,
    build: (m) => {
      const head = m[1]
      const style = head.startsWith('#') ? 'color' : head.startsWith('배지') ? 'badge' : head.startsWith('font:') ? 'font' : 'size'
      return { type: 'style', style, children: inner(m[2]) }
    },
  },
  // {{{글}}} — 서식 없는 글 그대로
  { regex: /\{\{\{(?![#+-]|배지|font:)([^{}]*)\}\}\}/g, build: (m) => ({ type: 'code', value: m[1] }) },
  // {{틀|칸=값}} 같은 틀 부르기 — 펼치기 전 원문에서는 글이 아니다
  { regex: /\{\{(?!\{)(?:[^{}]|\{\{\{[^{}]*\}\}\})*?\}\}/g, build: (m) => ({ type: 'macro', name: 'template', value: m[0] }) },
  { regex: /(?<!`)`([^`\n]+)`(?!`)/g, build: (m) => ({ type: 'code', value: m[1] }) },
  { regex: /!icon:\{([^}]*)\}/g, build: (m) => ({ type: 'icon', name: m[1].split(',')[0].trim() }) },
  { regex: /https?:\/\/[^\s<>"'\])]+/g, build: (m) => ({ type: 'external', url: m[0], children: [{ type: 'text', value: m[0] }] }) },
]

export function parseInline(text: string): Inline[] {
  const source = text || ''
  if (!source) return []
  const matches: Array<{ index: number; end: number; order: number; match: RegExpExecArray; rule: Rule }> = []
  RULES.forEach((rule, order) => {
    const regex = new RegExp(rule.regex.source, rule.regex.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(source)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex++
        continue
      }
      matches.push({ index: match.index, end: match.index + match[0].length, order, match, rule })
    }
  })
  matches.sort((a, b) => a.index - b.index || a.order - b.order)

  const nodes: Inline[] = []
  let cursor = 0
  for (const found of matches) {
    if (found.index < cursor) continue
    if (found.index > cursor) nodes.push({ type: 'text', value: source.slice(cursor, found.index) })
    nodes.push(found.rule.build(found.match))
    cursor = found.end
  }
  if (cursor < source.length) nodes.push({ type: 'text', value: source.slice(cursor) })
  return nodes
}

/** 읽히는 글자 — 링크는 보일 글자, 그림·각주 표시·아이콘·동영상은 뺀다 */
export function inlineText(nodes: Inline[]): string {
  let out = ''
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value
        break
      case 'code':
        out += node.value
        break
      case 'break':
        out += ' '
        break
      case 'link':
        // [[분류:…]] [[파일:…]] 은 글이 아니다
        if (!/^:?(분류|category|파일|file):/i.test(node.target)) out += inlineText(node.children)
        break
      case 'external':
      case 'style':
        out += inlineText(node.children)
        break
      case 'macro':
        if (node.name === '루비') out += node.value.replace(/\([^()]*\)$/, '')
        break
      default:
        break
    }
  }
  return out.split(ESCAPE_JOINER).join('')
}

export type InlineLink = { type: 'link'; target: string } | { type: 'external'; url: string } | { type: 'file'; src: string }

/** 링크 노드를 문서 순서대로 (서식 안의 링크도). `[[파일:…]]` 그림은 file 로 */
export function inlineLinks(nodes: Inline[]): InlineLink[] {
  const out: InlineLink[] = []
  const walk = (list: Inline[]) => {
    for (const node of list) {
      if (node.type === 'link') {
        out.push({ type: 'link', target: node.target })
        walk(node.children)
      } else if (node.type === 'external') {
        out.push({ type: 'external', url: node.url })
        walk(node.children)
      } else if (node.type === 'image' && node.syntax === 'file') {
        out.push({ type: 'file', src: node.src })
      } else if (node.type === 'style') {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return out
}
