import { describe, expect, it } from 'vitest'
import { parseHeadingLine } from '@/lib/wikiHeadings'
import { parseListLine } from './blocks'
import { ESCAPE_JOINER, prepareSource, stripEscapeJoiners } from './source'

const J = ESCAPE_JOINER

describe('prepareSource', () => {
  it('drops comment lines that start with //', () => {
    expect(prepareSource('보이는 줄\n// 편집할 때만 보이는 메모\n다음 줄')).toBe('보이는 줄\n다음 줄')
  })

  it('keeps // that is not at the start of the line, and keeps code comments', () => {
    expect(prepareSource('주소는 https://example.com 이다')).toBe('주소는 https://example.com 이다')
    expect(prepareSource('  // 들여 쓴 줄은 주석이 아니다')).toBe('  // 들여 쓴 줄은 주석이 아니다')
    expect(prepareSource('```js\n// 코드 주석\n```')).toBe('```js\n// 코드 주석\n```')
  })

  it('puts invisible joiners around an escaped symbol', () => {
    expect(prepareSource('\\[[문서]]')).toBe(`${J}[${J}[문서]]`)
    expect(prepareSource("\\'''굵게 아님'''")).toBe(`${J}'${J}''굵게 아님'''`)
    expect(prepareSource('\\[*] 각주 아님')).toBe(`${J}[${J}*] 각주 아님`)
  })

  it('keeps an escaped line start from becoming a heading or a list', () => {
    expect(parseHeadingLine(prepareSource('\\== 제목 아님 =='))).toBeNull()
    expect(parseHeadingLine(prepareSource('\\## 제목 아님'))).toBeNull()
    expect(parseListLine(prepareSource('\\- 리스트 아님'))).toBeNull()
  })

  it('reads \\\\ as one backslash and leaves other backslashes alone', () => {
    expect(prepareSource('a\\\\b')).toBe('a\\b')
    expect(prepareSource('C:\\Users\\me')).toBe('C:\\Users\\me')
  })

  it('does not touch escapes inside code', () => {
    expect(prepareSource('`\\[[문서]]`')).toBe('`\\[[문서]]`')
  })

  it('strips the joiners for counting', () => {
    expect(stripEscapeJoiners(prepareSource('\\[[문서]]'))).toBe('[[문서]]')
  })
})
