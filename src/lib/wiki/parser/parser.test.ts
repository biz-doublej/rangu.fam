import { describe, expect, it } from 'vitest'
import { parseBlocks } from './blocks'
import { documentHeadings, documentLinks, documentProse } from './document'
import { inlineLinks, inlineText, parseInline } from './inline'

const types = (text: string) => parseBlocks(text).map((block) => block.type)

describe('parseBlocks', () => {
  it('splits paragraphs, headings, lists, quotes and tables', () => {
    expect(types('첫 문단\n이어짐\n\n== 제목 ==\n- 하나\n  - 둘\n> 인용\n|| a || b ||\n|| c || d ||')).toEqual([
      'paragraph',
      'heading',
      'list',
      'quote',
      'table',
    ])
  })

  it('keeps the line spans so the next block starts after the last used line', () => {
    const blocks = parseBlocks('문단\n\n```js\n== 코드 안 ==\n```\n뒤')
    expect(blocks.map((block) => [block.type, block.start, block.end])).toEqual([
      ['paragraph', 0, 0],
      ['code', 2, 4],
      ['paragraph', 5, 5],
    ])
  })

  it('ends a paragraph where a code block starts right below it', () => {
    const blocks = parseBlocks('색을 쓸 수 있습니다:\n```\n{{인물정보상자\n|이름 = 예시\n}}\n```\n뒤')
    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'code', 'paragraph'])
    expect(blocks[1]).toMatchObject({ code: '{{인물정보상자\n|이름 = 예시\n}}' })
  })

  it('reads boxes that hold other blocks', () => {
    const [details, box] = parseBlocks('>>> 펼치기\n== 안쪽 ==\n<<<\n:::상자 배경=#eee\n본문\n:::')
    expect(details).toMatchObject({ type: 'details', summary: '펼치기', body: '== 안쪽 ==' })
    expect(box).toMatchObject({ type: 'styled-box', options: '배경=#eee', body: '본문' })
  })

  it('turns a poll with too few options into a plain one-line box, like before', () => {
    const blocks = parseBlocks(':::poll 질문\n하나\n:::\n다음')
    expect(blocks.map((block) => block.type)).toEqual(['box', 'paragraph'])
    expect(blocks[0]).toMatchObject({ kind: 'poll', content: '질문', end: 2 })
  })

  it('only takes | rows as a markdown table when a separator row follows', () => {
    expect(types('| a | b |\n|---|---|\n| 1 | 2 |')).toEqual(['markdown-table'])
    expect(types('|| a || b ||\n|| c || d ||')).toEqual(['table'])
  })

  it('reads the line forms of the wiki', () => {
    expect(
      types('[[목차]]\n[[목차:접기]]\n[[각주]]\n[clearfix]\n{{role:admin}}\n분류: 가 | 나\n[이미지:/a.png]\n[[파일:/b.png|300px]]\n---\n***\n[*1] 따로 적은 각주 내용')
    ).toEqual(['toc', 'toc', 'footnotes', 'clearfix', 'role', 'category-line', 'image', 'file', 'rule', 'rule', 'footnote-def'])
  })
})

describe('parseInline', () => {
  it('reads links, styles and footnotes', () => {
    const nodes = parseInline("'''[[강한울|한울]]'''은 [공식](https://example.com)이다[*1]")
    expect(inlineText(nodes)).toBe('한울은 공식이다')
    expect(inlineLinks(nodes)).toEqual([
      { type: 'link', target: '강한울' },
      { type: 'external', url: 'https://example.com' },
    ])
  })

  it('reads nested styled text and leaves template calls out of the text', () => {
    expect(inlineText(parseInline('{{{-1 [[역대 감독|{{{#423f3f,#c0bdbd 전 세계 감독}}}]]}}}'))).toBe('전 세계 감독')
    expect(inlineText(parseInline('앞 {{인사|이름=a}} 뒤'))).toBe('앞  뒤')
  })
})

describe('document helpers', () => {
  it('lists headings the renderer draws, nested ones included, with the same ids', () => {
    const content = '== 개요 ==\n>>> 접기\n== 개요 ==\n<<<\n:::info\n== 알림 안 글 ==\n:::\n```\n== 코드 ==\n```'
    expect(documentHeadings(content)).toEqual([
      { level: 2, title: '개요', anchor: '개요', folded: false },
      { level: 2, title: '개요', anchor: '개요-2', folded: false },
    ])
  })

  it('collects links from text, tables, infoboxes and footnotes but not code', () => {
    const content = '{{인물정보상자\n|소속 = [[작업공작소]]\n}}\n본문 [[강한울]].[* [[각주 링크]]]\n|| [[표 안]] ||\n`[[코드 안]]`'
    expect(documentLinks(content).map((link) => (link.type === 'link' ? link.target : link.type === 'external' ? link.url : link.src)).sort()).toEqual(
      ['각주 링크', '강한울', '작업공작소', '표 안'].sort()
    )
  })

  it('gives the prose of a page for previews', () => {
    const content = "{{인물정보상자\n|이름=a\n}}\n== 개요 ==\n'''강한울'''은 선수다.\n- 주장\n|| 표 || 글 ||"
    expect(documentProse(content)).toBe('강한울은 선수다. 주장')
  })
})
