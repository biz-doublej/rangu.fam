import { describe, expect, it } from 'vitest'
import { documentCategories, documentPageLinks } from '@/lib/wiki/parser/document'
import { GAMECENTER_DOC, GAMECENTER_DOC_TITLE } from './helpDoc'
import { DAILY_GAME_CAP, GAME_REWARDS } from './rewards'

describe('도움말 문서 ‘이랑위키:게임센터’', () => {
  it('보상 숫자는 rewards.ts 에서 온 값 그대로다', () => {
    expect(GAMECENTER_DOC_TITLE).toBe('이랑위키:게임센터')
    expect(GAMECENTER_DOC).toContain(`하루 ${DAILY_GAME_CAP}P`)
    expect(GAMECENTER_DOC).toContain(`승 +${GAME_REWARDS.omok.win}P, 패 +${GAME_REWARDS.omok.lose}P`)
    expect(GAMECENTER_DOC).toContain(`정상 첫 도달 +${GAME_REWARDS.climb.summit}P`)
    expect(GAMECENTER_DOC).toContain('1·2·3위 +50/30/15P')
    expect(GAMECENTER_DOC).not.toMatch(/undefined|NaN|\[object/)
  })

  it('게임 9종을 모두 다룬다', () => {
    for (const name of ['인형뽑기', '테트리스', '랑구 등반', '사다리 타기', '오목', '윷놀이', '라이어 게임', '캐치마인드', '퀴즈 배틀']) {
      expect(GAMECENTER_DOC).toContain(name)
    }
  })

  it('표 칸 안에 칸을 나누는 기호가 없다 (줄마다 칸 수가 머리글과 같다)', () => {
    const rows = GAMECENTER_DOC.split('\n').filter((line) => line.startsWith('||'))
    expect(rows.length).toBeGreaterThan(8)
    for (const row of rows) expect(row.split('||').length).toBe(5) // 세 칸 표: 앞뒤 빈 조각 + 3
  })

  it('위키 파서가 분류와 링크를 읽어 낸다', () => {
    expect(documentCategories(GAMECENTER_DOC)).toEqual(['이랑위키'])
    expect(documentPageLinks(GAMECENTER_DOC)).toContain('이랑위키:도움말')
  })
})
