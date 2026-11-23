import { describe, expect, it } from 'vitest'
import {
  ageOn,
  ddayLabel,
  formatDate,
  kstToday,
  parseImageOptions,
  parseIsoDate,
  parseRuby,
  parseVimeo,
  parseYoutube,
  videoEmbedUrl,
} from './macros'

describe('dates', () => {
  it('reads the Korean date even when UTC is still the day before', () => {
    // 2026-11-23 16:30 UTC = 2026-11-24 01:30 KST
    expect(kstToday(new Date('2026-11-23T16:30:00Z'))).toEqual({ y: 2026, m: 11, d: 24 })
    expect(kstToday(new Date('2026-11-23T14:59:00Z'))).toEqual({ y: 2026, m: 11, d: 23 })
  })

  it('accepts only real dates', () => {
    expect(parseIsoDate('2005-07-27')).toEqual({ y: 2005, m: 7, d: 27 })
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('어제')).toBeNull()
    expect(formatDate({ y: 2026, m: 1, d: 5 })).toBe('2026-01-05')
  })

  it('counts the full age, one more only after the birthday', () => {
    const birth = { y: 2005, m: 7, d: 27 }
    expect(ageOn(birth, { y: 2026, m: 7, d: 26 })).toBe(20)
    expect(ageOn(birth, { y: 2026, m: 7, d: 27 })).toBe(21)
  })

  it('labels days before, on and after the day', () => {
    const today = { y: 2026, m: 11, d: 24 }
    expect(ddayLabel({ y: 2026, m: 12, d: 25 }, today)).toBe('D-31')
    expect(ddayLabel(today, today)).toBe('D-Day')
    expect(ddayLabel({ y: 2026, m: 11, d: 19 }, today)).toBe('D+5')
    expect(ddayLabel({ y: 2027, m: 1, d: 1 }, { y: 2026, m: 12, d: 31 })).toBe('D-1')
  })
})

describe('videos', () => {
  it('reads a YouTube id with Korean or English options', () => {
    expect(parseYoutube('dQw4w9WgXcQ 시작=8 끝=30 너비=640')).toEqual({
      provider: 'youtube', id: 'dQw4w9WgXcQ', start: 8, end: 30, width: '640px',
    })
    expect(parseYoutube('dQw4w9WgXcQ, start=8, width=80%')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ', start: 8, width: '80%' })
  })

  it('reads YouTube addresses, including the t= start', () => {
    expect(parseYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')?.start).toBe(42)
    expect(parseYoutube('https://youtu.be/dQw4w9WgXcQ')?.id).toBe('dQw4w9WgXcQ')
    expect(parseYoutube('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.id).toBe('dQw4w9WgXcQ')
  })

  it('refuses anything that is not a plain video id', () => {
    expect(parseYoutube('"><script>alert(1)</script>')).toBeNull()
    expect(parseYoutube('javascript:alert(1)')).toBeNull()
    expect(parseVimeo('123abc')).toBeNull()
  })

  it('builds privacy-friendly embed addresses', () => {
    expect(videoEmbedUrl(parseYoutube('dQw4w9WgXcQ 시작=8')!)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=8')
    expect(videoEmbedUrl(parseVimeo('https://vimeo.com/76979871')!)).toBe('https://player.vimeo.com/video/76979871')
  })
})

describe('parseRuby', () => {
  it('splits the base text and the small text above it', () => {
    expect(parseRuby('漢字(한자)')).toEqual({ base: '漢字', ruby: '한자' })
    expect(parseRuby('괄호없음')).toBeNull()
  })
})

describe('parseImageOptions', () => {
  it('reads Korean option words in any order', () => {
    expect(parseImageOptions('300px 가운데 다크 둥글게 픽셀')).toEqual({
      width: '300px', align: 'center', theme: 'dark', rounded: true, pixelated: true,
    })
    expect(parseImageOptions('오른쪽 50%')).toEqual({ width: '50%', align: 'right' })
    expect(parseImageOptions('120')).toEqual({ width: '120px' })
  })

  it('reads the namu-style key=value form', () => {
    expect(parseImageOptions('width=300&align=center&theme=dark&border-radius=8&rendering=pixelated')).toEqual({
      width: '300px', align: 'center', theme: 'dark', rounded: true, pixelated: true,
    })
    expect(parseImageOptions('width=30&border=1')).toEqual({ width: '30px', border: true })
  })

  it('keeps any other text as the picture description, as before', () => {
    expect(parseImageOptions('2026년 우승 사진')).toEqual({ alt: '2026년 우승 사진' })
    expect(parseImageOptions('width=9999%')).toEqual({})
  })
})
