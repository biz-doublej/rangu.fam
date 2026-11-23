/**
 * 각주 규칙 — 렌더러(본문·각주 목록)와 문서 함수(각주 점검·링크 점검)가 같이 쓴다.
 * 두 곳이 서로 다르게 읽으면 "렌더러는 각주를 보여 주는데 점검은 내용 없는 번호라고 하는" 일이 생긴다.
 *
 * 1. 그 자리 각주 — `문장[*] 내용`, `문장[*1] 내용`
 *    `]` 뒤에 한 칸 띄우고 쓴 글이 각주 내용이다. 줄 끝, 다음 `[`, 표·정보상자 칸 경계 `|` 앞까지.
 *    `[[링크]]` 는 내용 안에 둘 수 있다. (운영 문서들이 `[*1] 내용` 도 이렇게 쓰고 있어서 번호 각주도 같은 규칙)
 * 2. 괄호 각주 — `문장[* 내용]뒤 문장` (나무위키 방식). 닫는 `]` 뒤로 본문을 이어 쓸 수 있다.
 * 3. 따로 적기 — 본문에 `[*1]`, 줄 맨 앞에 `[*1] 내용`.
 *    같은 번호를 이렇게 따로 적어 두었으면 본문의 `[*1] 글` 은 번호만 단 것으로 보고 글을 본문에 남긴다.
 *
 * 1·2의 자동 번호 각주는 본문에서 `[*@n]` 표시로 바뀌고 내용은 inline[n] 에 담긴다.
 * 코드 블록(```)과 인라인 코드(`…`) 안의 예시는 건드리지 않는다.
 */

export interface PreparedFootnotes {
  /** 본문 — 그 자리·괄호 각주의 내용을 걷어 내고 번호 표시만 남긴 글 */
  text: string
  /** `[*@n]` 의 내용 */
  inline: string[]
  /** 번호 각주의 내용 (줄 맨 앞에 따로 적은 것 + 그 자리에 적은 것) */
  definitions: Record<string, string>
  /** 줄 맨 앞에 따로 적은 번호 */
  definedOnOwnLine: Set<string>
  /** 본문에 나온 번호 (따로 적은 줄 제외) */
  numberedRefs: Set<string>
  /** 내용 없이 쓴 `[*]` 의 수 */
  bareRefs: number
}

const CODE = /```[\s\S]*?```|`[^`\n]*`/g
const MASK = /\u0000(\d+)\u0000/g
const DEFINITION_LINE = /^[ \t]*\[\*(\d+)\][ \t]+(\S.*)$/

// 내용에 들어갈 수 있는 것: [[링크]] 또는 줄바꿈·[·| 가 아닌 글자 (괄호 각주는 ] 도 아님)
const LINK = String.raw`\[\[[^\]\n]*\]\]`
const INLINE = new RegExp(
  String.raw`\[\*[ \t]+((?:${LINK}|[^\[\]\n|])+)\]` + // 괄호 각주 [* 내용]
    '|' +
    String.raw`\[\*(\d*)\][ \t]+((?:${LINK}|[^\[\n\r|])+)`, // 그 자리 각주 [*] 내용 / [*1] 내용
  'g'
)

/** 줄 맨 앞의 `[*1] 내용` — 따로 적은 각주 내용 줄 (본문에 그리지 않는다) */
export function isFootnoteDefinitionLine(line: string): boolean {
  return DEFINITION_LINE.test(line)
}

export function prepareFootnotes(raw: string): PreparedFootnotes {
  const code: string[] = []
  const masked = (raw || '').replace(CODE, (match) => {
    code.push(match)
    return `\u0000${code.length - 1}\u0000`
  })
  const unmask = (value: string) => value.replace(MASK, (_, index) => code[Number(index)] ?? '')

  const inline: string[] = []
  const definitions: Record<string, string> = {}
  const definedOnOwnLine = new Set<string>()
  const numberedRefs = new Set<string>()
  let bareRefs = 0

  const rawLines = masked.split('\n')
  // 먼저 줄 맨 앞에 따로 적은 번호를 모은다
  for (const line of rawLines) {
    const own = line.match(DEFINITION_LINE)
    if (own) {
      definitions[own[1]] = unmask(own[2].trim())
      definedOnOwnLine.add(own[1])
    }
  }

  const lines = rawLines.map((line) => {
    if (DEFINITION_LINE.test(line)) return line

    const next = line.replace(INLINE, (match, bracketBody?: string, key?: string, placeBody?: string) => {
      const body = unmask((bracketBody ?? placeBody ?? '').trim())
      if (!body) return match
      if (bracketBody === undefined && key) {
        // 따로 적은 번호면 뒤의 글은 본문이다
        if (definedOnOwnLine.has(key)) return match
        definitions[key] = body
        return `[*${key}]`
      }
      inline.push(body)
      return `[*@${inline.length - 1}]`
    })

    for (const ref of next.matchAll(/\[\*(\d*)\]/g)) {
      if (ref[1]) numberedRefs.add(ref[1])
      else bareRefs++
    }
    return next
  })

  return {
    text: unmask(lines.join('\n')),
    inline,
    definitions,
    definedOnOwnLine,
    numberedRefs,
    bareRefs,
  }
}
