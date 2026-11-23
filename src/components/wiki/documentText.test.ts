import { describe, expect, it } from 'vitest'
import {
  auditLinks,
  collectFootnotes,
  formatDuration,
  readingTime,
  sanitizeWikiText,
  splitSections,
  splitSentences,
} from './documentText'

describe('sanitizeWikiText', () => {
  it('keeps the shown text of links', () => {
    expect(sanitizeWikiText('[[서울|서울특별시]]은 수도다')).toBe('서울특별시 은 수도다')
    expect(sanitizeWikiText('[[강한울]]의 문서')).toBe('강한울 의 문서')
  })

  it('removes whole templates even with colored text inside', () => {
    const text = '{{인물정보상자\n|이름 = {{{#fff 흰}}}\n|직업=도적\n}}\n본문 시작'
    expect(sanitizeWikiText(text)).toBe('본문 시작')
  })

  it('keeps the words inside styled text', () => {
    expect(sanitizeWikiText('{{{#ff0000 빨강}}} {{{+1 큰}}} {{{배지 제56대}}}')).toBe('빨강 큰 제56대')
    expect(sanitizeWikiText('{{{-1 [[역대 감독|{{{#423f3f,#c0bdbd 전 세계 감독}}}]]}}}')).toBe('전 세계 감독')
  })

  it('drops files, categories, footnote marks and markup symbols', () => {
    expect(sanitizeWikiText("[[파일:a.png|width=30]] '''굵게''' **강조** [*1] ~~취소~~")).toBe('굵게 강조 취소')
    expect(sanitizeWikiText('[[분류:인물]]\n== 개요 ==\n* 항목')).toBe('개요 항목')
  })

  it('keeps markdown link text', () => {
    expect(sanitizeWikiText('[공식 홈](https://example.com) 참고')).toBe('공식 홈 참고')
  })
})

describe('readingTime', () => {
  it('never shows 60 seconds', () => {
    const result = readingTime(639, 320)
    expect(result).toEqual({ total: 120, minutes: 2, seconds: 0 })
    expect(formatDuration(result.total)).toBe('2분')
  })

  it('formats short and empty durations', () => {
    expect(formatDuration(0)).toBe('0초')
    expect(formatDuration(45)).toBe('45초')
    expect(formatDuration(75)).toBe('1분 15초')
  })
})

describe('collectFootnotes', () => {
  it('separates references, definitions and auto footnotes', () => {
    const text = '문장.[*1] 또 문장.[*2]\n자동 각주[*] 내용\n\n[*1] 첫 정의\n[*3] 안 쓰인 정의\n`[*9] 코드 안`'
    const result = collectFootnotes(text)
    expect([...result.numberedRefs].sort()).toEqual(['1', '2'])
    expect([...result.definitions].sort()).toEqual(['1', '3'])
    expect(result.autoRefs).toBe(1)
  })
})

describe('auditLinks', () => {
  it('counts documents, files and categories separately and dedupes', () => {
    const text = '[[강한울]] [[강한울|한울]] [[이승찬#생애]] [[파일:a.png]] [[분류:인물]]\nhttps://a.example.com:8080/~me 와 https://a.example.com:8080/~me'
    expect(auditLinks(text)).toEqual({
      internal: 3,
      uniqueInternal: 2,
      categories: 1,
      files: 1,
      external: 2,
      uniqueExternal: 1,
    })
  })
})

describe('splitSections', () => {
  it('splits by headings and skips code blocks', () => {
    const sections = splitSections('머리말\n== 개요 ==\n본문\n```\n== 코드 ==\n```\n== 여담 ==')
    expect(sections.map((section) => section.title)).toEqual(['개요', '여담'])
    expect(sections[1].body).toBe('')
  })
})

describe('splitSentences', () => {
  it('splits Korean sentences on endings and punctuation', () => {
    expect(splitSentences('마술을 시작했다. 그리고 버스킹을 했습니다 지금은 대회를 준비한다')).toEqual([
      '마술을 시작했다.',
      '그리고 버스킹을 했습니다',
      '지금은 대회를 준비한다',
    ])
  })
})
