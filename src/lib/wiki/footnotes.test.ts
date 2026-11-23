import { describe, expect, it } from 'vitest'
import { isFootnoteDefinitionLine, prepareFootnotes } from './footnotes'

describe('prepareFootnotes', () => {
  it('turns "[*] 내용" into a footnote that ends at the line end', () => {
    const result = prepareFootnotes('마술을 시작했다.[*] 김준표 마술사를 보고 시작했다.\n다음 줄')
    expect(result.text).toBe('마술을 시작했다.[*@0]\n다음 줄')
    expect(result.inline).toEqual(['김준표 마술사를 보고 시작했다.'])
  })

  it('keeps numbered footnotes written in place, as live documents use them', () => {
    const result = prepareFootnotes('|포지션 = **투수** [*1] 원하는 보직은 마무리 | 다음 = 값')
    expect(result.text).toBe('|포지션 = **투수** [*1]| 다음 = 값')
    expect(result.definitions).toEqual({ '1': '원하는 보직은 마무리' })
    expect([...result.numberedRefs]).toEqual(['1'])
  })

  it('reads namu-style bracket footnotes so the sentence can go on', () => {
    const result = prepareFootnotes('서울[* 대한민국의 수도. [[서울|서울특별시]] 참고]은 크다.')
    expect(result.text).toBe('서울[*@0]은 크다.')
    expect(result.inline).toEqual(['대한민국의 수도. [[서울|서울특별시]] 참고'])
  })

  it('numbers bracket and line footnotes in document order', () => {
    const result = prepareFootnotes('가[* 하나] 나[*] 둘\n다[* 셋]')
    expect(result.text).toBe('가[*@0] 나[*@1]\n다[*@2]')
    expect(result.inline).toEqual(['하나', '둘', '셋'])
  })

  it('keeps links inside a footnote instead of cutting at the first [', () => {
    const result = prepareFootnotes('출처가 있다.[*] 출처: [[랑구 연감|연감]] 2026년판')
    expect(result.inline).toEqual(['출처: [[랑구 연감|연감]] 2026년판'])
  })

  it('stops at the next footnote or a markdown link on the same line', () => {
    const result = prepareFootnotes('첫째.[*] 앞 각주 [*] 뒤 각주\n[노래](https://example.com) [*2] 등장곡 [다른 노래](https://example.com)')
    expect(result.inline).toEqual(['앞 각주', '뒤 각주'])
    expect(result.definitions['2']).toBe('등장곡')
    expect(result.text.split('\n')[1]).toBe('[노래](https://example.com) [*2][다른 노래](https://example.com)')
  })

  it('reads "[*1] 내용" at the line start as the definition and leaves the line in place', () => {
    const result = prepareFootnotes('본문.[*1]\n\n[*1] 따로 적은 내용')
    expect(result.text).toBe('본문.[*1]\n\n[*1] 따로 적은 내용')
    expect(result.definitions).toEqual({ '1': '따로 적은 내용' })
    expect([...result.numberedRefs]).toEqual(['1'])
    expect(result.definedOnOwnLine.has('1')).toBe(true)
  })

  it('keeps the text after [*1] in the body when [*1] is written on its own line', () => {
    const result = prepareFootnotes('서울[*1] 은 수도이다.\n\n[*1] 따로 적은 내용')
    expect(result.text).toBe('서울[*1] 은 수도이다.\n\n[*1] 따로 적은 내용')
    expect(result.definitions).toEqual({ '1': '따로 적은 내용' })
  })

  it('treats "[*] 내용" at the line start as a footnote in place', () => {
    const result = prepareFootnotes('[*] 줄 맨 앞 각주')
    expect(result.text).toBe('[*@0]')
    expect(result.inline).toEqual(['줄 맨 앞 각주'])
  })

  it('counts a bare [*] with nothing after it separately', () => {
    const result = prepareFootnotes('내용 없는 각주[*]\n또[*]')
    expect(result.bareRefs).toBe(2)
    expect(result.inline).toEqual([])
  })

  it('leaves examples inside code untouched', () => {
    const text = '`[*] 코드 안` 그리고\n```\n[*1] 블록 안\n문장[*] 블록 안\n```\n진짜[*] 각주'
    const result = prepareFootnotes(text)
    expect(result.text).toBe('`[*] 코드 안` 그리고\n```\n[*1] 블록 안\n문장[*] 블록 안\n```\n진짜[*@0]')
    expect(result.inline).toEqual(['각주'])
    expect(result.definitions).toEqual({})
  })

  it('is safe to run twice', () => {
    const once = prepareFootnotes('가[* 하나] 나[*1] 둘')
    expect(prepareFootnotes(once.text).text).toBe(once.text)
  })
})

describe('isFootnoteDefinitionLine', () => {
  it('matches only a numbered footnote with text at the start of the line', () => {
    expect(isFootnoteDefinitionLine('[*1] 내용')).toBe(true)
    expect(isFootnoteDefinitionLine('[*12] 출처')).toBe(true)
    expect(isFootnoteDefinitionLine('[*1]')).toBe(false)
    expect(isFootnoteDefinitionLine('[*] 내용')).toBe(false)
    expect(isFootnoteDefinitionLine('문장 [*1] 내용')).toBe(false)
  })
})
