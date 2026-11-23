import { describe, expect, it } from 'vitest'
import { cellSortKey, layoutTableColumns, mergeCellStylesToCss, normalizeBackgroundImage, normalizeWidth, parseCellDirectives, sortRowOrder } from './tableColors'

describe('table width directives', () => {
  it('reads table and cell widths', () => {
    const parsed = parseCellDirectives('<tablewidth:100%><width:30%> 개발')
    expect(parsed.table.width).toBe('100%')
    expect(parsed.cell.width).toBe('30%')
    expect(parsed.content).toBe('개발')
  })

  it('treats bare numbers as pixels and rejects odd values', () => {
    expect(normalizeWidth('320')).toBe('320px')
    expect(normalizeWidth('150%')).toBeUndefined()
    expect(normalizeWidth('calc(100%)')).toBeUndefined()
  })

  it('drops a width it cannot use, like other directives', () => {
    const parsed = parseCellDirectives('<width:abc> 글')
    expect(parsed.cell.width).toBeUndefined()
    expect(parsed.content).toBe('글')
  })

  it('applies a cell width as css', () => {
    expect(mergeCellStylesToCss({ width: '30%' })).toEqual({ width: '30%' })
  })
})

describe('background image directive', () => {
  it('puts an image behind the cell text', () => {
    const parsed = parseCellDirectives('<bgimage:/api/images/serve/a.png><color:#fff> 감독')
    expect(parsed.content).toBe('감독')
    expect(mergeCellStylesToCss(parsed.cell)).toMatchObject({
      backgroundImage: 'url("/api/images/serve/a.png")',
      backgroundSize: 'cover',
      color: '#fff',
    })
  })

  it('rejects addresses that could break out of css', () => {
    expect(normalizeBackgroundImage('https://x.com/a.png')).toBe('https://x.com/a.png')
    expect(normalizeBackgroundImage('/a.png")};body{x')).toBeUndefined()
    expect(normalizeBackgroundImage('javascript:alert(1)')).toBeUndefined()
    expect(normalizeBackgroundImage('//evil.com/a.png')).toBeUndefined()
  })
})

describe('namu-style table options', () => {
  it('accepts = as well as : and namu aliases', () => {
    const parsed = parseCellDirectives('<tablewidth=100%><tablebordercolor=#0b090c><bgcolor=#e6002d><nopad> 감독')
    expect(parsed.content).toBe('감독')
    expect(parsed.table.width).toBe('100%')
    expect(parsed.table.borderColor).toBe('#0b090c')
    expect(parsed.cell.backgroundColor).toBe('#e6002d')
    expect(parsed.cell.noPadding).toBe(true)
  })

  it('reads light and dark color pairs', () => {
    const parsed = parseCellDirectives('<tablebgcolor=#fff,#1c1d1f><tablecolor=#212529,#e0e0e0> 칸')
    expect(parsed.table.backgroundColor).toBe('#fff')
    expect(parsed.table.backgroundColorDark).toBe('#1c1d1f')
    expect(mergeCellStylesToCss(parsed.table)).toMatchObject({
      backgroundColor: '#fff',
      '--wd-bg': '#1c1d1f',
      color: '#212529',
      '--wd-color': '#e0e0e0',
    })
  })

  it('drops the lower layer dark color when a cell sets its own color', () => {
    const table = parseCellDirectives('<tablebgcolor=#fff,#1c1d1f> a').table
    const cell = parseCellDirectives('<bgcolor=#e6002d> b').cell
    const css = mergeCellStylesToCss(table, cell)
    expect(css.backgroundColor).toBe('#e6002d')
    expect(css['--wd-bg' as keyof typeof css]).toBeUndefined()
  })

  it('does not split rgb() colors on commas', () => {
    expect(parseCellDirectives('<bgcolor:rgb(1,2,3)> x').cell.backgroundColor).toBe('rgb(1,2,3)')
  })

  it('rejects backslashes in background image addresses', () => {
    expect(normalizeBackgroundImage(`/a${String.fromCharCode(92)}b.png`)).toBeUndefined()
  })
})

describe('Korean table directives (2026-11)', () => {
  it('reads alignment words for text and vertical position', () => {
    expect(parseCellDirectives('<가운데> 글').cell.textAlign).toBe('center')
    expect(parseCellDirectives('<왼쪽> 글').cell.textAlign).toBe('left')
    expect(parseCellDirectives('<오른쪽><위> 글').cell).toMatchObject({ textAlign: 'right', verticalAlign: 'top' })
    expect(parseCellDirectives('<아래> 글').cell.verticalAlign).toBe('bottom')
    expect(parseCellDirectives('<valign:middle> 글').cell.verticalAlign).toBe('middle')
  })

  it('reads 가로/세로 as the same merges as <-n> and <|n>', () => {
    expect(parseCellDirectives('<가로:3> 글')).toMatchObject({ colSpan: 3, content: '글' })
    expect(parseCellDirectives('<세로:2> 글')).toMatchObject({ rowSpan: 2, content: '글' })
  })

  it('reads height, keep-all and the header row mark', () => {
    expect(parseCellDirectives('<높이:60> 글').cell.height).toBe('60px')
    expect(parseCellDirectives('<height=80> 글').cell.height).toBe('80px')
    expect(parseCellDirectives('<단어줄바꿈> 글').cell.keepAll).toBe(true)
    expect(parseCellDirectives('<tablekeepall> 글').table.keepAll).toBe(true)
    expect(parseCellDirectives('<머리글> 글').header).toBe(true)
  })

  it('reads column colors for the whole column', () => {
    expect(parseCellDirectives('<열배경:#fff,#111> 글').col).toMatchObject({ backgroundColor: '#fff', backgroundColorDark: '#111' })
    expect(parseCellDirectives('<colbgcolor=#eee> 글').col.backgroundColor).toBe('#eee')
    expect(parseCellDirectives('<열글자:#c00> 글').col.textColor).toBe('#c00')
    expect(parseCellDirectives('<colcolor=#c00> 글').col.textColor).toBe('#c00')
    // color 와 col 접두어가 헷갈리지 않는다
    expect(parseCellDirectives('<color:#123> 글').cell.textColor).toBe('#123')
  })

  it('reads the table position, with 표위치 and tablealign meaning the same', () => {
    expect(parseCellDirectives('<표위치:오른쪽> 글').tablePosition).toBe('right')
    expect(parseCellDirectives('<표위치:왼쪽> 글').tablePosition).toBe('left')
    expect(parseCellDirectives('<표위치:가운데> 글').tablePosition).toBe('center')
    expect(parseCellDirectives('<표위치=right> 글').tablePosition).toBe('right')
    expect(parseCellDirectives('<tablealign=center> 글').tablePosition).toBe('center')
    expect(parseCellDirectives('<tablealign=center> 글').table.textAlign).toBeUndefined()
  })

  it('does not read directives shown inside inline code', () => {
    const parsed = parseCellDirectives('<가운데> `<세로:2>` 는 세로 합치기')
    expect(parsed.cell.textAlign).toBe('center')
    expect(parsed.rowSpan).toBeUndefined()
    expect(parsed.content).toBe('`<세로:2>` 는 세로 합치기')
  })

  it('leaves words that only start like a directive as text', () => {
    expect(parseCellDirectives('<위키> 글').content).toBe('<위키> 글')
    expect(parseCellDirectives('<가운데 정렬> 글').content).toBe('<가운데 정렬> 글')
  })

  it('applies vertical align, height and keep-all as css', () => {
    expect(mergeCellStylesToCss({ verticalAlign: 'top', height: '60px', keepAll: true })).toMatchObject({
      verticalAlign: 'top',
      height: '60px',
      wordBreak: 'keep-all',
    })
  })
})

describe('sortable tables', () => {
  it('reads the sort button flag', () => {
    expect(parseCellDirectives('<정렬버튼> 이름').sortable).toBe(true)
    expect(parseCellDirectives('<sortable><가운데> 이름')).toMatchObject({ sortable: true, content: '이름' })
  })

  it('turns cell markup into plain sort text', () => {
    expect(cellSortKey("[[강한울|'''한울''']]")).toBe('한울')
    expect(cellSortKey('{{{#c00 1,234}}}명[*] 각주')).toBe('1234명 각주')
  })

  it('sorts numbers by size, keeps blanks last and ties in order', () => {
    const keys = [['나', '10'], ['가', '9'], ['', '100'], ['다', ''], ['가', '1']]
    expect(sortRowOrder(keys, 1, 1)).toEqual([4, 1, 0, 2, 3])
    expect(sortRowOrder(keys, 1, -1)).toEqual([2, 0, 1, 4, 3])
    expect(sortRowOrder(keys, 0, 1)).toEqual([1, 4, 0, 3, 2])
  })
})

describe('layoutTableColumns', () => {
  it('places cells under row and column merges', () => {
    // ||<|2> A || B ||      → A 는 0열 두 줄, B 는 1열
    // || C ||               → C 는 A 아래가 막혀 1열
    // ||<-2> D ||           → D 는 0열부터 두 칸
    expect(layoutTableColumns([[{ rowSpan: 2 }, {}], [{}], [{ colSpan: 2 }]])).toEqual([[0, 1], [1], [0]])
  })
})
