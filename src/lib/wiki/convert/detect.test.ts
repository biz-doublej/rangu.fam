import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lineDiff } from '../lineDiff'
import { detectNamuMarkup, looksLikeNamu } from './detect'

const FIXTURES = join(__dirname, '__fixtures__')

describe('detectNamuMarkup', () => {
  it('needs two different namu-only markers', () => {
    expect(looksLikeNamu('[include(틀:선수, 이름=강한울)]\n본문')).toBe(false)
    expect(looksLikeNamu('[include(틀:선수, 이름=강한울)]\n[목차]\n본문')).toBe(true)
    expect(detectNamuMarkup('||<:> 가운데 ||\n|||| 합침 ||').markers.map((marker) => marker.key)).toEqual(['table', 'table-merge'])
  })

  it('does not count syntax irang also uses', () => {
    const irang = '== 개요 ==\n||<가운데><bgcolor:#fff> 칸 ||\n문장[*1] 내용\n[* 괄호 각주]\n- 목록\n[[목차]]\n[[각주]]'
    expect(detectNamuMarkup(irang).score).toBe(0)
  })

  it('reads named footnotes and section links but not numbered footnotes', () => {
    expect(detectNamuMarkup('가[*A 이름 각주] 나 [[문서#s-1.2]]').markers.map((marker) => marker.key)).toEqual([
      'named-footnote',
      'section-number',
    ])
    expect(detectNamuMarkup('가[*1] 번호').score).toBe(0)
  })

  it('ignores examples inside code blocks', () => {
    expect(looksLikeNamu('```\n[include(틀:a)]\n[목차]\n```')).toBe(false)
  })

  it('recognises the namu side of most converter fixtures and none of the irang side', () => {
    const files = readdirSync(FIXTURES)
    const irangHits = files.filter((file) => file.endsWith('.irang') && looksLikeNamu(readFileSync(join(FIXTURES, file), 'utf8')))
    expect(irangHits).toEqual([])
  })
})

describe('lineDiff', () => {
  it('marks kept, removed and added lines in order', () => {
    expect(lineDiff('가\n나\n다', '가\n라\n다')).toEqual([
      { kind: 'same', text: '가' },
      { kind: 'added', text: '라' },
      { kind: 'removed', text: '나' },
      { kind: 'same', text: '다' },
    ])
  })

  it('handles empty sides', () => {
    expect(lineDiff('', '새 줄')).toEqual([
      { kind: 'added', text: '새 줄' },
      { kind: 'removed', text: '' },
    ])
  })
})
