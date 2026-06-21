/**
 * 연습(오프라인 PvE) 프리셋 덱 + 멤버 표시 메타.
 *
 * 엔진이 순수 TS라 브라우저에서 그대로 돌아가므로, 서버/DB 없이도 이 프리셋으로
 * 즉시 한 판 둘 수 있다. 영속/랭크/PvP 는 서버 API(service.ts)를 쓴다.
 */
import { MEMBER } from '@/lib/dogam'
import type { CardDef } from './stats'
import type { SpellEffect, SpellSpeed } from './types'

export const MEMBER_CODE: Record<string, string> = {
  [MEMBER.HANUL]: 'HAN',
  [MEMBER.JAEWON]: 'JAE',
  [MEMBER.MINSEOK]: 'MIN',
  [MEMBER.SEUNGCHAN]: 'LEE',
  [MEMBER.JINGYU]: 'JIN',
}
export const MEMBER_COLOR: Record<string, string> = {
  [MEMBER.HANUL]: '#3E5C4A',
  [MEMBER.JAEWON]: '#E0654E',
  [MEMBER.MINSEOK]: '#C28A2D',
  [MEMBER.SEUNGCHAN]: '#4A6FA5',
  [MEMBER.JINGYU]: '#8A5CA0',
}
export const MEMBER_EMOJI: Record<string, string> = {
  [MEMBER.HANUL]: '🌿',
  [MEMBER.JAEWON]: '🔥',
  [MEMBER.MINSEOK]: '⭐',
  [MEMBER.SEUNGCHAN]: '🌊',
  [MEMBER.JINGYU]: '🎐',
}
const PRESTIGE_ID: Record<string, string> = {
  [MEMBER.HANUL]: 'prestige_hanul',
  [MEMBER.JAEWON]: 'prestige_jaewon',
  [MEMBER.MINSEOK]: 'prestige_minseok',
  [MEMBER.SEUNGCHAN]: 'prestige_seungchan',
  [MEMBER.JINGYU]: 'prestige_jinkyu',
}

function years(member: string): CardDef[] {
  const code = MEMBER_CODE[member]
  const out: CardDef[] = []
  for (const y of [2021, 2022, 2023, 2024, 2025]) {
    const yy = String(y).slice(2)
    out.push({ cardId: `${code}_${yy}_V1`, name: `${member} ${y}`, member, type: 'year', rarity: 'basic' })
    out.push({ cardId: `${code}_${yy}_V2`, name: `${member} ${y} ②`, member, type: 'year', rarity: 'basic' })
  }
  return out // 10장
}

function champion(member: string): CardDef {
  return { cardId: PRESTIGE_ID[member], name: `${member} 프레스티지`, member, type: 'prestige', rarity: 'legendary' }
}

function spell(
  cardId: string,
  name: string,
  member: string,
  speed: SpellSpeed,
  cost: number,
  effect: SpellEffect,
  needsTarget = false
): CardDef {
  return { cardId, name, member, type: 'spell', rarity: 'rare', spell: { speed, cost, effect, needsTarget } }
}

// 멤버별 시그니처 주문
const SP = {
  jaewon: () => spell('SP_JAE_FULLACCEL', '풀악셀', MEMBER.JAEWON, 'burst', 2, { kind: 'buffTeam', amount: 1, duration: null }),
  hanul: () => spell('SP_HAN_ZEN', '무념무상', MEMBER.HANUL, 'burst', 2, { kind: 'healNexus', amount: 3 }),
  jingyu: () => spell('SP_JIN_UNPREDICT', '예측불가', MEMBER.JINGYU, 'fast', 1, { kind: 'damageUnit', amount: 2 }, true),
  minseok: () => spell('SP_MIN_SMTM', '쇼미더머니', MEMBER.MINSEOK, 'burst', 1, { kind: 'draw', amount: 1 }),
  seungchan: () => spell('SP_LEE_WAVE', '파도타기', MEMBER.SEUNGCHAN, 'burst', 2, { kind: 'grantKeyword', keyword: 'elusive', duration: null }, true),
}

export interface Preset {
  id: string
  name: string
  subtitle: string
  members: [string, string]
  deck: CardDef[]
}

function build(a: string, b: string, spells: CardDef[]): CardDef[] {
  return [...years(a), ...years(b), champion(a), champion(b), ...spells]
}

export const PRESETS: Preset[] = [
  {
    id: 'jae-lee',
    name: '시간을 넘어서',
    subtitle: '정재원 🔥 + 이승찬 🌊',
    members: [MEMBER.JAEWON, MEMBER.SEUNGCHAN],
    deck: build(MEMBER.JAEWON, MEMBER.SEUNGCHAN, [SP.jaewon(), SP.seungchan(), SP.minseok()]),
  },
  {
    id: 'han-jin',
    name: '매진-한진',
    subtitle: '강한울 🌿 + 정진규 🎐',
    members: [MEMBER.HANUL, MEMBER.JINGYU],
    deck: build(MEMBER.HANUL, MEMBER.JINGYU, [SP.hanul(), SP.jingyu(), SP.jingyu()]),
  },
  {
    id: 'jae-min',
    name: '불꽃 쇼',
    subtitle: '정재원 🔥 + 정민석 ⭐',
    members: [MEMBER.JAEWON, MEMBER.MINSEOK],
    deck: build(MEMBER.JAEWON, MEMBER.MINSEOK, [SP.jaewon(), SP.minseok(), SP.jaewon()]),
  },
  {
    id: 'lee-min',
    name: 'SHOW ME THE MONEY',
    subtitle: '이승찬 🌊 + 정민석 ⭐',
    members: [MEMBER.SEUNGCHAN, MEMBER.MINSEOK],
    deck: build(MEMBER.SEUNGCHAN, MEMBER.MINSEOK, [SP.seungchan(), SP.minseok(), SP.minseok()]),
  },
]

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
