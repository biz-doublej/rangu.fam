/**
 * 렌더 전에 원문을 한 번 다듬는다 (렌더러와 문서 함수가 같이 쓴다). 코드 블록·인라인 코드 안은 건드리지 않는다.
 *
 * - `// 주석` — 줄 맨 앞이 `//` 인 줄은 화면에 나오지 않는다 (편집할 때만 보이는 메모)
 * - `\[[문서]]` 처럼 기호 앞에 `\` 를 붙이면 그 기호는 문법으로 읽히지 않고 글자 그대로 나온다.
 *   기호 앞뒤에 보이지 않는 글자(WORD JOINER)를 끼우는 방식이다 — 뒤의 것은 `[[` `'''` 같은 짝이 이어지지 않게,
 *   앞의 것은 줄 맨 앞의 `==` `>` `-` `||` 가 제목·인용·리스트·표로 읽히지 않게 한다.
 *   `\\` 는 역슬래시 하나.
 */

/** 이스케이프한 기호 뒤에 끼우는 보이지 않는 글자 — 화면에도, 줄바꿈 위치에도 영향이 없다 */
export const ESCAPE_JOINER = '\u2060'

const CODE = /```[\s\S]*?```|`[^`\n]*`/g
const MASK = /\u0000(\d+)\u0000/g
// 문법에 쓰이는 기호만 — 그 밖의 \ (예: C:\Users) 는 그대로 둔다
const ESCAPE = /\\([\\[\]{}'~\-_^,*#=|<>:!`])/g

export function prepareSource(raw: string): string {
  const code: string[] = []
  const masked = (raw || '').replace(CODE, (match) => {
    code.push(match)
    return `\u0000${code.length - 1}\u0000`
  })

  const text = masked
    .split('\n')
    .filter((line) => !line.startsWith('//'))
    .join('\n')
    .replace(ESCAPE, (_, symbol: string) => (symbol === '\\' ? '\\' : ESCAPE_JOINER + symbol + ESCAPE_JOINER))

  return text.replace(MASK, (_, index) => code[Number(index)] ?? '')
}

/** 다듬은 글에서 보이지 않는 글자를 뺀다 (글자 수 세기 등) */
export function stripEscapeJoiners(text: string): string {
  return text.split(ESCAPE_JOINER).join('')
}
