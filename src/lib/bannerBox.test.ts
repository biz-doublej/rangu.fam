import { describe, expect, it } from 'vitest'
import { imageAddress, isBannerBoxStart, readBannerBox, resolveBannerBoxStyle } from './bannerBox'

const sample = [
  '{{배너상자',
  '|윗글=대한민국 축구 국가대표팀',
  '|제목=감독',
  '|사진설명=임시 감독',
  '로베르트 모레노',
  '|본문=',
  '||<tablewidth:100%> [[파일:/flag.png|width=28]] ||',
  '{{인물정보상자',
  '|이름=안쪽',
  '}}',
  '|아래왼쪽=[[이전|◀ 이전]]',
  '}}',
  '다음 문단',
]

describe('readBannerBox', () => {
  it('detects the opening line', () => {
    expect(isBannerBoxStart('{{배너상자')).toBe(true)
    expect(isBannerBoxStart('{{배너상자 |제목=x}}')).toBe(false)
  })

  it('reads params, multi-line values and the raw body', () => {
    const { spec, end } = readBannerBox(sample, 0)
    expect(spec.params['윗글']).toBe('대한민국 축구 국가대표팀')
    expect(spec.params['사진설명']).toBe('임시 감독\n로베르트 모레노')
    // 본문 안의 = 이나 다른 블록은 값으로 오해하지 않는다
    expect(spec.body).toContain('[[파일:/flag.png|width=28]]')
    expect(spec.body).toContain('{{인물정보상자')
    expect(spec.body.trim().endsWith('}}')).toBe(true)
    expect(spec.params['아래왼쪽']).toBe('[[이전|◀ 이전]]')
    expect(spec.body).not.toContain('아래왼쪽')
    expect(sample[end]).toBe('}}')
    expect(sample[end + 1]).toBe('다음 문단')
  })
})

describe('resolveBannerBoxStyle', () => {
  it('uses safe defaults', () => {
    const style = resolveBannerBoxStyle({})
    expect(style.collapsible).toBe(true)
    expect(style.startCollapsed).toBe(false)
    expect(style.height).toBe('92px')
    expect(style.width).toBeUndefined()
    expect(style.pinTop).toBe(false)
    expect(resolveBannerBoxStyle({ 맨위: '예' }).pinTop).toBe(true)
  })

  it('accepts valid values and drops unsafe ones', () => {
    const style = resolveBannerBoxStyle({
      배경색: '#e4002b',
      띠색: 'red;background:url(x)',
      너비: '470',
      위치: '오른쪽',
      접힘: '예',
      높이: '120',
    })
    expect(style.bannerColor).toBe('#e4002b')
    expect(style.barColor).toBe('#000000')
    expect(style.width).toBe('470px')
    expect(style.floatRight).toBe(true)
    expect(style.startCollapsed).toBe(true)
    expect(style.height).toBe('120px')
  })

  it('never starts collapsed when folding is off', () => {
    expect(resolveBannerBoxStyle({ 접기: '아니오', 접힘: '예' }).startCollapsed).toBe(false)
  })
})

describe('imageAddress', () => {
  it('accepts both a bare address and file syntax', () => {
    expect(imageAddress('/a.png')).toBe('/a.png')
    expect(imageAddress('[[파일:/a.png|width=40]]')).toBe('/a.png')
  })
})

describe('readBannerBox without |본문=', () => {
  it('treats the first table line as the start of the body', () => {
    const lines = ['{{배너상자', '|제목=주장', '|접힘=예', '|| 정재원 || 주장 ||', '|아래왼쪽=[[이전|◀ 이전]]', '}}']
    const { spec } = readBannerBox(lines, 0)
    expect(spec.params['접힘']).toBe('예')
    expect(spec.body).toBe('|| 정재원 || 주장 ||')
    expect(spec.params['아래왼쪽']).toBe('[[이전|◀ 이전]]')
  })
})

describe('banner patterns and colors', () => {
  it('reads pattern, trim, badge, link and paired body colors', () => {
    const style = resolveBannerBoxStyle({
      무늬: '사선',
      옆띠: '예',
      배지색: '#f20138',
      링크색: '#0275d8,#ff9800',
      본문색: '#fff,#1c1d1f',
      옆이미지위치: '위',
    })
    expect(style.pattern).toBe('diagonal')
    expect(style.trim).toBe(true)
    expect(style.badgeColor).toBe('#f20138')
    expect(style.linkColor).toBe('#0275d8')
    expect(style.linkColorDark).toBe('#ff9800')
    expect(style.bodyColor).toBe('#fff')
    expect(style.bodyColorDark).toBe('#1c1d1f')
    expect(style.sideImagesTop).toBe(true)
  })

  it('keeps banner colors out of css functions', () => {
    const style = resolveBannerBoxStyle({ 배경색: 'rgb(0,0,0) 1%, url(https://evil.example/x)', 무늬색: 'red;x' })
    expect(style.bannerColor).toBe('#1f2a37')
    expect(style.patternColor).toBe('#770007')
  })
})
