import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import NamuWikiRenderer from '@/components/ui/NamuWikiRenderer'
import { auditTables, collectFootnotes } from '@/components/wiki/documentText'
import { parseBlocks } from '@/lib/wiki/parser/blocks'
import { documentCategories, documentHeadings, documentLinks } from '@/lib/wiki/parser/document'
import { expandTemplates, templateNamesIn, templateParameters } from '@/lib/wiki/templates'
import { resolveWikiLink } from '@/lib/wiki/links'
import { PLAYER_TEMPLATE, REFERENCE_DOC, REFERENCE_DOC_TITLE, REFERENCE_SOURCE, withSourceFolds } from './referenceDoc'

const demos = [...REFERENCE_SOURCE.matchAll(/^@@demo\n([\s\S]*?)\n@@end$/gm)].map((match) => match[1])

describe('withSourceFolds', () => {
  it('puts the same source under each example in a fold', () => {
    expect(withSourceFolds('앞\n@@demo\n- 하나\n@@end\n뒤')).toBe('앞\n- 하나\n\n>>> 원문 보기\n```wiki\n- 하나\n```\n<<<\n뒤')
  })
})

describe('기능 레퍼런스 문서', () => {
  it('turns every example into example + source fold', () => {
    expect(demos.length).toBeGreaterThan(10)
    expect(REFERENCE_DOC).not.toMatch(/@@demo|@@end/)
    // 예시 안의 <<< 나 코드 블록은 접기·코드를 먼저 닫아 버린다
    for (const demo of demos) expect(demo).not.toMatch(/^\s*(<<<|```)/m)
    const folds = parseBlocks(REFERENCE_DOC).filter((block) => block.type === 'details' && block.summary === '원문 보기')
    expect(folds).toHaveLength(demos.length)
    for (const fold of folds) {
      expect(parseBlocks(fold.type === 'details' ? fold.body : '').map((block) => block.type)).toEqual(['code'])
    }
  })

  it('links only to sections that exist', () => {
    const anchors = new Set(documentHeadings(REFERENCE_DOC).map((heading) => heading.anchor))
    // 렌더러와 같은 규칙으로 [[#문단]] 의 id 를 구한다
    const sectionAnchors = documentLinks(REFERENCE_DOC).flatMap((link) => {
      if (link.type !== 'link') return []
      const target = resolveWikiLink(link.target, REFERENCE_DOC_TITLE)
      return target.kind === 'section' ? [target.anchor] : []
    })
    expect(sectionAnchors.length).toBeGreaterThan(5)
    for (const anchor of sectionAnchors) expect(anchors).toContain(anchor)
  })

  it('is filed in the reference category, with 문법 hidden', () => {
    expect(documentCategories(REFERENCE_DOC)).toEqual(['레퍼런스', '이랑위키', '문법'])
  })

  it('calls only the example template, which takes the fields it passes', () => {
    expect(templateNamesIn(REFERENCE_DOC)).toEqual(['선수소개'])
    expect(templateParameters(PLAYER_TEMPLATE)).toEqual([{ name: '이름' }, { name: '번호' }, { name: '포지션', fallback: '미정' }])
    expect(expandTemplates('{{선수소개|이름=홍길동|번호=7}}', { 선수소개: PLAYER_TEMPLATE })).toBe("'''홍길동''' (등번호 7, 미정)")
  })

  it('has even tables and matching footnotes', () => {
    expect(auditTables(REFERENCE_DOC).filter((table) => table.uneven)).toEqual([])
    const notes = collectFootnotes(REFERENCE_DOC)
    expect([...notes.numberedRefs]).toEqual(['1'])
    expect([...notes.definitions]).toEqual(['1'])
  })

  it('renders without errors and the tab bar goes to real pages', () => {
    const html = renderToStaticMarkup(createElement(NamuWikiRenderer, { content: expandTemplates(REFERENCE_DOC, { 선수소개: PLAYER_TEMPLATE }) }))
    expect(html).toContain('href="/wiki/%EC%9D%B4%EB%9E%91%EC%9C%84%ED%82%A4%3A%EB%AC%B8%EB%B2%95"')
    expect(html).not.toContain('href="#/wiki/')
    // 카드 그리드·투표 같은 상자가 오류 상자로 그려지지 않는다
    expect(html).not.toMatch(/데이터가 올바르지 않습니다|문법 오류|파싱 오류/)
    expect(html).toContain('홍길동</strong> (등번호 7, 미정)')
  })
})
