import { describe, expect, it } from 'vitest'
import { buildListTree, collectFencedBlock, isQuoteLine, parseListLine, parseQuoteBlock, parseStyledBoxOptions } from './blocks'

describe('parseListLine', () => {
  it('reads bullets, numbers, letters and roman numerals', () => {
    expect(parseListLine('- 항목')).toEqual({ depth: 0, style: 'disc', content: '항목' })
    expect(parseListLine('* 항목')).toEqual({ depth: 0, style: 'disc', content: '항목' })
    expect(parseListLine('3. 셋째')).toEqual({ depth: 0, style: '1', start: 3, content: '셋째' })
    expect(parseListLine('a. 가')).toEqual({ depth: 0, style: 'a', content: '가' })
    expect(parseListLine('I. 하나')).toEqual({ depth: 0, style: 'I', content: '하나' })
  })

  it('counts two spaces or a tab as one level', () => {
    expect(parseListLine('  - 둘째 단계')?.depth).toBe(1)
    expect(parseListLine('    - 셋째 단계')?.depth).toBe(2)
    expect(parseListLine('\t- 탭')?.depth).toBe(1)
    expect(parseListLine(' - 한 칸')?.depth).toBe(0)
  })

  it('ignores lines that only look like markers', () => {
    expect(parseListLine('**굵게**')).toBeNull()
    expect(parseListLine('---')).toBeNull()
    expect(parseListLine('-1도')).toBeNull()
    expect(parseListLine('i.e. 예를 들면')).toBeNull()
    expect(parseListLine('그냥 문장')).toBeNull()
  })
})

describe('buildListTree', () => {
  const tree = (text: string) => buildListTree(text.split('\n').map((line) => parseListLine(line)!))

  it('nests three levels', () => {
    expect(tree('- 하나\n  - 둘\n    - 셋\n- 넷')).toEqual([
      {
        style: 'disc',
        items: [
          {
            content: '하나',
            children: [{ style: 'disc', items: [{ content: '둘', children: [{ style: 'disc', items: [{ content: '셋', children: [] }] }] }] }],
          },
          { content: '넷', children: [] },
        ],
      },
    ])
  })

  it('keeps the first number as the start and splits when the marker kind changes', () => {
    expect(tree('3. 가\n1. 나\n- 다')).toEqual([
      { style: '1', start: 3, items: [{ content: '가', children: [] }, { content: '나', children: [] }] },
      { style: 'disc', items: [{ content: '다', children: [] }] },
    ])
  })

  it('treats a jump of two levels as one, and a first indented line as the top', () => {
    expect(tree('    - 들여 시작\n- 다음')[0].items.map((item) => item.content)).toEqual(['들여 시작', '다음'])
    const jumped = tree('- 하나\n      - 셋째 단계')
    expect(jumped[0].items[0].children[0].items[0].content).toBe('셋째 단계')
  })

  it('nests a numbered list inside bullets', () => {
    const nested = tree('- 준비물\n  1. 공\n  1. 장갑')
    expect(nested[0].items[0].children).toEqual([
      { style: '1', start: 1, items: [{ content: '공', children: [] }, { content: '장갑', children: [] }] },
    ])
  })
})

describe('parseQuoteBlock', () => {
  it('joins consecutive lines into one quote', () => {
    expect(parseQuoteBlock(['> 첫 줄', '> 둘째 줄'])).toEqual({ parts: [{ kind: 'text', lines: ['첫 줄', '둘째 줄'] }] })
  })

  it('nests "> >" lines one level deeper', () => {
    expect(parseQuoteBlock(['> 바깥', '> > 안쪽', '> > > 더 안쪽', '> 다시 바깥'])).toEqual({
      parts: [
        { kind: 'text', lines: ['바깥'] },
        {
          kind: 'quote',
          node: { parts: [{ kind: 'text', lines: ['안쪽'] }, { kind: 'quote', node: { parts: [{ kind: 'text', lines: ['더 안쪽'] }] } }] },
        },
        { kind: 'text', lines: ['다시 바깥'] },
      ],
    })
  })

  it('stops nesting at the depth limit', () => {
    const deep = parseQuoteBlock(['> > > 셋'], 2)
    expect(deep).toEqual({ parts: [{ kind: 'quote', node: { parts: [{ kind: 'text', lines: ['> 셋'] }] } }] })
  })

  it('does not treat the >>> fold box as a quote', () => {
    expect(isQuoteLine('>>> 펼쳐 보기')).toBe(false)
    expect(isQuoteLine('> 인용')).toBe(true)
    expect(isQuoteLine('>붙여 쓴 인용')).toBe(true)
  })
})

describe('parseStyledBoxOptions', () => {
  it('reads allowed keys with checked values', () => {
    expect(parseStyledBoxOptions('배경=#fff8e1,#2b2416 글자=#5d4037 테두리=#ffb300 정렬=가운데 위치=가운데 너비=80% 둥글게')).toEqual({
      style: {
        backgroundColor: '#fff8e1',
        backgroundColorDark: '#2b2416',
        textColor: '#5d4037',
        textColorDark: undefined,
        borderColor: '#ffb300',
        textAlign: 'center',
        width: '80%',
      },
      position: 'center',
      rounded: true,
      ignored: [],
    })
  })

  it('ignores unknown keys and unsafe values instead of passing them on as css', () => {
    const box = parseStyledBoxOptions('배경=url(javascript:alert(1)) style=color:red 너비=999%')
    expect(box.style).toEqual({})
    expect(box.ignored).toEqual(['배경=url(javascript:alert(1))', 'style=color:red', '너비=999%'])
  })
})

describe('collectFencedBlock', () => {
  it('pairs nested ::: blocks and skips one-line ones', () => {
    const lines = [':::상자 배경=#eee', '위', ':::info', '안쪽 알림', ':::', ':::tip 한 줄 :::', '아래', ':::', '다음 문단']
    expect(collectFencedBlock(lines, 0)).toEqual({
      body: ['위', ':::info', '안쪽 알림', ':::', ':::tip 한 줄 :::', '아래'],
      end: 7,
    })
  })

  it('runs to the end when the box is never closed', () => {
    expect(collectFencedBlock([':::상자', '끝까지'], 0)).toEqual({ body: ['끝까지'], end: 2 })
  })
})
