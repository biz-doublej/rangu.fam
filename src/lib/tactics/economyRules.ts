/**
 * 랑구 택틱스 경제 — 카탈로그/규칙 정본(코드). [경제 E1]
 *
 * 통화 보상·패스XP·퀘스트는 모두 서버 권위(match-result 에서 지급). 여기 값이 단일 진실.
 * match-result 가 게임서버로부터 받는 신호 = 승/패뿐이므로, 퀘스트도 "플레이/승리/연승"만
 * 추적 가능(데미지·주문수 등 상세 스탯 퀘스트는 게임서버 리포트 확장 필요 — 추후).
 */

export type Currency = 'coin' | 'gem'

// ── 매치 보상(서버권위, 매치당 1회) ──────────────────────────────
export const MATCH_REWARD = {
  winCoins: 30,
  lossCoins: 12,
  winXp: 100,
  lossXp: 40,
} as const

// ── 상점 카탈로그 ────────────────────────────────────────────────
export type StoreCategory = 'featured' | 'board' | 'guardian' | 'cardback'
export type StoreRarity = 'basic' | 'rare' | 'epic' | 'legendary'

export interface StoreItemDef {
  id: string
  name: string
  category: StoreCategory
  rarity: StoreRarity
  price: number
  currency: Currency
  image: string
  tag?: string
}

// 이미지 경로는 게임(rangu-tactics-heavy) 번들의 /public 기준. 누락 시 클라가 폴백 처리.
export const STORE_ITEMS: StoreItemDef[] = [
  { id: 'board-runes', name: '고대 룬 제단 보드', category: 'board', rarity: 'epic', price: 640, currency: 'coin', image: '/images/item-board-skin.png', tag: '신규' },
  { id: 'board-twilight', name: '황혼 결투장 보드', category: 'board', rarity: 'rare', price: 420, currency: 'coin', image: '/images/item-board-skin.png' },
  { id: 'guardian-spirit-cat', name: '수정 정령 고양이', category: 'guardian', rarity: 'legendary', price: 980, currency: 'gem', image: '/images/item-guardian.png', tag: '인기' },
  { id: 'guardian-owl', name: '부엉이 단짝이', category: 'guardian', rarity: 'rare', price: 1800, currency: 'coin', image: '/images/item-guardian.png' },
  { id: 'cardback-crest', name: '황금 문장 카드 뒷면', category: 'cardback', rarity: 'rare', price: 320, currency: 'coin', image: '/images/item-card-back.png' },
  { id: 'cardback-prestige', name: '프레스티지 카드 뒷면', category: 'cardback', rarity: 'legendary', price: 120, currency: 'gem', image: '/images/item-card-back.png' },
]

export function findStoreItem(id: string): StoreItemDef | undefined {
  return STORE_ITEMS.find((i) => i.id === id)
}

// ── 퀘스트 정의(일일/주간) ───────────────────────────────────────
export type QuestType = 'play' | 'win' | 'streak'
export type QuestPeriod = 'daily' | 'weekly'

export interface QuestDef {
  id: string
  title: string
  type: QuestType
  target: number
  period: QuestPeriod
  reward: { currency: Currency; amount: number }
}

export const QUEST_DEFS: QuestDef[] = [
  { id: 'daily-play-3', title: '오늘 3판 플레이', type: 'play', target: 3, period: 'daily', reward: { currency: 'coin', amount: 50 } },
  { id: 'daily-win-2', title: '오늘 2승 거두기', type: 'win', target: 2, period: 'daily', reward: { currency: 'coin', amount: 80 } },
  { id: 'weekly-play-15', title: '이번 주 15판 플레이', type: 'play', target: 15, period: 'weekly', reward: { currency: 'gem', amount: 20 } },
  { id: 'weekly-win-10', title: '이번 주 10승 거두기', type: 'win', target: 10, period: 'weekly', reward: { currency: 'gem', amount: 40 } },
  { id: 'weekly-streak-3', title: '3연승 달성', type: 'streak', target: 3, period: 'weekly', reward: { currency: 'gem', amount: 30 } },
]

export function findQuest(id: string): QuestDef | undefined {
  return QUEST_DEFS.find((q) => q.id === id)
}

// ── 배틀패스 티어(누적 XP) ───────────────────────────────────────
export type PassRewardKind = 'coin' | 'gem' | 'item'
export interface PassTierDef {
  level: number
  xpRequired: number // 이 레벨 도달에 필요한 누적 XP
  reward: { kind: PassRewardKind; amount?: number; itemId?: string }
}

export const PASS_SEASON = 's1'

export const PASS_TIERS: PassTierDef[] = [
  { level: 1, xpRequired: 100, reward: { kind: 'coin', amount: 100 } },
  { level: 2, xpRequired: 300, reward: { kind: 'coin', amount: 150 } },
  { level: 3, xpRequired: 600, reward: { kind: 'gem', amount: 20 } },
  { level: 4, xpRequired: 1000, reward: { kind: 'coin', amount: 250 } },
  { level: 5, xpRequired: 1500, reward: { kind: 'item', itemId: 'cardback-crest' } },
  { level: 6, xpRequired: 2100, reward: { kind: 'coin', amount: 300 } },
  { level: 7, xpRequired: 2800, reward: { kind: 'gem', amount: 40 } },
  { level: 8, xpRequired: 3600, reward: { kind: 'coin', amount: 400 } },
  { level: 9, xpRequired: 4500, reward: { kind: 'gem', amount: 60 } },
  { level: 10, xpRequired: 5500, reward: { kind: 'item', itemId: 'board-runes' } },
  { level: 11, xpRequired: 7000, reward: { kind: 'gem', amount: 80 } },
  { level: 12, xpRequired: 9000, reward: { kind: 'item', itemId: 'guardian-spirit-cat' } },
]

export const PASS_MAX_XP = PASS_TIERS[PASS_TIERS.length - 1].xpRequired

/** 누적 XP → 현재 패스 레벨(도달한 최고 티어; 0=아직 1티어 미달). */
export function passLevelForXp(xp: number): number {
  let level = 0
  for (const t of PASS_TIERS) {
    if (xp >= t.xpRequired) level = t.level
    else break
  }
  return level
}

export function findPassTier(level: number): PassTierDef | undefined {
  return PASS_TIERS.find((t) => t.level === level)
}

// ── 기간 키(KST 기준) ────────────────────────────────────────────
function toKst(now: Date): Date {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000) // UTC+9
}

/** 일일 키 = KST 날짜 YYYY-MM-DD. */
export function dailyKey(now: Date): string {
  return toKst(now).toISOString().slice(0, 10)
}

/** 주간 키 = KST 기준 ISO week YYYY-Www. */
export function weeklyKey(now: Date): string {
  const k = toKst(now)
  const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // 해당 주 목요일로
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const ftDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDayNum + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function periodKeyFor(period: QuestPeriod, now: Date): string {
  return period === 'daily' ? dailyKey(now) : weeklyKey(now)
}
