/**
 * 랑구 택틱스 — card_game_defs 정본 시드 데이터 (엑셀 「카드 일람 [완성]」 반영).
 *
 * 출처: public/랑구 택틱스 (Rangu Tactics) - 카드 일람 [완성].xlsx
 * 이 파일은 순수 데이터(런타임 의존성 없음). 시드 라우트가 cards 테이블과 매칭해 upsert 한다.
 *
 * 인코딩 정책 (= "엔진 지원 효과만 구조화"):
 *  - 스탯/코스트/키워드/진영/타입 = 엑셀 명시값 100% 반영.
 *  - effects[] = 현 CardEffect 스키마(types.ts)로 표현 가능한 것만 구조화 →
 *    엔진 resolver 가 즉시 실행 가능. 표현 불가한 설계(확률 기절·세트 시너지·
 *    누적 조건·돌격/관통 비키워드·오버마나 등)는 effects 에서 생략(키워드/스탯은 유지).
 *  - champion = 프레스티지 각성 스펙(각성 후 스탯 + 추가 키워드). levelUpCondition 은
 *    엔진이 해석할 조건 키 문자열(미구현 조건이면 각성 트리거만 보류, 데이터는 정본).
 *  - UNIV(학과 마스코트) 7종은 엑셀에 "스탯/효과 추후"로 명시 → 본 시드 제외.
 *
 * cardId 컨벤션 주의: 엑셀/presets 는 `HAN_21_V1`(2자리·대문자), DB 수집 카드는
 * `HAN_2026_v1`(4자리·소문자, cards-2026 라우트) 처럼 표기가 갈린다. 그래서 시드는
 * 엑셀 정본 ID 로 선언하고, 라우트가 `normalizeCardId` 로 cards 테이블과 매칭한다.
 */
import { MEMBER } from '@/lib/dogam'
import type { CardEffect, ChampionSpec, Keyword, SpellSpeed, TacticsCardType } from '@/lib/tactics/types'

/** card_game_defs 한 행의 시드 형태 (rarity 는 cards 테이블 소관이라 제외). */
export interface CardDefSeed {
  cardId: string
  faction: string
  cardType: TacticsCardType
  cost: number
  attack: number | null
  health: number | null
  keywords: Keyword[]
  spellSpeed?: SpellSpeed
  effects: CardEffect[]
  champion?: ChampionSpec | null
  /** 엑셀 카테고리(리포트/디버그용 메모 — DB 컬럼 아님) */
  group: string
}

/**
 * cardId 정규화 — 표기 흔들림(연도 4↔2자리, 대소문자, 구분자)을 흡수해 매칭한다.
 *  HAN_2021_v1 → HAN21V1 / HAN_21_V1 → HAN21V1 (일치)
 *  4자리 연도(19xx/20xx)는 뒤 2자리로 축약, 그 외 영숫자만 남기고 대문자화.
 */
export function normalizeCardId(id: string): string {
  return (id || '')
    .toUpperCase()
    .replace(/(?:19|20)(\d{2})/g, '$1') // 2021→21, 2026→26 (SC_HAN_19 의 2자리는 불변)
    .replace(/[^A-Z0-9]/g, '')
}

// ── 진영(멤버) 코드 ──
const M = MEMBER
const CODE: Record<string, string> = {
  [M.HANUL]: 'HAN',
  [M.JAEWON]: 'JAE',
  [M.MINSEOK]: 'MIN',
  [M.SEUNGCHAN]: 'LEE',
  [M.JINGYU]: 'JIN',
}
const UNIVERSE = '랑구 유니버스'

// ── 효과 빌더(가독성) ──
const fx = (trigger: CardEffect['trigger'], kind: CardEffect['kind'], extra: Partial<CardEffect> = {}): CardEffect => ({
  trigger,
  kind,
  ...extra,
})

// ════════════════════════════════════════════════════════════════
// ① 년도(시즌) 카드 — 추종자 (베이직, cost 1). 멤버별 스탯/키워드/효과.
// ════════════════════════════════════════════════════════════════
interface YearProfile {
  power: number
  health: number
  kw: Keyword
  effects: CardEffect[]
}
const YEAR: Record<string, YearProfile> = {
  // 강한울: 끈질김 + 라운드 종료 본진 1 회복
  [M.HANUL]: { power: 1, health: 5, kw: 'tough', effects: [fx('roundEnd', 'healNexus', { amount: 1 })] },
  // 정재원: 일격 + 공격 시 이번 라운드 +1|0
  [M.JAEWON]: {
    power: 6,
    health: 2,
    kw: 'overwhelm',
    effects: [fx('attack', 'buffUnit', { amount: 1, duration: 1, target: { select: 'self' } })],
  },
  // 정민석: 흡혈 + 소환 시 다른 아군 1기 +0|+1
  [M.MINSEOK]: {
    power: 4,
    health: 4,
    kw: 'lifesteal',
    effects: [fx('summon', 'buffUnit', { health: 1, duration: null, target: { select: 'chooseAllyUnit', count: 1 } })],
  },
  // 이승찬: 잠행 (라운드 스케일링은 조건 표현 불가 → 효과 생략, 키워드 유지)
  [M.SEUNGCHAN]: { power: 3, health: 4, kw: 'elusive', effects: [] },
  // 정진규: 속공 (확률 기절은 표현 불가 → 효과 생략, 키워드 유지)
  [M.JINGYU]: { power: 4, health: 3, kw: 'quickAttack', effects: [] },
}

function yearDefs(): CardDefSeed[] {
  const out: CardDefSeed[] = []
  for (const member of Object.keys(YEAR)) {
    const p = YEAR[member]
    const code = CODE[member]
    const base = { faction: member, cardType: 'unit' as const, cost: 1, attack: p.power, health: p.health, keywords: [p.kw], effects: p.effects, group: 'year' }
    for (const yy of [21, 22, 23, 24, 25]) {
      out.push({ cardId: `${code}_${yy}_V1`, ...base })
      out.push({ cardId: `${code}_${yy}_V2`, ...base })
    }
    out.push({ cardId: `${code}_26_V1`, ...base }) // 2026 은 V1 만 (엑셀)
  }
  return out
}

// ════════════════════════════════════════════════════════════════
// ② 시그니처 — 추종자 (cost 3)
// ════════════════════════════════════════════════════════════════
const SIG: CardDefSeed[] = [
  // 돌격/관통 비키워드·누적조건은 표현 불가 → 키워드/스탯만, 표현가능 효과만 구조화
  sigDef('SIG_JAE_22', M.JAEWON, 10, 3, ['overwhelm'], []),
  sigDef('SIG_JAE_24', M.JAEWON, 10, 3, ['overwhelm'], []),
  sigDef('SIG_JAE_25', M.JAEWON, 10, 3, ['overwhelm'], [fx('attack', 'buffUnit', { amount: 2, duration: null, target: { select: 'self' } })]),
  sigDef('SIG_HAN_20', M.HANUL, 2, 8, ['tough', 'challenger'], []),
  sigDef('SIG_HAN_22', M.HANUL, 2, 8, ['tough'], [fx('roundStart', 'healNexus', { amount: 2 })]),
  sigDef('SIG_HAN_23', M.HANUL, 2, 9, ['tough', 'barrier'], []),
]
function sigDef(cardId: string, faction: string, attack: number, health: number, keywords: Keyword[], effects: CardEffect[]): CardDefSeed {
  return { cardId, faction, cardType: 'unit', cost: 3, attack, health, keywords, effects, group: 'signature' }
}

// ════════════════════════════════════════════════════════════════
// ③ 학생회(SC) — 추종자 (희귀, cost 2). 세트 시너지는 표현 불가 → 키워드/스탯만.
// ════════════════════════════════════════════════════════════════
function rareUnit(cardId: string, faction: string, attack: number, health: number, keywords: Keyword[], effects: CardEffect[], group: string): CardDefSeed {
  return { cardId, faction, cardType: 'unit', cost: 2, attack, health, keywords, effects, group }
}
const SC: CardDefSeed[] = [
  rareUnit('SC_HAN_19', M.HANUL, 1, 7, ['tough'], [], 'studentcouncil'),
  rareUnit('SC_HAN_20', M.HANUL, 1, 7, ['tough'], [], 'studentcouncil'),
  rareUnit('SC_HAN_21', M.HANUL, 1, 7, ['tough'], [], 'studentcouncil'),
  rareUnit('SC_HAN_22', M.HANUL, 1, 7, ['tough'], [], 'studentcouncil'),
  rareUnit('SC_HAN_23', M.HANUL, 1, 7, ['tough'], [], 'studentcouncil'),
  rareUnit('SC_JAE_22', M.JAEWON, 7, 3, ['overwhelm'], [], 'studentcouncil'),
  rareUnit('SC_JAE_23', M.JAEWON, 7, 3, ['overwhelm'], [], 'studentcouncil'),
  rareUnit('SC_JIN_19', M.JINGYU, 4, 4, ['quickAttack'], [], 'studentcouncil'),
  rareUnit('SC_JIN_20', M.JINGYU, 4, 4, ['quickAttack'], [], 'studentcouncil'),
  rareUnit('SC_MIN_22', M.MINSEOK, 5, 5, ['lifesteal'], [], 'studentcouncil'),
]

// ════════════════════════════════════════════════════════════════
// ④ 백넘버(BACKNUM) — 추종자 (희귀, cost 2). 소환 시 +1|+1 자가.
// ════════════════════════════════════════════════════════════════
const BACKNUM_FX: CardEffect[] = [fx('summon', 'buffUnit', { amount: 1, health: 1, duration: null, target: { select: 'self' } })]
const BACKNUM: CardDefSeed[] = [
  rareUnit('BACKNUM_HAN', M.HANUL, 1, 7, ['tough'], BACKNUM_FX, 'backnumber'),
  rareUnit('BACKNUM_JAE', M.JAEWON, 7, 3, ['overwhelm'], BACKNUM_FX, 'backnumber'),
  rareUnit('BACKNUM_JIN', M.JINGYU, 4, 4, ['quickAttack'], BACKNUM_FX, 'backnumber'),
  rareUnit('BACKNUM_LEE', M.SEUNGCHAN, 4, 5, ['elusive'], BACKNUM_FX, 'backnumber'),
  rareUnit('BACKNUM_MIN', M.MINSEOK, 5, 5, ['lifesteal'], BACKNUM_FX, 'backnumber'),
]

// ════════════════════════════════════════════════════════════════
// ⑤ 야구 — 추종자 (에픽, cost 3). 세트 시너지는 표현 불가 → 키워드/스탯만.
// ════════════════════════════════════════════════════════════════
function epicUnit(cardId: string, faction: string, attack: number, health: number, keywords: Keyword[], effects: CardEffect[], group: string): CardDefSeed {
  return { cardId, faction, cardType: 'unit', cost: 3, attack, health, keywords, effects, group }
}
const BASEBALL: CardDefSeed[] = [
  epicUnit('KIATIGERS_HAN', M.HANUL, 2, 9, ['tough', 'overwhelm'], [], 'baseball'),
  epicUnit('LGTWINS_JAE', M.JAEWON, 11, 4, ['overwhelm'], [], 'baseball'),
  epicUnit('LGTWINS_LEE', M.SEUNGCHAN, 7, 7, ['elusive', 'overwhelm'], [], 'baseball'),
  epicUnit('LGTWINS_MIN', M.MINSEOK, 9, 7, ['lifesteal', 'overwhelm'], [], 'baseball'),
]

// ════════════════════════════════════════════════════════════════
// ⑥ 랑구 — 추종자 (에픽, cost 3). 단체 버프.
// ════════════════════════════════════════════════════════════════
const RANGU: CardDefSeed[] = [
  epicUnit('RANGGU_ANNIVER', UNIVERSE, 4, 6, [], [fx('roundStart', 'buffTeam', { health: 1, duration: null })], 'rangu'),
  // 오버마나 +1 은 표현 불가 → 드로우만 구조화
  epicUnit('RANGGU_SPECIAL', UNIVERSE, 5, 5, [], [fx('summon', 'draw', { amount: 1 })], 'rangu'),
]

// ════════════════════════════════════════════════════════════════
// ⑦ NEW GENERATION(NG) — 추종자 (희귀). 소환 시 이번 라운드 +2|0 자가.
// ════════════════════════════════════════════════════════════════
const NG_FX: CardEffect[] = [fx('summon', 'buffUnit', { amount: 2, duration: 1, target: { select: 'self' } })]
const NG: CardDefSeed[] = [
  rareUnit('NG_HAN_V1', M.HANUL, 1, 7, ['tough'], NG_FX, 'newgeneration'),
  rareUnit('NG_HAN_V2', M.HANUL, 1, 7, ['tough'], NG_FX, 'newgeneration'),
  rareUnit('NG_JAE_V1', M.JAEWON, 8, 3, ['overwhelm'], NG_FX, 'newgeneration'),
  rareUnit('NG_JAE_V2', M.JAEWON, 8, 3, ['overwhelm'], NG_FX, 'newgeneration'),
  rareUnit('NG_JIN_V1', M.JINGYU, 5, 4, ['quickAttack'], NG_FX, 'newgeneration'),
  rareUnit('NG_LEE_V1', M.SEUNGCHAN, 4, 5, ['elusive'], NG_FX, 'newgeneration'),
  rareUnit('NG_LEE_V2', M.SEUNGCHAN, 4, 5, ['elusive'], NG_FX, 'newgeneration'),
  rareUnit('NG_LEE_V3', M.SEUNGCHAN, 4, 5, ['elusive'], NG_FX, 'newgeneration'),
  rareUnit('NG_MIN_V1', M.MINSEOK, 5, 5, ['lifesteal'], NG_FX, 'newgeneration'),
]

// ════════════════════════════════════════════════════════════════
// ⑧ OLD LEGACY(OL) — 추종자 (희귀). 재생(키워드).
// ════════════════════════════════════════════════════════════════
const OL: CardDefSeed[] = [
  rareUnit('OL_HAN_V1', M.HANUL, 1, 7, ['tough', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_HAN_V2', M.HANUL, 1, 7, ['tough', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_JAE_V1', M.JAEWON, 5, 3, ['overwhelm', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_JAE_V2', M.JAEWON, 5, 3, ['overwhelm', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_JIN_V1', M.JINGYU, 3, 4, ['quickAttack', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_JIN_V2', M.JINGYU, 3, 4, ['quickAttack', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_MIN_V1', M.MINSEOK, 4, 5, ['lifesteal', 'regeneration'], [], 'oldlegacy'),
  rareUnit('OL_MIN_V2', M.MINSEOK, 4, 5, ['lifesteal', 'regeneration'], [], 'oldlegacy'),
]

// ════════════════════════════════════════════════════════════════
// ⑨ 프로필(PF) — 추종자 (희귀). 키워드만(효율형).
// ════════════════════════════════════════════════════════════════
const PF: CardDefSeed[] = [
  rareUnit('PF_HAN', M.HANUL, 1, 7, ['tough'], [], 'profile'),
  rareUnit('PF_JAE', M.JAEWON, 7, 3, ['overwhelm'], [], 'profile'),
  rareUnit('PF_JIN', M.JINGYU, 4, 4, ['quickAttack'], [], 'profile'),
  rareUnit('PF_LEE', M.SEUNGCHAN, 3, 5, ['elusive'], [], 'profile'),
  rareUnit('PF_MIN', M.MINSEOK, 4, 5, ['lifesteal'], [], 'profile'),
]

// ════════════════════════════════════════════════════════════════
// ⑩ 챔피언 · 프레스티지 (cost 5). champion = 각성 스펙.
// ════════════════════════════════════════════════════════════════
const PRESTIGE: CardDefSeed[] = [
  {
    cardId: 'prestige_jaewon', faction: M.JAEWON, cardType: 'champion', cost: 5, attack: 12, health: 6,
    keywords: ['overwhelm'], effects: [fx('summon', 'damageNexus', { amount: 2 })],
    champion: { levelUpCondition: 'ally_nexus_damage_10', attack: 12, health: 8, addKeywords: ['overwhelm'] },
    group: 'prestige',
  },
  {
    cardId: 'prestige_seungchan', faction: M.SEUNGCHAN, cardType: 'champion', cost: 5, attack: 12, health: 12,
    keywords: ['elusive'], effects: [],
    champion: { levelUpCondition: 'round_6_reached', attack: 12, health: 12, addKeywords: ['elusive'] },
    group: 'prestige',
  },
  {
    cardId: 'prestige_hanul', faction: M.HANUL, cardType: 'champion', cost: 5, attack: 6, health: 12,
    keywords: ['tough'], effects: [],
    champion: { levelUpCondition: 'allies_blocked_6', attack: 6, health: 12, addKeywords: ['challenger'] },
    group: 'prestige',
  },
  {
    cardId: 'prestige_minseok', faction: M.MINSEOK, cardType: 'champion', cost: 5, attack: 12, health: 12,
    keywords: ['lifesteal'], effects: [],
    champion: { levelUpCondition: 'nexus_healed_8', attack: 12, health: 12, addKeywords: ['lifesteal'] },
    group: 'prestige',
  },
  {
    cardId: 'prestige_jinkyu', faction: M.JINGYU, cardType: 'champion', cost: 5, attack: 12, health: 9,
    keywords: ['quickAttack'], effects: [],
    champion: { levelUpCondition: 'cast_4_spells', attack: 12, health: 9, addKeywords: ['quickAttack'] },
    group: 'prestige',
  },
  // 단체 프레스티지(전설) — 덱빌드 제약·게임당1회 활성기는 표현 불가 → 키워드/스탯만
  {
    cardId: 'prestige_group_special', faction: UNIVERSE, cardType: 'champion', cost: 5, attack: 12, health: 12,
    keywords: ['overwhelm', 'tough'], effects: [], champion: null, group: 'prestige',
  },
]

// ════════════════════════════════════════════════════════════════
// ⑫ 재료 — 조커 (cost 2). 무작위 키워드 부여는 표현 불가 → 스탯만.
// ════════════════════════════════════════════════════════════════
const MATERIAL: CardDefSeed[] = [
  { cardId: 'joker_card', faction: UNIVERSE, cardType: 'unit', cost: 2, attack: 2, health: 2, keywords: [], effects: [], group: 'material' },
]

// ════════════════════════════════════════════════════════════════
// ⑬ 주문(SP) — spell (attack/health null). spellSpeed: 즉발=burst·순간=fast·지연=slow.
// ════════════════════════════════════════════════════════════════
function spellDef(cardId: string, faction: string, cost: number, speed: SpellSpeed, effects: CardEffect[]): CardDefSeed {
  return { cardId, faction, cardType: 'spell', cost, attack: null, health: null, keywords: [], spellSpeed: speed, effects, group: 'spell' }
}
const SPELLS: CardDefSeed[] = [
  spellDef('SP_JAE_FULLACCEL', M.JAEWON, 2, 'burst', [fx('cast', 'buffTeam', { amount: 1, duration: null })]),
  spellDef('SP_HAN_ZEN', M.HANUL, 2, 'burst', [fx('cast', 'healNexus', { amount: 3 })]),
  spellDef('SP_JIN_UNPREDICT', M.JINGYU, 1, 'fast', [fx('cast', 'damageUnit', { amount: 2, target: { select: 'chooseEnemyUnit', count: 1 } })]),
  spellDef('SP_MIN_SMTM', M.MINSEOK, 1, 'burst', [fx('cast', 'draw', { amount: 1 })]),
  spellDef('SP_LEE_WAVE', M.SEUNGCHAN, 2, 'burst', [fx('cast', 'grantKeyword', { keyword: 'elusive', duration: null, target: { select: 'chooseAllyUnit', count: 1 } })]),
  spellDef('SP_JAE_OVERDRIVE', M.JAEWON, 3, 'slow', [
    fx('cast', 'buffUnit', { amount: 3, duration: 1, target: { select: 'chooseAllyUnit', count: 1 } }),
    fx('cast', 'grantKeyword', { keyword: 'overwhelm', duration: 1, target: { select: 'chooseAllyUnit', count: 1 } }),
  ]),
  spellDef('SP_HAN_WALL', M.HANUL, 2, 'fast', [fx('cast', 'grantKeyword', { keyword: 'barrier', duration: null, target: { select: 'chooseAllyUnit', count: 1 } })]),
  spellDef('SP_JIN_CHAOS', M.JINGYU, 3, 'slow', [fx('cast', 'stun', { duration: 1, target: { select: 'allEnemies' } })]),
  // "6R 이후 3피해" 조건은 표현 불가 → 기본 2피해만
  spellDef('SP_LEE_TSUNAMI', M.SEUNGCHAN, 4, 'slow', [fx('cast', 'damageUnit', { amount: 2, target: { select: 'allEnemies' } })]),
  spellDef('SP_MIN_HYPE', M.MINSEOK, 2, 'burst', [fx('cast', 'grantKeyword', { keyword: 'lifesteal', duration: 1, target: { select: 'allAllies' } })]),
]

/** 엑셀 [완성] 전체 배틀정의 시드 (UNIV 마스코트 제외). */
export const CARD_DEF_SEEDS: CardDefSeed[] = [
  ...yearDefs(),
  ...SIG,
  ...SC,
  ...BACKNUM,
  ...BASEBALL,
  ...RANGU,
  ...NG,
  ...OL,
  ...PF,
  ...PRESTIGE,
  ...MATERIAL,
  ...SPELLS,
]

// ════════════════════════════════════════════════════════════════
// 표시 메타(이름·등급·이미지) — 엑셀 「카드 일람 [완성]」에서 추출.
// 택틱스는 웹 뽑기와 별개 시스템 — cards(뽑기) 테이블과 무관하게 이 로스터로 자족하고,
// **이미지 파일만 공유**(imageUrl 은 같은 /images/cards 경로). 주문은 전용 이미지 없음(null).
// ════════════════════════════════════════════════════════════════
export interface CardDisplayMeta {
  name: string
  rarity: string
  imageUrl: string | null
}
const DISPLAY_META: Record<string, CardDisplayMeta> = {
  HAN_21_V1: { name: '강한울 2021', rarity: 'basic', imageUrl: '/images/cards/year/HAN_21_V1.jpg' },
  HAN_21_V2: { name: '강한울 2021 ②', rarity: 'basic', imageUrl: '/images/cards/year/HAN_21_V2.jpg' },
  HAN_22_V1: { name: '강한울 2022', rarity: 'basic', imageUrl: '/images/cards/year/HAN_22_V1.jpg' },
  HAN_22_V2: { name: '강한울 2022 ②', rarity: 'basic', imageUrl: '/images/cards/year/HAN_22_V2.jpg' },
  HAN_23_V1: { name: '강한울 2023', rarity: 'basic', imageUrl: '/images/cards/year/HAN_23_V1.jpg' },
  HAN_23_V2: { name: '강한울 2023 ②', rarity: 'basic', imageUrl: '/images/cards/year/HAN_23_V2.jpg' },
  HAN_24_V1: { name: '강한울 2024', rarity: 'basic', imageUrl: '/images/cards/year/HAN_24_V1.jpg' },
  HAN_24_V2: { name: '강한울 2024 ②', rarity: 'basic', imageUrl: '/images/cards/year/HAN_24_V2.jpg' },
  HAN_25_V1: { name: '강한울 2025', rarity: 'basic', imageUrl: '/images/cards/year/HAN_25_V1.jpg' },
  HAN_25_V2: { name: '강한울 2025 ②', rarity: 'basic', imageUrl: '/images/cards/year/HAN_25_V2.jpg' },
  HAN_26_V1: { name: '강한울 2026', rarity: 'basic', imageUrl: '/images/cards/year/HAN_26_V1.jpg' },
  JAE_21_V1: { name: '정재원 2021', rarity: 'basic', imageUrl: '/images/cards/year/JAE_21_V1.jpg' },
  JAE_21_V2: { name: '정재원 2021 ②', rarity: 'basic', imageUrl: '/images/cards/year/JAE_21_V2.jpg' },
  JAE_22_V1: { name: '정재원 2022', rarity: 'basic', imageUrl: '/images/cards/year/JAE_22_V1.jpg' },
  JAE_22_V2: { name: '정재원 2022 ②', rarity: 'basic', imageUrl: '/images/cards/year/JAE_22_V2.jpg' },
  JAE_23_V1: { name: '정재원 2023', rarity: 'basic', imageUrl: '/images/cards/year/JAE_23_V1.jpg' },
  JAE_23_V2: { name: '정재원 2023 ②', rarity: 'basic', imageUrl: '/images/cards/year/JAE_23_V2.jpg' },
  JAE_24_V1: { name: '정재원 2024', rarity: 'basic', imageUrl: '/images/cards/year/JAE_24_V1.jpg' },
  JAE_24_V2: { name: '정재원 2024 ②', rarity: 'basic', imageUrl: '/images/cards/year/JAE_24_V2.jpg' },
  JAE_25_V1: { name: '정재원 2025', rarity: 'basic', imageUrl: '/images/cards/year/JAE_25_V1.jpg' },
  JAE_25_V2: { name: '정재원 2025 ②', rarity: 'basic', imageUrl: '/images/cards/year/JAE_25_V2.jpg' },
  JAE_26_V1: { name: '정재원 2026', rarity: 'basic', imageUrl: '/images/cards/year/JAE_26_V1.jpg' },
  MIN_21_V1: { name: '정민석 2021', rarity: 'basic', imageUrl: '/images/cards/year/MIN_21_V1.jpg' },
  MIN_21_V2: { name: '정민석 2021 ②', rarity: 'basic', imageUrl: '/images/cards/year/MIN_21_V2.jpg' },
  MIN_22_V1: { name: '정민석 2022', rarity: 'basic', imageUrl: '/images/cards/year/MIN_22_V1.jpg' },
  MIN_22_V2: { name: '정민석 2022 ②', rarity: 'basic', imageUrl: '/images/cards/year/MIN_22_V2.jpg' },
  MIN_23_V1: { name: '정민석 2023', rarity: 'basic', imageUrl: '/images/cards/year/MIN_23_V1.jpg' },
  MIN_23_V2: { name: '정민석 2023 ②', rarity: 'basic', imageUrl: '/images/cards/year/MIN_23_V2.jpg' },
  MIN_24_V1: { name: '정민석 2024', rarity: 'basic', imageUrl: '/images/cards/year/MIN_24_V1.jpg' },
  MIN_24_V2: { name: '정민석 2024 ②', rarity: 'basic', imageUrl: '/images/cards/year/MIN_24_V2.jpg' },
  MIN_25_V1: { name: '정민석 2025', rarity: 'basic', imageUrl: '/images/cards/year/MIN_25_V1.jpg' },
  MIN_25_V2: { name: '정민석 2025 ②', rarity: 'basic', imageUrl: '/images/cards/year/MIN_25_V2.jpg' },
  MIN_26_V1: { name: '정민석 2026', rarity: 'basic', imageUrl: '/images/cards/year/MIN_26_V1.jpg' },
  LEE_21_V1: { name: '이승찬 2021', rarity: 'basic', imageUrl: '/images/cards/year/LEE_21_V1.jpg' },
  LEE_21_V2: { name: '이승찬 2021 ②', rarity: 'basic', imageUrl: '/images/cards/year/LEE_21_V2.png' },
  LEE_22_V1: { name: '이승찬 2022', rarity: 'basic', imageUrl: '/images/cards/year/LEE_22_V1.jpg' },
  LEE_22_V2: { name: '이승찬 2022 ②', rarity: 'basic', imageUrl: '/images/cards/year/LEE_22_V2.jpg' },
  LEE_23_V1: { name: '이승찬 2023', rarity: 'basic', imageUrl: '/images/cards/year/LEE_23_V1.jpg' },
  LEE_23_V2: { name: '이승찬 2023 ②', rarity: 'basic', imageUrl: '/images/cards/year/LEE_23_V2.jpg' },
  LEE_24_V1: { name: '이승찬 2024', rarity: 'basic', imageUrl: '/images/cards/year/LEE_24_V1.jpg' },
  LEE_24_V2: { name: '이승찬 2024 ②', rarity: 'basic', imageUrl: '/images/cards/year/LEE_24_V2.jpg' },
  LEE_25_V1: { name: '이승찬 2025', rarity: 'basic', imageUrl: '/images/cards/year/LEE_25_V1.jpg' },
  LEE_25_V2: { name: '이승찬 2025 ②', rarity: 'basic', imageUrl: '/images/cards/year/LEE_25_V2.jpg' },
  LEE_26_V1: { name: '이승찬 2026', rarity: 'basic', imageUrl: '/images/cards/year/LEE_26_V1.jpg' },
  JIN_21_V1: { name: '정진규 2021', rarity: 'basic', imageUrl: '/images/cards/year/JIN_21_V1.jpg' },
  JIN_21_V2: { name: '정진규 2021 ②', rarity: 'basic', imageUrl: '/images/cards/year/JIN_21_V2.jpg' },
  JIN_22_V1: { name: '정진규 2022', rarity: 'basic', imageUrl: '/images/cards/year/JIN_22_V1.jpg' },
  JIN_22_V2: { name: '정진규 2022 ②', rarity: 'basic', imageUrl: '/images/cards/year/JIN_22_V2.jpg' },
  JIN_23_V1: { name: '정진규 2023', rarity: 'basic', imageUrl: '/images/cards/year/JIN_23_V1.jpg' },
  JIN_23_V2: { name: '정진규 2023 ②', rarity: 'basic', imageUrl: '/images/cards/year/JIN_23_V2.jpg' },
  JIN_24_V1: { name: '정진규 2024', rarity: 'basic', imageUrl: '/images/cards/year/JIN_24_V1.jpg' },
  JIN_24_V2: { name: '정진규 2024 ②', rarity: 'basic', imageUrl: '/images/cards/year/JIN_24_V2.jpg' },
  JIN_25_V1: { name: '정진규 2025', rarity: 'basic', imageUrl: '/images/cards/year/JIN_25_V1.jpg' },
  JIN_25_V2: { name: '정진규 2025 ②', rarity: 'basic', imageUrl: '/images/cards/year/JIN_25_V2.jpg' },
  JIN_26_V1: { name: '정진규 2026', rarity: 'basic', imageUrl: '/images/cards/year/JIN_26_V1.jpg' },
  SIG_JAE_22: { name: '정재원 시그니처 ’22', rarity: 'signature', imageUrl: '/images/cards/signature/SIG_JAE_22.jpg' },
  SIG_JAE_24: { name: '정재원 시그니처 ’24', rarity: 'signature', imageUrl: '/images/cards/signature/SIG_JAE_24.jpg' },
  SIG_JAE_25: { name: '정재원 시그니처 ’25', rarity: 'signature', imageUrl: '/images/cards/signature/SIG_JAE_25.jpg' },
  SIG_HAN_20: { name: '강한울 시그니처 ’20', rarity: 'signature', imageUrl: '/images/cards/signature/SIG_HAN_20.jpg' },
  SIG_HAN_22: { name: '강한울 시그니처 ’22', rarity: 'signature', imageUrl: '/images/cards/signature/SIG_HAN_22.jpg' },
  SIG_HAN_23: { name: '강한울 시그니처 ’23', rarity: 'signature', imageUrl: '/images/cards/signature/SIG_HAN_23.jpg' },
  SC_HAN_19: { name: '강한울 학생회 ’19 신입', rarity: 'rare', imageUrl: '/images/cards/special/SC_HAN_19.jpg' },
  SC_HAN_20: { name: '강한울 학생회 ’20', rarity: 'rare', imageUrl: '/images/cards/special/SC_HAN_20.jpg' },
  SC_HAN_21: { name: '강한울 학생회 ’21', rarity: 'rare', imageUrl: '/images/cards/special/SC_HAN_21.jpg' },
  SC_HAN_22: { name: '강한울 학생회 ’22', rarity: 'rare', imageUrl: '/images/cards/special/SC_HAN_22.jpg' },
  SC_HAN_23: { name: '강한울 학생회 ’23 회장', rarity: 'rare', imageUrl: '/images/cards/special/SC_HAN_23.jpg' },
  SC_JAE_22: { name: '정재원 학생회 ’22', rarity: 'rare', imageUrl: '/images/cards/special/SC_JAE_22.jpg' },
  SC_JAE_23: { name: '정재원 학생회 ’23', rarity: 'rare', imageUrl: '/images/cards/special/SC_JAE_23.jpg' },
  SC_JIN_19: { name: '정진규 학생회 ’19', rarity: 'rare', imageUrl: '/images/cards/special/SC_JIN_19.jpg' },
  SC_JIN_20: { name: '정진규 학생회 ’20', rarity: 'rare', imageUrl: '/images/cards/special/SC_JIN_20.jpg' },
  SC_MIN_22: { name: '정민석 학생회 ’22', rarity: 'rare', imageUrl: '/images/cards/special/SC_MIN_22.jpg' },
  BACKNUM_HAN: { name: '강한울 백넘버', rarity: 'rare', imageUrl: '/images/cards/special/BACKNUM_HAN.jpg' },
  BACKNUM_JAE: { name: '정재원 백넘버', rarity: 'rare', imageUrl: '/images/cards/special/BACKNUM_JAE.jpg' },
  BACKNUM_JIN: { name: '정진규 백넘버', rarity: 'rare', imageUrl: '/images/cards/special/BACKNUM_JIN.jpg' },
  BACKNUM_LEE: { name: '이승찬 백넘버', rarity: 'rare', imageUrl: '/images/cards/special/BACKNUM_LEE.jpg' },
  BACKNUM_MIN: { name: '정민석 백넘버', rarity: 'rare', imageUrl: '/images/cards/special/BACKNUM_MIN.jpg' },
  KIATIGERS_HAN: { name: '강한울 · KIA 타이거즈', rarity: 'epic', imageUrl: '/images/cards/special/KIATIGERS_HAN.jpg' },
  LGTWINS_JAE: { name: '정재원 · LG 트윈스', rarity: 'epic', imageUrl: '/images/cards/special/LGTWINS_JAE.jpg' },
  LGTWINS_LEE: { name: '이승찬 · LG 트윈스', rarity: 'epic', imageUrl: '/images/cards/special/LGTWINS_LEE.jpg' },
  LGTWINS_MIN: { name: '정민석 · LG 트윈스', rarity: 'epic', imageUrl: '/images/cards/special/LGTWINS_MIN.jpg' },
  RANGGU_ANNIVER: { name: '랑구 애니버서리', rarity: 'epic', imageUrl: '/images/cards/special/RANGGU_ANNIVER.jpg' },
  RANGGU_SPECIAL: { name: '랑구 스페셜', rarity: 'epic', imageUrl: '/images/cards/special/RANGGU_SPECIAL.jpg' },
  NG_HAN_V1: { name: '강한울 NEW GEN V1', rarity: 'rare', imageUrl: '/images/cards/special/NG_HAN_V1.jpg' },
  NG_HAN_V2: { name: '강한울 NEW GEN V2', rarity: 'rare', imageUrl: '/images/cards/special/NG_HAN_V2.jpg' },
  NG_JAE_V1: { name: '정재원 NEW GEN V1', rarity: 'rare', imageUrl: '/images/cards/special/NG_JAE_V1.jpg' },
  NG_JAE_V2: { name: '정재원 NEW GEN V2', rarity: 'rare', imageUrl: '/images/cards/special/NG_JAE_V2.jpg' },
  NG_JIN_V1: { name: '정진규 NEW GEN V1', rarity: 'rare', imageUrl: '/images/cards/special/NG_JIN_V1.jpg' },
  NG_LEE_V1: { name: '이승찬 NEW GEN V1', rarity: 'rare', imageUrl: '/images/cards/special/NG_LEE_V1.jpg' },
  NG_LEE_V2: { name: '이승찬 NEW GEN V2', rarity: 'rare', imageUrl: '/images/cards/special/NG_LEE_V2.jpg' },
  NG_LEE_V3: { name: '이승찬 NEW GEN V3', rarity: 'rare', imageUrl: '/images/cards/special/NG_LEE_V3.jpg' },
  NG_MIN_V1: { name: '정민석 NEW GEN V1', rarity: 'rare', imageUrl: '/images/cards/special/NG_MIN_V1.jpg' },
  OL_HAN_V1: { name: '강한울 OLD LEGACY V1', rarity: 'rare', imageUrl: '/images/cards/special/OL_HAN_V1.jpg' },
  OL_HAN_V2: { name: '강한울 OLD LEGACY V2', rarity: 'rare', imageUrl: '/images/cards/special/OL_HAN_V2.jpg' },
  OL_JAE_V1: { name: '정재원 OLD LEGACY V1', rarity: 'rare', imageUrl: '/images/cards/special/OL_JAE_V1.jpg' },
  OL_JAE_V2: { name: '정재원 OLD LEGACY V2', rarity: 'rare', imageUrl: '/images/cards/special/OL_JAE_V2.jpg' },
  OL_JIN_V1: { name: '정진규 OLD LEGACY V1', rarity: 'rare', imageUrl: '/images/cards/special/OL_JIN_V1.jpg' },
  OL_JIN_V2: { name: '정진규 OLD LEGACY V2', rarity: 'rare', imageUrl: '/images/cards/special/OL_JIN_V2.jpg' },
  OL_MIN_V1: { name: '정민석 OLD LEGACY V1', rarity: 'rare', imageUrl: '/images/cards/special/OL_MIN_V1.jpg' },
  OL_MIN_V2: { name: '정민석 OLD LEGACY V2', rarity: 'rare', imageUrl: '/images/cards/special/OL_MIN_V2.jpg' },
  PF_HAN: { name: '강한울 프로필', rarity: 'rare', imageUrl: '/images/cards/special/PF_HAN.jpg' },
  PF_JAE: { name: '정재원 프로필', rarity: 'rare', imageUrl: '/images/cards/special/PF_JAE.jpg' },
  PF_JIN: { name: '정진규 프로필', rarity: 'rare', imageUrl: '/images/cards/special/PF_JIN.jpg' },
  PF_LEE: { name: '이승찬 프로필', rarity: 'rare', imageUrl: '/images/cards/special/PF_LEE.jpg' },
  PF_MIN: { name: '정민석 프로필', rarity: 'rare', imageUrl: '/images/cards/special/PF_MIN.jpg' },
  prestige_jaewon: { name: '정재원 (프레스티지)', rarity: 'prestige', imageUrl: '/images/cards/prestige/BG_JAE_PRE.jpg' },
  prestige_seungchan: { name: '이승찬 (프레스티지)', rarity: 'prestige', imageUrl: '/images/cards/prestige/BG_LEE_PRE.jpg' },
  prestige_hanul: { name: '강한울 (프레스티지)', rarity: 'prestige', imageUrl: '/images/cards/prestige/BG_HAN_PRE.jpg' },
  prestige_minseok: { name: '정민석 (프레스티지)', rarity: 'prestige', imageUrl: '/images/cards/prestige/BG_MIN_PRE.jpg' },
  prestige_jinkyu: { name: '정진규 (프레스티지)', rarity: 'prestige', imageUrl: '/images/cards/prestige/BG_JIN_PRE.jpg' },
  prestige_group_special: { name: '랑구 단체 프레스티지', rarity: 'legendary', imageUrl: '/images/cards/prestige/PGBG.jpg' },
  joker_card: { name: '조커 카드', rarity: 'material', imageUrl: '/images/cards/material/JOKER_CARD.jpg' },
  SP_JAE_FULLACCEL: { name: '풀악셀', rarity: 'rare', imageUrl: null },
  SP_HAN_ZEN: { name: '무념무상', rarity: 'rare', imageUrl: null },
  SP_JIN_UNPREDICT: { name: '예측불가', rarity: 'rare', imageUrl: null },
  SP_MIN_SMTM: { name: '쇼미더머니', rarity: 'rare', imageUrl: null },
  SP_LEE_WAVE: { name: '파도타기', rarity: 'rare', imageUrl: null },
  SP_JAE_OVERDRIVE: { name: '오버드라이브', rarity: 'epic', imageUrl: null },
  SP_HAN_WALL: { name: '철벽 수비', rarity: 'rare', imageUrl: null },
  SP_JIN_CHAOS: { name: '혼돈의 4차원', rarity: 'epic', imageUrl: null },
  SP_LEE_TSUNAMI: { name: '대해일', rarity: 'epic', imageUrl: null },
  SP_MIN_HYPE: { name: '분위기 메이커', rarity: 'rare', imageUrl: null },
}

/** 배틀정의 + 표시메타 = 택틱스 카드 1장(자족적). */
export interface TacticsCard extends CardDefSeed, CardDisplayMeta {}

/**
 * 택틱스 정본 로스터 — buildTacticsMetadata·덱 검증의 단일 출처.
 * 웹 뽑기(cards 테이블)와 무관하게 이 121종으로 자족한다(이미지 파일만 공유).
 */
export const TACTICS_ROSTER: TacticsCard[] = CARD_DEF_SEEDS.map((d) => {
  const m = DISPLAY_META[d.cardId] ?? { name: d.cardId, rarity: 'basic', imageUrl: null }
  return { ...d, name: m.name, rarity: m.rarity, imageUrl: m.imageUrl }
})
