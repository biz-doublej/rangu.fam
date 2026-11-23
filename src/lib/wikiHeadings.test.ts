import { describe, expect, it } from 'vitest'
import { isFoldCollapsed, parseHeadingLine } from './wikiHeadings'

describe('parseHeadingLine', () => {
  it('reads namu headings', () => {
    expect(parseHeadingLine('== 개요 ==')).toEqual({ level: 2, title: '개요', folded: false })
  })

  it('reads namu headings folded by default', () => {
    expect(parseHeadingLine('==# 스포일러 #==')).toEqual({ level: 2, title: '스포일러', folded: true })
    expect(parseHeadingLine('=== # 줄거리 # ===')).toEqual({ level: 3, title: '줄거리', folded: true })
  })

  it('reads markdown headings', () => {
    expect(parseHeadingLine('## 개요')).toEqual({ level: 2, title: '개요', folded: false })
  })

  it('ignores plain lines', () => {
    expect(parseHeadingLine('그냥 문장')).toBeNull()
  })

  it('needs a space after # for markdown headings', () => {
    expect(parseHeadingLine('#태그')).toBeNull()
    expect(parseHeadingLine('#redirect 강한울')).toBeNull()
    expect(parseHeadingLine('## 개요')).toEqual({ level: 2, title: '개요', folded: false })
    expect(parseHeadingLine('####### 일곱 개')).toBeNull()
  })
})

describe('isFoldCollapsed', () => {
  it('flips the default when the reader toggles', () => {
    expect(isFoldCollapsed(false, false)).toBe(false)
    expect(isFoldCollapsed(false, true)).toBe(true)
    expect(isFoldCollapsed(true, false)).toBe(true)
    expect(isFoldCollapsed(true, true)).toBe(false)
  })
})
