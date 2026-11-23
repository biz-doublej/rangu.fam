import { describe, expect, it } from 'vitest'
import {
  expandTemplates,
  fillTemplate,
  findTemplateCalls,
  isReservedTemplateName,
  templateNamesIn,
  templateParameters,
} from './templates'

describe('findTemplateCalls', () => {
  it('reads named and positional values', () => {
    const [call] = findTemplateCalls('앞 {{인사|이름=강한울|태릉고}} 뒤')
    expect(call).toMatchObject({ name: '인사', params: { 이름: '강한울', '1': '태릉고' } })
  })

  it('keeps links, styled text and nested calls inside a value whole', () => {
    const [call] = findTemplateCalls('{{소개|팀=[[작업공작소|공작소]]|색={{{#fff 흰}}}}}')
    expect(call.params).toEqual({ 팀: '[[작업공작소|공작소]]', 색: '{{{#fff 흰}}}' })
    expect(call.end).toBe('{{소개|팀=[[작업공작소|공작소]]|색={{{#fff 흰}}}}}'.length)
  })

  it('reads calls written over several lines', () => {
    const [call] = findTemplateCalls('{{선수\n|이름 = 강한울\n|등번호 = 17\n}}')
    expect(call).toMatchObject({ name: '선수', params: { 이름: '강한울', 등번호: '17' } })
  })

  it('skips built-in boxes, styled text and code', () => {
    const text = '{{인물정보상자\n|이름=a\n}}\n{{role:admin}}\n{{배너상자|제목=b}}\n{{{#fff 흰}}}\n`{{코드|a}}`\n```\n{{블록|a}}\n```'
    expect(findTemplateCalls(text)).toEqual([])
  })

  it('reads code blocks line by line like the renderer, even when closed with four backticks', () => {
    const text = '```text\n예시\n````\n언어는 ```` ```js ```` 처럼\n\n```text\n{{인물정보\n|이름 = 홍길동\n}}\n```\n(`{{그룹정보}}`)'
    expect(findTemplateCalls(text)).toEqual([])
  })

  it('ignores an unclosed {{', () => {
    expect(findTemplateCalls('{{ 오타 그리고 {{진짜|a=1}}')).toMatchObject([{ name: '진짜' }])
  })
})

describe('isReservedTemplateName', () => {
  it('knows the boxes the renderer draws itself', () => {
    expect(isReservedTemplateName('인물정보상자<bgcolor:#E8F4FD>')).toBe(true)
    expect(isReservedTemplateName('Role:rangu')).toBe(true)
    expect(isReservedTemplateName('국가대표팀')).toBe(false)
  })
})

describe('fillTemplate', () => {
  it('fills values, uses defaults and leaves missing ones empty', () => {
    expect(fillTemplate('@이름@ 님 (@소속=무소속@) @없음@!', { 이름: '강한울' })).toBe('강한울 님 (무소속) !')
    expect(fillTemplate('@1@과 @2@', { '1': '가', '2': '나' })).toBe('가과 나')
  })

  it('does not touch e-mail addresses', () => {
    expect(fillTemplate('a@b.com, c@d.com', {})).toBe('a@b.com, c@d.com')
  })

  it('turns \\, from namu include values back into commas', () => {
    const [call] = findTemplateCalls('{{목록|항목=가\\, 나}}')
    expect(fillTemplate('@항목@', call.params)).toBe('가, 나')
  })
})

describe('expandTemplates', () => {
  it('expands one level and leaves calls inside the template as written', () => {
    const templates = { 인사: '안녕 @이름@ {{속틀|a=1}}', 속틀: '안 펼쳐짐' }
    expect(expandTemplates('[{{인사|이름=한울}}]', templates)).toBe('[안녕 한울 {{속틀|a=1}}]')
  })

  it('turns a missing template into a link and a loading one into nothing', () => {
    expect(expandTemplates('a{{없음}}b', { 없음: null })).toBe('a[[틀:없음]]b')
    expect(expandTemplates('a{{불러오는중}}b', {})).toBe('ab')
  })

  it('returns the text untouched when there is nothing to expand', () => {
    const text = '{{인물정보상자\n|이름=a\n}}\n본문'
    expect(expandTemplates(text, {})).toBe(text)
  })
})

describe('templateParameters', () => {
  it('lists the fields in order with their defaults', () => {
    expect(templateParameters('@이름@ @소속=무소속@ @이름@ `@코드@`')).toEqual([
      { name: '이름' },
      { name: '소속', fallback: '무소속' },
    ])
  })

  it('lists template names a page uses once each', () => {
    expect(templateNamesIn('{{가}} {{나|a=1}} {{가|b=2}}')).toEqual(['가', '나'])
  })
})
