import { describe, expect, it } from 'vitest'
import {
  auditLinks,
  auditTables,
  collectFootnotes,
  formatDuration,
  readingTime,
  repeatedPhrases,
  sanitizeWikiText,
  splitSections,
  splitSentences,
  topTerms,
} from './documentText'

describe('sanitizeWikiText', () => {
  it('keeps the shown text of links', () => {
    // 화면에 보이는 그대로 — 링크 뒤 조사는 띄우지 않는다 (한 어절)
    expect(sanitizeWikiText('[[서울|서울특별시]]은 수도다')).toBe('서울특별시은 수도다')
    expect(sanitizeWikiText('[[강한울]]의 문서')).toBe('강한울의 문서')
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

  it('keeps the rest of the document after an unclosed {{', () => {
    const text = '앞 문단 {{ 오타\n== 개요 ==\n긴 본문이다. {{틀|값}} 끝'
    expect(sanitizeWikiText(text)).toBe('앞 문단 오타 개요 긴 본문이다. 끝')
  })

  it('drops the attribute line of #!wiki boxes but keeps plain {{{text}}}', () => {
    expect(sanitizeWikiText('{{{#!wiki style="color:red; border:1px"\n안쪽 글}}}')).toBe('안쪽 글')
    expect(sanitizeWikiText('{{{그냥 글}}}')).toBe('그냥 글')
  })

  it('removes tags and table directives but keeps comparisons', () => {
    expect(sanitizeWikiText('3 < 5 이고 7 > 2')).toBe('3 < 5 이고 7 > 2')
    expect(sanitizeWikiText('체육부 <=> 생활체육부')).toBe('체육부 <=> 생활체육부')
    expect(sanitizeWikiText('||<-2><bgcolor=#fff> 합친 칸 ||\n||<|2><:> 세로 || 칸 ||')).toBe('합친 칸 세로 칸')
    expect(sanitizeWikiText('<span style="color:red">빨강</span>')).toBe('빨강')
  })

  it('moves footnote text out of the sentence, after the body', () => {
    expect(sanitizeWikiText('수도는 서울이다.[*] 2026년 기준\n다음 문장이다.', { keepLines: true })).toBe(
      '수도는 서울이다.\n다음 문장이다.\n2026년 기준'
    )
    expect(sanitizeWikiText('서울[* 대한민국의 수도]은 크다.')).toBe('서울은 크다. 대한민국의 수도')
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
    expect(result.bareRefs).toBe(0)
  })

  it('reads numbered footnotes written in place the way the page shows them', () => {
    const result = collectFootnotes('|포지션 = **투수** [*1] 원하는 보직은 마무리 | 키 = 186cm [*2] 2025년 기준')
    expect([...result.numberedRefs].sort()).toEqual(['1', '2'])
    expect([...result.definitions].sort()).toEqual(['1', '2'])
  })

  it('counts bracket footnotes, line-start auto footnotes and bare [*]', () => {
    const result = collectFootnotes('가[* 괄호 각주] 나[*]\n[*] 줄 맨 앞 각주')
    expect(result.autoRefs).toBe(3)
    expect(result.bareRefs).toBe(1)
    expect(result.definitions.size).toBe(0)
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
  it('splits on punctuation and line breaks', () => {
    expect(splitSentences('마술을 시작했다. 그리고 버스킹을 했습니다\n지금은 대회를 준비한다')).toEqual([
      '마술을 시작했다.',
      '그리고 버스킹을 했습니다',
      '지금은 대회를 준비한다',
    ])
  })

  it('does not cut after words that merely end in 다/요/음', () => {
    expect(splitSentences('바다 위에 떠 있는 배를 보았다. 다음 날 아침이 밝았다.')).toEqual([
      '바다 위에 떠 있는 배를 보았다.',
      '다음 날 아침이 밝았다.',
    ])
  })

  it('splits after a closing quote', () => {
    expect(splitSentences('"그만하자." 그가 말했다. 모두 동의했다.')).toEqual(['"그만하자."', '그가 말했다.', '모두 동의했다.'])
  })
})

describe('auditTables', () => {
  it('finds rows with a different number of cells and empty cells', () => {
    const text = '본문\n|| 이름 || 나이 ||\n|| 강한울 || 20 ||\n|| 이승찬 ||\n\n|| 하나 ||  ||'
    expect(auditTables(text)).toEqual([
      { startLine: 2, rows: 3, widths: [2, 2, 1], emptyCells: 0, uneven: true },
      { startLine: 6, rows: 1, widths: [2], emptyCells: 1, uneven: false },
    ])
  })

  it('counts merged cells as the cells they cover', () => {
    const text = '||<-2> 제목 ||\n||<|2> 세로 || 가 ||\n|| 나 ||'
    expect(auditTables(text)[0]).toMatchObject({ widths: [2, 2, 2], uneven: false })
  })

  it('reads the Korean merge directives too', () => {
    const text = '|| 요일 || 오전 || 오후 ||\n||<세로:2><가운데> 월 || 회의 || 연습 ||\n|| 정리 || 휴식 ||\n||<가로:3> 쉼 ||'
    expect(auditTables(text)[0]).toMatchObject({ widths: [3, 3, 3, 3], uneven: false })
  })

  it('skips tables inside code blocks', () => {
    expect(auditTables('```\n|| a || b ||\n```')).toEqual([])
  })
})

describe('topTerms', () => {
  it('counts words without their particles and skips filler words', () => {
    const plain = '강한울은 투수다. 강한울이 던졌다. 강한울의 공은 빠르다. 그리고 투수가 바뀌었다. 투수를 바꿨다. 2025 2025 2025'
    expect(topTerms(plain, 2)).toEqual([
      { term: '강한울', count: 3 },
      { term: '투수', count: 2 },
    ])
  })
})

describe('repeatedPhrases', () => {
  it('finds passages copied twice', () => {
    const passage = '이 문단은 실수로 두 번 붙여 넣은 아주 긴 설명 문장입니다'
    const plain = `처음에는 ${passage} 중간에 ${passage}`
    const result = repeatedPhrases(plain)
    expect(result.passages.map((item) => item.count)).toEqual([2])
    expect(result.passages[0].phrase.startsWith('이 문단은 실수로')).toBe(true)
    expect(result.truncated).toBe(false)
  })

  it('does not list the shifted copies of the same run', () => {
    const plain = Array.from({ length: 3 }, () => '오늘도 즐거운 하루를 보냈다').join(' 그리고 ')
    const result = repeatedPhrases(plain)
    expect(result.phrases).toHaveLength(1)
    expect(result.phrases[0].count).toBe(3)
  })
})

describe('stage-1 syntax in document text', () => {
  it('leaves out comment lines, the TOC and footnote macros', () => {
    expect(sanitizeWikiText('본문이다.\n// 메모라서 세지 않는다\n[[목차:접기]]\n[[각주]]\n끝')).toBe('본문이다. 끝')
  })

  it('counts escaped syntax as plain text', () => {
    expect(sanitizeWikiText('\\[[문서]] 는 링크가 아니다')).toBe('[[문서]] 는 링크가 아니다')
    expect(auditLinks('\\[[문서]] [[진짜]] [[각주]] [[:분류:인물]]')).toMatchObject({ internal: 1, categories: 1 })
  })
})

describe('reading the page the way the renderer draws it', () => {
  it('does not count a heading written inside a callout as a section', () => {
    const sections = splitSections('== 개요 ==\n본문\n:::info\n== 알림 속 글 ==\n:::\n== 여담 ==')
    expect(sections.map((section) => section.title)).toEqual(['개요', '여담'])
  })

  it('counts sections inside a fold box, in page order', () => {
    expect(splitSections('== 가 ==\n>>> 펼치기\n=== 나 ===\n안쪽 글\n<<<\n== 다 ==').map((section) => section.title)).toEqual(['가', '나', '다'])
  })

  it('keeps the original line numbers for tables inside a fold box', () => {
    expect(auditTables('글\n>>> 펼치기\n|| a || b ||\n|| c ||\n<<<').map((table) => [table.startLine, table.uneven])).toEqual([[3, true]])
  })

  it('reads table cells and callouts as text, but not infobox fields', () => {
    expect(sanitizeWikiText('{{인물정보상자\n|이름 = 강한울\n}}\n|| 칸 글 ||\n:::info 알림 글 :::')).toBe('칸 글 알림 글')
  })
})
