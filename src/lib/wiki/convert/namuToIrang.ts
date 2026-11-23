/**
 * 나무위키 문법 → 이랑위키 문법 변환기 (v2). 입력 글만 보고 결과를 내는 순수 함수다.
 *
 * 처리 순서 — 바깥 구조부터 안쪽으로:
 *  1. 블록   — ``` 코드 블록과 `인라인 코드` 는 가려 두고(손대지 않음), `{{{ … }}}` 블록을 읽는다
 *              `{{{#!folding}}}` → `>>>`…`<<<`, `{{{#!wiki}}}` → `:::상자`…`:::`, `{{{#!syntax}}}` → ```언어
 *  2. 표 줄  — `||` 로 시작해 `||` 로 끝나는 줄의 병합·지시자·공백 정렬
 *  3. 줄     — 넘겨주기, 주석, 목록, 인용
 *  4. 줄 안  — 링크·그림 옵션, 매크로, 취소선, 이름 붙은 각주
 *
 * 이미 이랑위키 문법인 문서를 넣어도 바뀌지 않아야 한다(운영 문서 70개로 확인).
 * 두 문법에서 뜻이 같은 것은 그대로 둔다 — 굵게·기울임·밑줄·위첨자·아래첨자·색·크기·`~~취소~~`·제목 등.
 * 그래서 두 문법이 같게 읽는 것은 고쳐 쓰지 않는다:
 *  - `>글`, `>>글` 은 이랑위키도 인용·안쪽 인용으로 읽는다 → 그대로. `>>>` 부터만 `> > >` 로 푼다(이랑위키에서 `>>>` 는 접기)
 *  - `----`~`---------` 은 이랑위키도 가로줄로 그린다 → 그대로
 *  - 표 공백 정렬(`|| 글 ||` → `<가운데>`)과 그림 옵션(`width=300` → `300px`)은 문서에 이랑위키에만 있는 문법이
 *    하나도 없을 때만 바꾼다. 이랑위키 표는 `|| 글 ||` 로 쓰고 왼쪽 정렬로 읽으며,
 *    운영 문서는 `[[파일:/주소|width=300]]` 을 쓰고 이랑위키도 그 모양을 읽기 때문이다 (looksLikeIrang)
 */
import { convertInclude, findIncludeEnd } from './namuInclude'
import { convertImageOptions, convertNamuMacro } from './namuMacros'
import { readAttributes, wikiBoxOptions } from './namuStyle'

export type ConvertWarning = { line: number; kind: 'unsupported' | 'lossy'; message: string }

type Warn = (line: number, kind: ConvertWarning['kind'], message: string) => void

interface Line {
  /** 바꾸는 중인 글 — 손대면 안 되는 부분(코드 등)은 토큰으로 가려 둔다 */
  text: string
  /** 원문 줄 번호 (1부터) */
  line: number
  /** 그대로 내보내는 줄 (코드 블록, 남겨 둔 `{{{#!…}}}` 블록의 가운데 줄) */
  raw: boolean
  /** 변환기가 만든 줄 (``` 울타리, `>>>`·`<<<`, `:::상자`·`:::`) — 원문이 이랑위키인지 가늠할 때 빼고 본다 */
  generated?: boolean
  /** 블록을 지우거나 떼어 낸 뒤 남은 조각 — 비어 있으면 줄째 뺀다 */
  dropIfBlank?: boolean
  /** 바로 위 목록 항목에 `[br]` 로 이어 붙일 줄 */
  continuation?: boolean
  /** 남겨 둔 여러 줄 `{{{#!…}}}` 블록의 첫 줄·끝 줄 — 목록 항목에 이어 붙이지 않는다 */
  blockEdge?: boolean
  /** 줄 단위·줄 안 변환을 건너뛸 줄 (이랑위키 접기 `>>>`·`<<<`, 바꾼 주석, 만든 상자 줄) */
  done?: boolean
}

/* ── 가림 토큰 ─────────────────────────────────────────── */

const TOKEN_OPEN = '\uE000'
const TOKEN_CLOSE = '\uE001'
const TOKEN = /\uE000(\d+)\uE001/g

class Tokens {
  private values: string[] = []

  add(value: string): string {
    this.values.push(value)
    return `${TOKEN_OPEN}${this.values.length - 1}${TOKEN_CLOSE}`
  }

  /** 한 번만 훑는다 — 토큰 값 안의 토큰은 값 쪽에서 풀고, 풀어 낸 글을 다시 훑지 않는다 */
  restore(text: string): string {
    return text.replace(TOKEN, (_, index: string) => this.restore(this.values[Number(index)] ?? ''))
  }
}

/** `` `코드` ``, ``` ``코드`` ``` — 같은 길이의 백틱 묶음으로 닫히는 인라인 코드를 가린다 */
function maskInlineCode(text: string, tokens: Tokens): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const start = text.indexOf('`', i)
    if (start < 0) {
      out += text.slice(i)
      break
    }
    out += text.slice(i, start)
    let run = 0
    while (text[start + run] === '`') run++
    let close = -1
    let j = start + run
    while (j < text.length) {
      const k = text.indexOf('`', j)
      if (k < 0) break
      let r = 0
      while (text[k + r] === '`') r++
      if (r === run) {
        close = k
        break
      }
      j = k + r
    }
    if (close < 0) {
      out += text.slice(start, start + run)
      i = start + run
      continue
    }
    out += tokens.add(text.slice(start, close + run))
    i = close + run
  }
  return out
}

/* ── 1. 블록 ───────────────────────────────────────────── */

type BraceKind = 'style' | 'code' | 'remove' | 'keep' | 'fold' | 'box' | 'syntax'

const FENCE = /^\s*```/

/** `{{{` 바로 뒤 글자로 블록 종류를 가른다 */
function classifyBrace(rest: string): { kind: BraceKind; name?: string } {
  const bang = rest.match(/^#!([A-Za-z]*)/)
  if (bang) {
    const name = bang[1].toLowerCase()
    if (name === 'html' || name === 'if') return { kind: 'remove', name }
    if (name === 'folding') return { kind: 'fold', name }
    if (name === 'wiki') return { kind: 'box', name }
    if (name === 'syntax') return { kind: 'syntax', name }
    return { kind: 'keep', name: name || '!' }
  }
  // 색 {{{#색 글}}} · 크기 {{{+1 글}}} {{{-1 글}}} · 이랑위키 배지 {{{배지 글}}} · 글꼴 {{{font:이름 글}}}
  // 크기는 +·- 뒤에 숫자가 와야 한다 — {{{--글--}}} 은 문법 무시 글이다
  if (/^(?:#|[+-]\d)/.test(rest) || /^(?:배지|font:)/.test(rest)) return { kind: 'style' }
  return { kind: 'code' }
}

/** `{{{` 부터 짝이 맞는 `}}}` 까지 — 중간의 `{{{ }}}` 쌍을 센다. 코드 블록을 만나면 못 찾은 것으로 본다 */
function findBraceEnd(masked: string[], fence: boolean[], line: number, col: number): { line: number; col: number } | null {
  let depth = 0
  for (let l = line; l < masked.length; l++) {
    if (l !== line && fence[l]) return null
    const text = masked[l]
    let p = l === line ? col : 0
    while (p < text.length) {
      if (text.startsWith('{{{', p)) {
        depth++
        p += 3
      } else if (text.startsWith('}}}', p)) {
        depth--
        p += 3
        if (depth === 0) return { line: l, col: p }
      } else {
        p++
      }
    }
  }
  return null
}

const REMOVED_MESSAGE = (name: string) => `{{{#!${name}}}} 블록은 이랑위키에서 쓸 수 없어 지웠습니다.`

/** 남겨 두는 블록 안에 든 `{{{#!html}}}`·`{{{#!if}}}` 도 지운다 */
function stripUnsafeBlocks(text: string, firstLine: number, warn: Warn): string {
  const pattern = /\{\{\{#!(html|if)\b/gi
  let out = ''
  let from = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index < from) continue
    const line = firstLine + (text.slice(0, match.index).match(/\n/g)?.length ?? 0)
    warn(line, 'unsupported', REMOVED_MESSAGE(match[1].toLowerCase()))
    let depth = 0
    let p = match.index
    let end = -1
    while (p < text.length) {
      if (text.startsWith('{{{', p)) {
        depth++
        p += 3
      } else if (text.startsWith('}}}', p)) {
        depth--
        p += 3
        if (depth === 0) {
          end = p
          break
        }
      } else {
        p++
      }
    }
    if (end < 0) {
      const lineEnd = text.indexOf('\n', match.index)
      end = lineEnd < 0 ? text.length : lineEnd
    }
    out += text.slice(from, match.index)
    from = end
    pattern.lastIndex = end
  }
  return out + text.slice(from)
}

function inlineCode(content: string, line: number, warn: Warn): string {
  if (!content) return ''
  if (!content.includes('`')) return `\`${content}\``
  warn(line, 'lossy', '백틱(`)이 든 {{{문법 무시}}} 글은 이랑위키 인라인 코드로 정확히 옮겨지지 않을 수 있습니다.')
  return `\`\` ${content} \`\``
}

/** 여러 줄 블록 뒤 새 줄로 시작하는 나머지 글의 앞 공백은 버린다 */
function skipSpaces(text: string, col: number): number {
  while (col < text.length && /[ \t]/.test(text[col])) col++
  return col
}

/** 접기·상자 블록의 닫는 `}}}` — 그 자리에 닿으면 닫는 줄을 낸다 */
interface PendingClose {
  line: number
  /** 닫는 `}}}` 가 시작하는 칸 */
  col: number
  /** `}}}` 다음 칸 */
  after: number
  /** 닫는 줄 (`<<<`, `:::`) — 겹친 접기처럼 닫는 줄이 없으면 null */
  text: string | null
  fold: boolean
}

function readBlocks(source: string[], tokens: Tokens, warn: Warn): Line[] {
  const count = source.length
  // ``` 코드 블록 — 렌더러와 같게 ``` 로 시작하는 줄이 열고, 다음 ``` 줄이 닫는다
  const fence: boolean[] = new Array(count).fill(false)
  let inFence = false
  for (let i = 0; i < count; i++) {
    const isFenceLine = FENCE.test(source[i])
    if (inFence) {
      fence[i] = true
      if (isFenceLine) inFence = false
    } else if (isFenceLine) {
      fence[i] = true
      inFence = true
    }
  }
  const masked = source.map((text, i) => (fence[i] ? text : maskInlineCode(text, tokens)))

  const out: Line[] = []
  const pending: PendingClose[] = []
  let i = 0
  while (i < count) {
    if (fence[i]) {
      out.push({ text: source[i], line: i + 1, raw: true })
      i++
      continue
    }

    let li = i
    let col = 0
    let acc = ''
    let accLine = i + 1
    let dropIfBlank = false
    let blockEdge = false
    /** 지금까지 모은 글을 한 줄로 내보내고 새 줄을 시작한다 */
    const flush = () => {
      if (acc.trim()) out.push({ text: acc.trimEnd(), line: accLine, raw: false, blockEdge })
    }
    const startFresh = (line: number, at: number) => {
      li = line
      col = skipSpaces(masked[line], at)
      acc = ''
      accLine = line + 1
      dropIfBlank = true
      blockEdge = false
    }
    for (;;) {
      const text = masked[li]
      const close = pending.length > 0 && pending[pending.length - 1].line === li ? pending[pending.length - 1] : null
      const limit = close ? close.col : text.length
      const found = text.indexOf('{{{', col)
      const at = found >= 0 && found < limit ? found : -1
      if (at < 0) {
        acc += text.slice(col, limit)
        if (close) {
          // 접기·상자 끝
          pending.pop()
          flush()
          if (close.text !== null) out.push({ text: close.text, line: li + 1, raw: false, generated: true, done: true })
          startFresh(li, close.after)
          continue
        }
        if (!(dropIfBlank && !acc.trim())) out.push({ text: acc, line: accLine, raw: false, dropIfBlank, blockEdge })
        i = li + 1
        break
      }
      const escaped = at > 0 && text[at - 1] === '\\'
      const classified = classifyBrace(text.slice(at + 3))
      let kind = classified.kind
      const name = classified.name
      if (escaped || kind === 'style') {
        acc += text.slice(col, at + 3)
        col = at + 3
        continue
      }
      const end = findBraceEnd(masked, fence, li, at)
      if (!end) {
        if (kind === 'remove') {
          // 닫히지 않은 #!html — 그 줄의 나머지를 지운다
          warn(li + 1, 'unsupported', REMOVED_MESSAGE(name ?? 'html'))
          acc += text.slice(col, at)
          col = limit
          dropIfBlank = true
        } else {
          acc += text.slice(col, at + 3)
          col = at + 3
        }
        continue
      }
      acc += text.slice(col, at)
      const sameLine = end.line === li
      // 줄 가운데(예: 표 칸 안)에 연 접기·상자는 줄 구조를 깨지 않도록 그대로 둔다
      if ((kind === 'fold' || kind === 'box') && acc.trim()) kind = 'keep'

      if (kind === 'fold' || kind === 'box') {
        const headerEnd = sameLine ? end.col - 3 : text.length
        if (kind === 'fold') {
          // {{{#!folding 문구 → >>> 문구 (문구는 그 줄 끝까지)
          const title = tokens.restore(text.slice(at + 3 + '#!folding'.length, headerEnd)).trim()
          const nested = pending.some((p) => p.fold)
          if (nested) {
            warn(li + 1, 'lossy', '접기 안의 접기는 이랑위키에서 겹칠 수 없어 굵은 제목 줄로 바꿨습니다.')
            if (title) out.push({ text: `'''${title}'''`, line: li + 1, raw: false, generated: true, done: true })
          } else {
            out.push({ text: title ? `>>> ${title}` : '>>>', line: li + 1, raw: false, generated: true, done: true })
          }
          pending.push({ line: end.line, col: end.col - 3, after: end.col, text: nested ? null : '<<<', fold: !nested })
          startFresh(li, headerEnd)
          continue
        }
        // {{{#!wiki style="…" → :::상자 …
        const headerStart = at + 3 + '#!wiki'.length
        const { attributes, end: attributesEnd } = readAttributes(tokens.restore(text.slice(headerStart, headerEnd)))
        const masks = text.slice(headerStart, headerEnd)
        const box = wikiBoxOptions(attributes)
        if (box.dropped.length) {
          warn(li + 1, 'lossy', `{{{#!wiki}}} 꾸밈 중 이랑위키 상자로 옮기지 못한 것을 뺐습니다: ${box.dropped.join(', ')}`)
        }
        out.push({ text: box.options ? `:::상자 ${box.options}` : ':::상자', line: li + 1, raw: false, generated: true, done: true })
        pending.push({ line: end.line, col: end.col - 3, after: end.col, text: ':::', fold: false })
        // 속성 뒤 같은 줄에 쓴 글은 상자 안 첫 줄 (속성 값에 토큰이 없을 때만 칸을 맞출 수 있다)
        const contentStart = masks.includes(TOKEN_OPEN) ? headerEnd : headerStart + attributesEnd
        startFresh(li, contentStart)
        continue
      }

      if (kind === 'code' || kind === 'syntax') {
        let firstStart = at + 3
        let fenceOpen = '```'
        if (kind === 'syntax') {
          // {{{#!syntax 언어 → ```언어
          const header = text.slice(at + 3).match(/^#!syntax(?:[ \t]+([^\s]+))?/i)!
          const lang = header[1] ? tokens.restore(header[1]) : ''
          if (/^[A-Za-z0-9_+#.-]{1,30}$/.test(lang)) fenceOpen = `\`\`\`${lang}`
          else if (lang) warn(li + 1, 'lossy', '{{{#!syntax}}} 의 언어 이름을 읽지 못해 뺐습니다.')
          firstStart = at + 3 + header[0].length
        }
        if (kind === 'code' && sameLine) {
          acc += tokens.add(inlineCode(tokens.restore(text.slice(at + 3, end.col - 3)), li + 1, warn))
          col = end.col
          continue
        }
        // 여러 줄 {{{ … }}} 와 {{{#!syntax}}} → ``` 코드 블록 (안의 글은 그대로)
        flush()
        const body: Array<{ text: string; line: number }> = []
        const first = tokens.restore(text.slice(firstStart, sameLine ? end.col - 3 : text.length))
        if (first.trim()) body.push({ text: kind === 'syntax' ? first.replace(/^[ \t]/, '') : first, line: li + 1 })
        if (!sameLine) {
          for (let k = li + 1; k < end.line; k++) body.push({ text: source[k], line: k + 1 })
          const last = tokens.restore(masked[end.line].slice(0, end.col - 3))
          if (last.trim()) body.push({ text: last, line: end.line + 1 })
        }
        if (body.some((b) => FENCE.test(b.text))) {
          warn(li + 1, 'lossy', '코드 안에 ``` 로 시작하는 줄이 있어 이랑위키 코드 블록이 거기서 끝납니다.')
        }
        out.push({ text: fenceOpen, line: li + 1, raw: true, generated: true })
        for (const b of body) out.push({ text: b.text, line: b.line, raw: true, generated: true })
        out.push({ text: '```', line: end.line + 1, raw: true, generated: true })
        startFresh(end.line, end.col)
        continue
      }

      if (kind === 'remove') {
        warn(li + 1, 'unsupported', REMOVED_MESSAGE(name ?? 'html'))
        dropIfBlank = true
        if (!sameLine) {
          flush()
          startFresh(end.line, end.col)
          continue
        } else if (/\s$/.test(acc) && /^(?:\s|$)/.test(text.slice(end.col, limit))) {
          acc = acc.trimEnd() // `글 {{{#!html …}}} 끝` → `글 끝`, 줄 끝이면 뒤 공백도 버린다
        }
        col = end.col
        continue
      }

      // keep — 아직 옮기지 못하는 #! 블록은 그대로 둔다
      warn(li + 1, 'unsupported', `{{{#!${name}}}} 블록은 아직 옮기지 못해 그대로 두었습니다.`)
      const blockSource = sameLine
        ? tokens.restore(text.slice(at, end.col))
        : [
            tokens.restore(text.slice(at)),
            ...source.slice(li + 1, end.line),
            tokens.restore(masked[end.line].slice(0, end.col)),
          ].join('\n')
      const cleaned = stripUnsafeBlocks(blockSource, li + 1, warn).split('\n')
      if (cleaned.length === 1) {
        acc += tokens.add(cleaned[0])
        if (!sameLine) li = end.line
        col = end.col
        continue
      }
      acc += tokens.add(cleaned[0])
      out.push({ text: acc, line: accLine, raw: false, dropIfBlank, blockEdge: true })
      for (let k = 1; k < cleaned.length - 1; k++) out.push({ text: cleaned[k], line: li + 1 + k, raw: true })
      acc = tokens.add(cleaned[cleaned.length - 1])
      accLine = end.line + 1
      li = end.line
      col = end.col
      dropIfBlank = false
      blockEdge = true
    }
  }
  return out
}

/* ── 2. 표 ─────────────────────────────────────────────── */

const SIDE: Record<string, string> = { left: '왼쪽', center: '가운데', right: '오른쪽' }
/** 표 지시자에 들어 있으면 지우는 것 — CSS·스크립트 주입 */
const UNSAFE_DIRECTIVE = /javascript:|vbscript:|data:|expression\s*\(|url\s*\(|\bstyle\s*=/i
const ALIGN_DIRECTIVE = /^(?:왼쪽|가운데|오른쪽)$|^(?:table|row|col)?align[:=]/i

function isTableRow(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length >= 4 && trimmed.startsWith('||') && trimmed.endsWith('||')
}

/** 칸 맨 앞 `<…>` 하나를 이랑위키 지시자로 바꾼다. 지워야 하면 null */
function convertDirective(inner: string): { text: string | null; align: boolean } {
  const body = inner.trim()
  if (UNSAFE_DIRECTIVE.test(body)) return { text: null, align: false }
  if (body === '(') return { text: '<왼쪽>', align: true }
  if (body === ':') return { text: '<가운데>', align: true }
  if (body === ')') return { text: '<오른쪽>', align: true }
  const vertical = body.match(/^([\^v])\|(\d*)$/)
  if (vertical) {
    const n = Number(vertical[2] || '1')
    return { text: `<${vertical[1] === '^' ? '위' : '아래'}>${n > 1 ? `<|${n}>` : ''}`, align: false }
  }
  const color = body.match(/^(#[0-9A-Za-z]+(?:,\s*#[0-9A-Za-z]+)?)$/)
  if (color) return { text: `<bgcolor=${color[1].replace(/\s+/g, '')}>`, align: false }
  const tableAlign = body.match(/^table\s*align\s*=\s*"?(left|center|right)"?$/i)
  if (tableAlign) return { text: `<표위치:${SIDE[tableAlign[1].toLowerCase()]}>`, align: false }
  if (/^(?:table\s*)?sortable$/i.test(body)) return { text: '<정렬버튼>', align: false }
  const tableAttr = body.match(/^table\s+([A-Za-z]+\s*=.*)$/i)
  if (tableAttr) return { text: `<table${tableAttr[1]}>`, align: false }
  return { text: `<${inner}>`, align: ALIGN_DIRECTIVE.test(body) }
}

function convertCell(cell: string, span: number, line: number, spaceAlign: boolean, warn: Warn): string {
  let rest = cell
  let directives = ''
  let explicitAlign = false
  let changed = span > 1
  for (;;) {
    const m = rest.match(/^<([^<>\n]*)>/)
    if (!m) break
    const converted = convertDirective(m[1])
    if (converted.text === null) {
      warn(line, 'unsupported', '안전하지 않은 표 지시자(style·javascript 등)를 지웠습니다.')
      changed = true
    } else {
      if (converted.text !== m[0]) changed = true
      directives += converted.text
    }
    explicitAlign = explicitAlign || converted.align
    rest = rest.slice(m[0].length)
  }
  // 칸 가운데에 섞인 위험한 <…> 도 지운다
  rest = rest.replace(/<([^<>\n]*)>/g, (full, inner: string) => {
    if (!/javascript:|vbscript:|expression\s*\(|\bstyle\s*=/i.test(inner)) return full
    warn(line, 'unsupported', '안전하지 않은 표 지시자(style·javascript 등)를 지웠습니다.')
    changed = true
    return ''
  })

  let align = ''
  if (spaceAlign && !explicitAlign && rest.trim()) {
    const left = /^\s/.test(rest)
    const right = /\s$/.test(rest)
    if (left && right) align = '<가운데>'
    else if (left) align = '<오른쪽>'
  }
  if (!changed && !align) return cell
  return `${span > 1 ? `<-${span}>` : ''}${align}${directives}${rest}`
}

function convertTableRow(text: string, line: number, spaceAlign: boolean, warn: Warn): string {
  const lead = text.match(/^\s*/)![0]
  const trail = text.match(/\s*$/)![0]
  const body = text.slice(lead.length, text.length - trail.length).slice(2, -2)
  const cells = body.split('||')
  const out: string[] = []
  let span = 1
  for (let c = 0; c < cells.length; c++) {
    // 나무위키 병합: 칸 앞에 붙여 쓴 빈 || (띄어 쓴 || || 는 진짜 빈 칸)
    if (cells[c] === '' && c < cells.length - 1) {
      span++
      continue
    }
    out.push(convertCell(cells[c], span, line, spaceAlign, warn))
    span = 1
  }
  return `${lead}||${out.join('||')}||${trail}`
}

/* ── 3·4. 줄과 줄 안 ───────────────────────────────────── */

const NAMU_HEADING = /^=+#? .+ #?=+$/
const MARKDOWN_HEADING = /^(?:# |#{3,6} )/

/** 이미 이랑위키 문법이 쓰인 문서인지 — 두 문법에서 뜻이 갈리거나 이랑위키도 읽는 모양을 그대로 둘 때 쓴다 */
function looksLikeIrang(lines: Line[]): boolean {
  return lines.some((l) => {
    if (l.generated) return false
    if (l.raw) return FENCE.test(l.text)
    const t = l.text
    return (
      /^\s*\[\[(?:목차|각주)(?::[^\]]*)?\]\]\s*$/.test(t) ||
      /^\s*\{\{(?!\{)/.test(t) ||
      /^\s*:::/.test(t) ||
      MARKDOWN_HEADING.test(t) ||
      /<(?:table|row|col)?(?:bgcolor|color|bordercolor|border|align|valign|font|width|height|bgimage):/i.test(t) ||
      /<(?:왼쪽|가운데|오른쪽|위|아래|머리글|단어줄바꿈|정렬버튼)>|<(?:가로|세로|높이|열배경|열글자|표위치)[:=]/.test(t) ||
      /\[[^\[\]\n]+\]\((?:https?:\/\/|\/)/.test(t) ||
      /\[이미지:|!icon:\{/.test(t) ||
      /\[(?:나이|디데이|유튜브|비메오|루비):|\[오늘\]/.test(t)
    )
  })
}

const NAMU_BULLET = /^( +)\*(?!\*)[ \t]*(.*)$/
const NAMU_ORDERED = /^( +)(1|[aAiI])\.(?:#(\d+))?(?:[ \t]+(.*)|[ \t]*$)/
const IRANG_TOP_ITEM = /^(?:[-*]|\d+\.|[aAiI]\.)[ \t]+\S/
const INDENTED_ITEM = /^[ \t]+(?:[-*]|\d+\.|[a-zA-Z]\.)(?:#\d+)?(?:[ \t]+\S|[ \t]*$)/

function convertListLine(text: string, line: number, warn: Warn): string | null {
  const bullet = text.match(NAMU_BULLET)
  if (bullet) return `${'  '.repeat(bullet[1].length - 1)}- ${bullet[2]}`.trimEnd()
  const ordered = text.match(NAMU_ORDERED)
  if (!ordered) return null
  const indent = '  '.repeat(ordered[1].length - 1)
  let marker = ordered[2]
  if (ordered[3] !== undefined) {
    if (marker === '1') marker = String(Number(ordered[3]))
    else warn(line, 'lossy', `${marker}. 목록의 시작 번호(#${ordered[3]})는 이랑위키에서 쓸 수 없어 뺐습니다.`)
  }
  return `${indent}${marker}. ${ordered[4] ?? ''}`.trimEnd()
}

interface InlineContext {
  /** 나무위키 문서로 보여 이랑위키도 읽는 모양까지 고쳐 쓸지 (그림 옵션) */
  namuDocument: boolean
  /** 나무위키 파일 이름 경고를 이미 냈는지 (문서당 한 번) */
  fileNameWarned: boolean
  /** 이랑위키에 있는 틀 이름 — 주어졌을 때만 없는 틀을 알린다 */
  knownTemplates: Set<string> | null
  tokens: Tokens
}

const INCLUDE_START = /(?<![\\[])\[include\(/gi

/**
 * `[include(틀:이름, 칸=값)]` → `{{이름|칸=값}}`. 링크 등 다른 줄 안 변환보다 먼저 한다 —
 * 바꾸지 못해 그대로 두는 것은 가려서 뒤의 변환이 손대지 않게 하고, 바꾼 부르기의 값은 뒤의 변환을 그대로 받는다.
 */
function convertIncludes(text: string, line: number, warn: Warn, context: InlineContext): string {
  let out = ''
  let from = 0
  INCLUDE_START.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = INCLUDE_START.exec(text)) !== null) {
    const argsStart = match.index + match[0].length
    const end = findIncludeEnd(text, argsStart)
    if (end < 0) continue
    const original = text.slice(match.index, end)
    const result = convertInclude(text.slice(argsStart, end - 2), (value) => context.tokens.restore(value))
    out += text.slice(from, match.index)
    if (result.kind === 'keep') {
      warn(line, result.note.kind, result.note.message)
      out += context.tokens.add(original)
    } else {
      if (result.reserved) {
        warn(line, 'lossy', `이랑위키가 직접 그리는 상자 이름(${result.name})이라 틀 대신 그 상자가 그려집니다.`)
      } else if (context.knownTemplates && !context.knownTemplates.has(result.name) && !context.knownTemplates.has(`틀:${result.name}`)) {
        warn(line, 'lossy', `틀:${result.name} 문서가 이랑위키에 없습니다. 먼저 만들어야 내용이 보입니다.`)
      }
      out += result.text
    }
    from = end
    INCLUDE_START.lastIndex = end
  }
  return out + text.slice(from)
}

const LINK = /(?<!\\)\[\[([^\[\]\n]+?)\]\]/g
const SECTION_NUMBER = /^(.*?)#s-[\d.]+$/
const FILE_TARGET = /^:?\s*(?:파일|file):(.*)$/i

function convertLinks(text: string, line: number, warn: Warn, context: InlineContext): string {
  return text.replace(LINK, (full, inner: string) => {
    const bar = inner.indexOf('|')
    const target = (bar < 0 ? inner : inner.slice(0, bar)).trim()
    const label = bar < 0 ? undefined : inner.slice(bar + 1)
    if (/^https?:\/\/\S+$/i.test(target)) {
      const url = target.replace(/\(/g, '%28').replace(/\)/g, '%29')
      return `[${label ?? target}](${url})`
    }
    const file = target.match(FILE_TARGET)
    if (file) {
      const address = file[1].trim()
      if (!context.fileNameWarned && !/^https?:\/\//i.test(address) && !address.startsWith('/')) {
        context.fileNameWarned = true
        warn(line, 'lossy', `나무위키 파일 이름(${address})은 이랑위키에 없습니다. 그림을 올린 뒤 주소로 바꿔 주세요.`)
      }
      // 그림 옵션 width=300&align=center … → 300px 가운데 … (그림 넣기만, [[:파일:…]] 링크는 아님)
      if (!target.startsWith(':') && label !== undefined && label.includes('=') && context.namuDocument) {
        const converted = convertImageOptions(label)
        if (converted.dropped.length) {
          warn(line, 'lossy', `그림 옵션 중 이랑위키에서 쓸 수 없는 것을 뺐습니다: ${converted.dropped.join(', ')}`)
        }
        return converted.text ? `[[${target}|${converted.text}]]` : `[[${target}]]`
      }
      return full
    }
    // 가린 분류 [[분류:X#blur]] → [[분류:X|가림]]
    const blurred = target.match(/^(분류|category):(.+)#blur$/i)
    if (blurred) return `[[분류:${blurred[2].trim()}|가림]]`
    const section = target.match(SECTION_NUMBER)
    if (section) {
      const page = section[1].trim()
      if (!page) {
        warn(line, 'lossy', `문단 번호 링크(${target})는 이랑위키에서 쓸 수 없어 글자만 남겼습니다.`)
        return label ?? target
      }
      warn(line, 'lossy', `문단 번호 링크(${target})는 이랑위키에서 쓸 수 없어 문서 링크로 바꿨습니다.`)
      return label === undefined ? `[[${page}]]` : `[[${page}|${label}]]`
    }
    return full
  })
}

const UNSUPPORTED_MACRO_NAMES = /^(?:date|datetime|pagecount)$/i

function convertMacros(text: string, line: number, warn: Warn): string {
  return text
    .replace(/(?<![\\[])\[(?:목차|tableofcontents)\(hide\)\](?!\])/gi, '[[목차:접기]]')
    .replace(/(?<![\\[])\[(?:목차|tableofcontents)\](?!\])/gi, '[[목차]]')
    .replace(/(?<![\\[])\[(?:각주|footnote)\](?!\])/gi, '[[각주]]')
    .replace(/(?<![\\[])\[([A-Za-z]+)(\((?:[^()\]\n]|\([^()\]\n]*\))*\))?\](?![\](])/g, (full, name: string, args?: string) => {
      if (args === undefined && !UNSUPPORTED_MACRO_NAMES.test(name)) return full
      const converted = convertNamuMacro(full, name, args === undefined ? undefined : args.slice(1, -1))
      if (converted) {
        for (const note of converted.notes) warn(line, note.kind, note.message)
        return converted.text
      }
      warn(line, 'unsupported', `[${name}${args ? '(…)' : ''}] 매크로는 아직 옮기지 못해 그대로 두었습니다.`)
      return full
    })
}

/** `--취소--` → `~~취소~~` — `---`, `-->`, `<--`, `<-2>` 는 건드리지 않는다 */
const STRIKE = /(?<![-<\\])--(?![-\s>])([^\n]*?[^\s-])--(?![->])/g

/**
 * 마크다운 링크 모양의 `[글](javascript:…)` — 나무위키에서는 그냥 글이지만 이랑위키에서는 살아 있는 링크가 되므로
 * 닫는 `]` 를 `\]` 로 이스케이프해 끊어 둔다 (화면에는 `[글](…)` 글자 그대로 나온다)
 */
const UNSAFE_MARKDOWN_LINK = /(\[[^\[\]\n]*?)(?<!\\)\](\(\s*(?:javascript|vbscript|data):)/gi

const NAMED_FOOTNOTE = /(?<!\\)\[\*([^\s\[\]]+)[ \t]+((?:\[\[[^\[\]\n]*\]\]|\[[^\[\]\n]*\]|[^\[\]\n])+)\]/g
const FOOTNOTE_REF = /(?<!\\)\[\*([^\s\[\]]+)\]/g

/** 넘겨주기 `#redirect 문서#s-1.2` — 문단 번호는 이랑위키에 없어 문서로만 넘긴다 */
const REDIRECT_SECTION_NUMBER = /^(\s*#\s*(?:redirect|넘겨주기)\s+)([^\[\]\n]*?)#s-[\d.]+\s*$/i

/* ── 변환 ──────────────────────────────────────────────── */

export interface ConvertOptions {
  /**
   * 이랑위키에 있는 틀 이름(`인사` 또는 `틀:인사`). 주면 `[include(틀:…)]` 에서 바꾼 부르기 중
   * 없는 틀마다 경고한다. 주지 않으면 틀이 있는지 따지지 않는다.
   */
  knownTemplates?: Iterable<string>
}

export function namuToIrang(src: string, options: ConvertOptions = {}): { text: string; warnings: ConvertWarning[] } {
  const warnings: ConvertWarning[] = []
  const warn: Warn = (line, kind, message) => {
    warnings.push({ line, kind, message })
  }
  const tokens = new Tokens()
  // 원문에 가림 토큰 글자가 있으면 그것부터 가린다
  const normalized = (src ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\uE000\uE001]/g, (ch) => tokens.add(ch))

  // 1. 블록
  const lines = readBlocks(normalized.split('\n'), tokens, warn)

  // 문서 전체를 보고 정하는 것들
  const body = lines.filter((l) => !l.raw && !l.generated)
  const convertComments = body.some((l) => NAMU_HEADING.test(l.text)) && !body.some((l) => MARKDOWN_HEADING.test(l.text))
  const namuDocument = !looksLikeIrang(lines)
  const context: InlineContext = {
    namuDocument,
    fileNameWarned: false,
    knownTemplates: options.knownTemplates ? new Set([...options.knownTemplates].map((name) => name.trim())) : null,
    tokens,
  }

  // 이랑위키 접기: 원문의 `>>>` 줄 아래에 원문의 `<<<` 줄이 있으면 둘 다 그대로
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.raw || l.generated || !l.text.startsWith('>>>')) continue
    const close = lines.findIndex((other, j) => j > i && !other.raw && !other.generated && /^\s*<<<\s*$/.test(other.text))
    if (close > 0) {
      l.done = true
      lines[close].done = true
    }
  }

  // 넘겨주기는 첫 줄에만 쓴다
  const first = lines.find((l) => l.text.trim() !== '')
  if (first && !first.raw && !first.generated) {
    const redirect = first.text.match(REDIRECT_SECTION_NUMBER)
    if (redirect) {
      first.text = `${redirect[1]}${redirect[2].trimEnd()}`
      warn(first.line, 'lossy', '넘겨주기의 문단 번호(#s-…)는 이랑위키에서 쓸 수 없어 문서로만 넘깁니다.')
    }
  }

  // 각주: 이미 쓴 번호 다음부터 이름 붙은 각주에 번호를 매긴다
  let nextNumber = 1
  for (const l of body) {
    for (const m of l.text.matchAll(/\[\*(\d+)/g)) nextNumber = Math.max(nextNumber, Number(m[1]) + 1)
  }
  const footnoteNumbers = new Map<string, number>()
  for (const l of body) {
    if (l.done) continue
    for (const m of l.text.matchAll(NAMED_FOOTNOTE)) {
      if (m[2].trim() && !footnoteNumbers.has(m[1])) footnoteNumbers.set(m[1], nextNumber++)
    }
  }
  const definitions: Array<{ number: number; text: string }> = []
  const definedNames = new Map<string, string>() // 이름 → 처음 적은 내용

  // 2·3·4. 표 줄 → 줄 → 줄 안
  let namuItem = false // 바로 위가 나무위키 목록 항목(또는 그 이어지는 줄)
  let irangList = false // 이랑위키 목록 안 — 들여 쓴 항목은 이랑위키 중첩 항목이다
  for (const l of lines) {
    if (l.raw || l.done) {
      namuItem = false
      irangList = false
      continue
    }
    let text = l.text

    if (isTableRow(text)) {
      text = convertTableRow(text, l.line, namuDocument, warn)
      namuItem = false
      irangList = false
    } else {
      // 주석
      if (convertComments && text.startsWith('##')) {
        l.text = `// ${text.slice(2).trimStart()}`.trimEnd()
        l.done = true
        namuItem = false
        irangList = false
        continue
      }
      // 목록
      const wasNamuItem = namuItem
      namuItem = false
      if (IRANG_TOP_ITEM.test(text)) {
        irangList = true
      } else if (irangList && INDENTED_ITEM.test(text)) {
        // 이랑위키 목록의 들여 쓴 항목 — 그대로
      } else {
        irangList = false
        const item = convertListLine(text, l.line, warn)
        if (item !== null) {
          text = item
          namuItem = true
        } else if (wasNamuItem && !l.blockEdge && /^ +\S/.test(text)) {
          l.continuation = true
          text = text.trim()
          namuItem = true
        }
      }
      // 인용: >>> 는 이랑위키에서 접기라 > > > 로 풀어 쓴다 (> 와 >> 는 두 문법에서 뜻이 같다)
      const quote = text.match(/^((?:>[ \t]?)+)(.*)$/)
      if (quote && text.startsWith('>>>')) {
        const depth = quote[1].replace(/[ \t]/g, '').length
        const extra = depth > 8 ? '>'.repeat(depth - 8) : ''
        text = `${'> '.repeat(Math.min(depth, 8))}${extra}${quote[2]}`.trimEnd()
      }
    }

    // 줄 안
    text = convertIncludes(text, l.line, warn, context)
    text = convertLinks(text, l.line, warn, context)
    text = convertMacros(text, l.line, warn)
    text = text.replace(STRIKE, '~~$1~~')
    text = text.replace(UNSAFE_MARKDOWN_LINK, (_, label: string, rest: string) => {
      warn(l.line, 'unsupported', '위험한 주소(javascript: 등)로 가는 링크 모양 글은 링크가 되지 않게 바꿨습니다.')
      return `${label}\\]${rest}`
    })
    if (footnoteNumbers.size > 0) {
      text = text.replace(NAMED_FOOTNOTE, (full, name: string, content: string) => {
        const number = footnoteNumbers.get(name)
        if (number === undefined || !content.trim()) return full
        const firstText = definedNames.get(name)
        if (firstText === undefined) {
          definedNames.set(name, content.trim())
          definitions.push({ number, text: content.trim() })
        } else if (firstText !== content.trim()) {
          warn(l.line, 'lossy', `이름이 같은 각주(${name})에 내용이 둘 이상 있어 처음 내용만 남겼습니다.`)
        }
        return `[*${number}]`
      })
      text = text.replace(FOOTNOTE_REF, (full, name: string) => {
        const number = footnoteNumbers.get(name)
        return number === undefined ? full : `[*${number}]`
      })
    }
    l.text = text
  }

  // 내보내기 — 이어지는 줄은 위 항목에 [br] 로 붙인다
  const out: string[] = []
  for (const l of lines) {
    const text = tokens.restore(l.text)
    if (l.dropIfBlank && !text.trim()) continue
    if (l.continuation && out.length > 0) {
      out[out.length - 1] += `[br]${text}`
      continue
    }
    out.push(text)
  }
  let result = out.join('\n')
  if (definitions.length > 0) {
    const trailing = result.match(/\n*$/)![0]
    result = `${result.slice(0, result.length - trailing.length)}\n\n${definitions
      .map((d) => `[*${d.number}] ${tokens.restore(d.text)}`)
      .join('\n')}${trailing}`
  }
  warnings.sort((a, b) => a.line - b.line)
  return { text: result, warnings }
}
