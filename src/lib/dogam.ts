/**
 * 카드 도감(컬렉션) 정의 + 해금 판정 엔진.
 *
 * 카드 "시리즈"는 DB에 별도 필드가 없고 cardId 접두어에만 인코딩돼 있다
 * (예: SC_HAN_19 = 학생회, BACKNUM_JAE = 백넘버, NG_/OL_/PF_/RANGGU_…).
 * 그래서 각 도감을 "카탈로그 카드에 대한 술어(predicate)" 로 선언하고,
 * 보유 카드 ∩ 구성 카드 == 구성 카드 이면 해금으로 본다. 스키마 변경 없음.
 *
 * 신규 카드도 기존 cardId 접두어 컨벤션만 지키면 해당 도감에 자동 편입된다.
 */

export interface DogamCardInput {
  cardId: string
  name?: string | null
  type?: string | null
  rarity?: string | null
  description?: string | null
  imageUrl?: string | null
  member?: string | null
  year?: number | null
  period?: string | null
  isGroupCard?: boolean | null
}

export type DogamTier = 'basic' | 'series' | 'special'

export interface DogamDef {
  id: string
  tier: DogamTier
  title: string
  /** "모든 … 획득 시 해금" 안내 문구 */
  requirement: string
  /** 타일 강조색 (CSS) */
  accent: string
  emoji: string
  /** 이 카드가 도감 구성 카드인지 판별 */
  match: (card: DogamCardInput) => boolean
}

/** 멤버 한글명 — cards.member 컬럼 값과 일치 */
export const MEMBER = {
  HANUL: '강한울',
  JAEWON: '정재원',
  MINSEOK: '정민석',
  SEUNGCHAN: '이승찬',
  JINGYU: '정진규',
} as const

/** 멤버 한글명 → cardId 멤버 코드 (member 필드 누락 시 보조 추론용) */
const MEMBER_CODE: Record<string, string> = {
  [MEMBER.HANUL]: 'HAN',
  [MEMBER.JAEWON]: 'JAE',
  [MEMBER.MINSEOK]: 'MIN',
  [MEMBER.SEUNGCHAN]: 'LEE',
  [MEMBER.JINGYU]: 'JIN',
}

const typeOf = (c: DogamCardInput) => (c.type || '').toLowerCase()
const idOf = (c: DogamCardInput) => (c.cardId || '').toUpperCase()

/** year 필드 우선, 없으면 cardId 의 4자리 연도로 보조 추론 */
const yearOf = (c: DogamCardInput): number | null => {
  if (typeof c.year === 'number') return c.year
  const m = (c.cardId || '').match(/(?:19|20)\d{2}/)
  return m ? Number(m[0]) : null
}

/** cardId 접두어로 시리즈 판별 (대소문자 무시) */
const hasPrefix = (c: DogamCardInput, ...prefixes: string[]) => {
  const id = idOf(c)
  return prefixes.some((p) => id.startsWith(p.toUpperCase()))
}

/** 멤버 매칭 — member 필드 우선, 없으면 cardId 의 멤버 코드로 보조 추론 */
const isMember = (c: DogamCardInput, ...names: string[]) => {
  if (c.member && names.includes(c.member)) return true
  const id = idOf(c)
  return names.some((n) => {
    const code = MEMBER_CODE[n]
    return code ? new RegExp(`(^|_)${code}(_|$)`).test(id) : false
  })
}

/** 멤버 본인 카드 (프레스티지·재료 제외 — 기본 도감 구성 기준) */
const isOwnCard = (c: DogamCardInput) =>
  typeOf(c) !== 'prestige' && typeOf(c) !== 'material'

const basic = (
  id: string,
  title: string,
  name: string,
  accent: string,
  emoji: string
): DogamDef => ({
  id: `basic-${id}`,
  tier: 'basic',
  title,
  requirement: `모든 ${name} 카드 획득 시 해금`,
  accent,
  emoji,
  match: (c) => isOwnCard(c) && isMember(c, name),
})

export const DOGAM_DEFS: DogamDef[] = [
  // ── 기본 도감 (멤버별 전체) ──────────────────────────────────
  basic('hanul', 'HANUL', MEMBER.HANUL, '#3E5C4A', '🌿'),
  basic('jaewon', 'JAEWON', MEMBER.JAEWON, '#E0654E', '🔥'),
  basic('minseok', 'MINSEOK', MEMBER.MINSEOK, '#C28A2D', '⭐'),
  basic('seungchan', 'SEUNGCHAN', MEMBER.SEUNGCHAN, '#4A6FA5', '🌊'),
  basic('jingyu', 'JINGYU', MEMBER.JINGYU, '#8A5CA0', '🎐'),

  // ── 카드 시리즈 도감 ─────────────────────────────────────────
  {
    id: 'series-studentcouncil',
    tier: 'series',
    title: '우리는 모두 학생회였다',
    requirement: '모든 학생회 시리즈 카드 획득 시 해금',
    accent: '#3E5C4A',
    emoji: '🎓',
    match: (c) => hasPrefix(c, 'SC_'),
  },
  {
    id: 'series-backnumber',
    tier: 'series',
    title: '잠시만, 내 번호가 뭐라고?',
    requirement: '모든 백넘버 카드 획득 시 해금',
    accent: '#C28A2D',
    emoji: '🔢',
    match: (c) => hasPrefix(c, 'BACKNUM_'),
  },
  {
    id: 'series-rangu',
    tier: 'series',
    title: 'We are RANGU',
    requirement: '모든 랑구 시리즈 + 프로필 시리즈 카드 획득 시 해금',
    accent: '#E0654E',
    emoji: '💌',
    match: (c) => hasPrefix(c, 'RANGGU_', 'PF_'),
  },
  {
    id: 'series-baseball',
    tier: 'series',
    title: '담장 넘어갑니다',
    requirement: '모든 야구 시리즈 카드 획득 시 해금',
    accent: '#4A6FA5',
    emoji: '⚾',
    match: (c) => hasPrefix(c, 'KIATIGERS_', 'LGTWINS_'),
  },
  {
    id: 'series-oldlegacy',
    tier: 'series',
    title: '과거의 영광',
    requirement: '모든 OLD LEGACY 카드 획득 시 해금',
    accent: '#8A6A3A',
    emoji: '📜',
    match: (c) => hasPrefix(c, 'OL_'),
  },
  {
    id: 'series-newgeneration',
    tier: 'series',
    title: '신시대가 찾아왔다',
    requirement: '모든 NEW GENERATION 카드 획득 시 해금',
    accent: '#8A5CA0',
    emoji: '✨',
    match: (c) => hasPrefix(c, 'NG_'),
  },
  {
    id: 'series-allseasons',
    tier: 'series',
    title: '모든 이야기는 기록된다',
    requirement: '모든 시즌(년도) 카드 획득 시 해금',
    accent: '#5C5046',
    emoji: '📚',
    match: (c) => typeOf(c) === 'year',
  },

  // ── 특별한 도감 (연도 × 멤버 조합) ────────────────────────────
  {
    id: 'special-taereung-2022',
    tier: 'special',
    title: '모든 태릉인과 함께',
    requirement: '2022년 강한울·정재원·정민석 시즌 카드 모두 획득 시 해금',
    accent: '#3E5C4A',
    emoji: '🏅',
    match: (c) =>
      typeOf(c) === 'year' &&
      yearOf(c) === 2022 &&
      isMember(c, MEMBER.HANUL, MEMBER.JAEWON, MEMBER.MINSEOK),
  },
  {
    id: 'special-jeongtrio-2022',
    tier: 'special',
    title: '정트리오 결성!',
    requirement: '2022년 정재원·정민석·정진규 시즌 카드 모두 획득 시 해금',
    accent: '#E0654E',
    emoji: '🎶',
    match: (c) =>
      typeOf(c) === 'year' &&
      yearOf(c) === 2022 &&
      isMember(c, MEMBER.JAEWON, MEMBER.MINSEOK, MEMBER.JINGYU),
  },
  {
    id: 'special-midnight-2023',
    tier: 'special',
    title: '미드나잇 트리오',
    requirement: '2023년 강한울·정민석·정진규 시즌 카드 모두 획득 시 해금',
    accent: '#8A5CA0',
    emoji: '🌙',
    match: (c) =>
      typeOf(c) === 'year' &&
      yearOf(c) === 2023 &&
      isMember(c, MEMBER.HANUL, MEMBER.MINSEOK, MEMBER.JINGYU),
  },
  {
    id: 'special-fifth-2025',
    tier: 'special',
    title: '랑구의 다섯번째',
    requirement: '2025년 이승찬 시즌 카드 모두 획득 시 해금',
    accent: '#4A6FA5',
    emoji: '🖐️',
    match: (c) =>
      typeOf(c) === 'year' && yearOf(c) === 2025 && isMember(c, MEMBER.SEUNGCHAN),
  },
  {
    id: 'special-maejin-hanjin-2025',
    tier: 'special',
    title: '매진-한진은 앞으로도 계속',
    requirement: '2025년 강한울·정진규 시즌 카드 모두 획득 시 해금',
    accent: '#C28A2D',
    emoji: '🤝',
    match: (c) =>
      typeOf(c) === 'year' &&
      yearOf(c) === 2025 &&
      isMember(c, MEMBER.HANUL, MEMBER.JINGYU),
  },
  {
    id: 'special-overtime-jae-lee',
    tier: 'special',
    title: '시간을 넘어서 다시 한번',
    requirement: '2021·2025년 정재원·이승찬 시즌 카드 모두 획득 시 해금',
    accent: '#D08A3A',
    emoji: '⏳',
    match: (c) => {
      const y = yearOf(c)
      return (
        typeOf(c) === 'year' &&
        (y === 2021 || y === 2025) &&
        isMember(c, MEMBER.JAEWON, MEMBER.SEUNGCHAN)
      )
    },
  },
  {
    id: 'special-sig-han-jae-2022',
    tier: 'special',
    title: '둘은 문제지만 뭉치면 최강',
    requirement: '강한울·정재원 2022 시그니처 카드 모두 획득 시 해금',
    accent: '#3E5C4A',
    emoji: '⚡',
    match: (c) =>
      hasPrefix(c, 'SIG_HAN_22', 'SIG_JAE_22') ||
      (typeOf(c) === 'signature' &&
        yearOf(c) === 2022 &&
        isMember(c, MEMBER.HANUL, MEMBER.JAEWON)),
  },
  {
    id: 'special-backstab-2025',
    tier: 'special',
    title: '등에 칼을 박아버리고',
    requirement: '2025년 이승찬·정민석·정진규 시즌 카드 모두 획득 시 해금',
    accent: '#8A5CA0',
    emoji: '🔪',
    match: (c) =>
      typeOf(c) === 'year' &&
      yearOf(c) === 2025 &&
      isMember(c, MEMBER.SEUNGCHAN, MEMBER.MINSEOK, MEMBER.JINGYU),
  },
  {
    id: 'special-showmethemoney-lee-min',
    tier: 'special',
    title: 'Hey SHOW ME THE MONEY',
    requirement: '2025·2026년 이승찬·정민석 시즌 카드 모두 획득 시 해금',
    accent: '#C28A2D',
    emoji: '💰',
    match: (c) => {
      const y = yearOf(c)
      return (
        typeOf(c) === 'year' &&
        (y === 2025 || y === 2026) &&
        isMember(c, MEMBER.SEUNGCHAN, MEMBER.MINSEOK)
      )
    },
  },
]

// ── 프레스티지 만렙 보상 ──────────────────────────────────────
// 멤버 기본 도감(그 멤버의 모든 카드)을 완성하면 그 멤버의 프레스티지 전설 카드를
// 인벤토리에 지급한다. cardId 는 조합(craft) 라우트가 쓰는 기존 prestige_* 카드와 동일
// — 도감 완성은 RNG 없는 "수집 완주" 경로, 조합은 RNG 경로. 같은 보상, 두 갈래.
export const PRESTIGE_REWARD_BY_DOGAM: Record<string, string> = {
  'basic-hanul': 'prestige_hanul',
  'basic-jaewon': 'prestige_jaewon',
  'basic-minseok': 'prestige_minseok',
  'basic-seungchan': 'prestige_seungchan',
  'basic-jingyu': 'prestige_jinkyu', // 멤버 슬러그는 jinkyu (jingyu 아님)
}

/** 5개 기본 도감 id */
export const BASIC_DOGAM_IDS = Object.keys(PRESTIGE_REWARD_BY_DOGAM)

/** 5인 기본 도감 전부 완성 시 지급하는 단체 프레스티지 카드 */
export const GROUP_PRESTIGE_CARD_ID = 'prestige_group_special'

/** 도감 해금 → achievements 에 기록할 업적 id */
export const dogamAchievementId = (dogamId: string) => `dogam:${dogamId}`

// ── 판정 결과 타입 ────────────────────────────────────────────
export interface DogamCardCell {
  cardId: string
  name: string
  imageUrl: string
  rarity: string
  type: string
  member: string | null
  year: number | null
  period: string | null
  owned: boolean
}

export interface DogamResult {
  id: string
  tier: DogamTier
  title: string
  requirement: string
  accent: string
  emoji: string
  total: number
  owned: number
  unlocked: boolean
  cards: DogamCardCell[]
}

/**
 * 카탈로그 전체 + 보유 cardId 집합 → 도감별 진행도/해금 여부 계산.
 * total === 0 (구성 카드가 아직 카탈로그에 없음) 인 도감은 해금되지 않는다.
 */
export function computeDogam(
  catalog: DogamCardInput[],
  ownedCardIds: Set<string>
): DogamResult[] {
  return DOGAM_DEFS.map((def) => {
    const matched = catalog.filter((c) => def.match(c))
    matched.sort((a, b) => {
      const ya = yearOf(a) ?? 0
      const yb = yearOf(b) ?? 0
      if (ya !== yb) return ya - yb
      return (a.cardId || '').localeCompare(b.cardId || '')
    })

    const cells: DogamCardCell[] = matched.map((c) => ({
      cardId: c.cardId,
      name: c.name || c.cardId,
      imageUrl: c.imageUrl || '',
      rarity: c.rarity || 'basic',
      type: c.type || '',
      member: c.member ?? null,
      year: yearOf(c),
      period: c.period ?? null,
      owned: ownedCardIds.has(c.cardId),
    }))

    const owned = cells.filter((c) => c.owned).length
    const total = cells.length

    return {
      id: def.id,
      tier: def.tier,
      title: def.title,
      requirement: def.requirement,
      accent: def.accent,
      emoji: def.emoji,
      total,
      owned,
      unlocked: total > 0 && owned === total,
      cards: cells,
    }
  })
}
