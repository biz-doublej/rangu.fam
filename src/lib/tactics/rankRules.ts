/**
 * 택틱스 랭크/래더 규칙 — 클라이언트·서버 공용(순수, DB 의존 없음). [랭크 C1]
 *
 * 서버 LP 갱신(/api/game/match-result, 서버 권위)과 클라 티어 표시가 이 파일만 import → 단일 진실.
 * 모든 수치는 상수 → 밸런스 튜닝은 여기서만.
 */

export interface RankTier {
  key: string
  name: string
  minLp: number
}

/** 6티어 — 상위로 갈수록 임계 간격 확대(상단 등반 난이도↑). minLp 오름차순. */
export const RANK_TIERS: readonly RankTier[] = [
  { key: 'bronze', name: '브론즈', minLp: 0 },
  { key: 'silver', name: '실버', minLp: 250 },
  { key: 'gold', name: '골드', minLp: 550 },
  { key: 'platinum', name: '플래티넘', minLp: 900 },
  { key: 'diamond', name: '다이아', minLp: 1300 },
  { key: 'master', name: '랑구 마스터', minLp: 1800 },
] as const

export const WIN_LP = 25 // 승리 기본 +LP
export const LOSS_LP = 15 // 패배 기본 -LP (소규모 커뮤니티 — 등반 친화)
export const STREAK_START = 3 // 3연승부터 보너스
export const STREAK_STEP = 5 // 연승 1당 +5
export const STREAK_BONUS_MAX = 15 // 연승 보너스 상한(= 최대 승리 +40)

export interface RankState {
  lp: number
  wins: number
  losses: number
  winStreak: number
}

/** lp → 현재 티어(통과한 최고 임계 티어). */
export function tierForLp(lp: number): RankTier {
  let tier = RANK_TIERS[0]
  for (const t of RANK_TIERS) if (lp >= t.minLp) tier = t
  return tier
}

/** 이번 승리 후 연승 수(newStreak)에 대한 보너스 LP. */
export function streakBonus(newStreak: number): number {
  if (newStreak < STREAK_START) return 0
  return Math.min((newStreak - STREAK_START + 1) * STREAK_STEP, STREAK_BONUS_MAX)
}

export interface RankResult extends RankState {
  lpDelta: number
  tier: RankTier
  promoted: boolean
  demoted: boolean
}

/**
 * 매치 결과 적용(순수·결정론). 승=+WIN_LP+연승보너스, 패=-LOSS_LP. LP 하한 0(음수 불가).
 * promoted/demoted 는 C3 연출(티어업/강등)용.
 */
export function applyMatchResult(prev: RankState, didWin: boolean): RankResult {
  const beforeTier = tierForLp(prev.lp)
  let next: RankState
  let lpDelta: number
  if (didWin) {
    const winStreak = prev.winStreak + 1
    lpDelta = WIN_LP + streakBonus(winStreak)
    next = { lp: prev.lp + lpDelta, wins: prev.wins + 1, losses: prev.losses, winStreak }
  } else {
    lpDelta = -Math.min(LOSS_LP, prev.lp) // 0 하한
    next = { lp: prev.lp + lpDelta, wins: prev.wins, losses: prev.losses + 1, winStreak: 0 }
  }
  const afterTier = tierForLp(next.lp)
  const beforeIdx = RANK_TIERS.indexOf(beforeTier)
  const afterIdx = RANK_TIERS.indexOf(afterTier)
  return { ...next, lpDelta, tier: afterTier, promoted: afterIdx > beforeIdx, demoted: afterIdx < beforeIdx }
}
