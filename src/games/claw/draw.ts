import { mulberry32 } from '../rng'
import { COMMON_PLUSHES, GOLD_PLUSH_KEY } from './plushes'

/**
 * 인형뽑기 결과 추첨. 서버가 /claw/play 때 한 번 돌리고, 화면은 이 결과대로 연출한다.
 * 시드와 연속 실패 횟수가 같으면 결과도 항상 같다.
 */

/** 확률 (보상 포인트 숫자는 src/lib/gamecenter/rewards.ts 에 있다) */
export const CLAW_ODDS = {
  /** 기본 성공 확률 */
  baseWin: 0.25,
  /** 연속으로 놓칠 때마다 더해지는 확률 */
  pityStep: 0.05,
  /** 보정을 받아도 넘지 않는 성공 확률 */
  maxWin: 0.6,
  /** 이번 판에 집게가 노리는 인형이 황금 랑구일 확률 */
  gold: 0.02,
  /** 실패했을 때: 아예 못 잡음 / 위에서 미끄러짐 / 옮기다 떨어짐 */
  missNoGrab: 0.4,
  missSlipTop: 0.35,
} as const

export interface ClawOutcome {
  /** 집게가 인형을 잡았는지. 잡았더라도 slipAt 이 있으면 놓친다. */
  grabbed: boolean
  /** 잡았다가 놓치는 곳: 다 올라와서('top') / 출구로 옮기다가('carry') */
  slipAt?: 'top' | 'carry'
  /** 이번 판에 걸린 인형 key */
  plush: string
}

/** 인형을 얻는 결과인지 (잡았고 놓치지 않음) */
export function isClawWin(outcome: ClawOutcome): boolean {
  return outcome.grabbed && !outcome.slipAt
}

/** 연속 실패 횟수에 따른 성공 확률 */
export function clawWinChance(misses: number): number {
  const streak = Math.max(0, Math.floor(misses) || 0)
  return Math.min(CLAW_ODDS.maxWin, CLAW_ODDS.baseWin + CLAW_ODDS.pityStep * streak)
}

export function drawClawOutcome(seed: number, misses: number): ClawOutcome {
  const rng = mulberry32(seed)
  const plushRoll = rng()
  const winRoll = rng()
  const missRoll = rng()

  const plush =
    plushRoll < CLAW_ODDS.gold
      ? GOLD_PLUSH_KEY
      : COMMON_PLUSHES[Math.min(COMMON_PLUSHES.length - 1, Math.floor(rng() * COMMON_PLUSHES.length))].key

  if (winRoll < clawWinChance(misses)) return { grabbed: true, plush }
  if (missRoll < CLAW_ODDS.missNoGrab) return { grabbed: false, plush }
  if (missRoll < CLAW_ODDS.missNoGrab + CLAW_ODDS.missSlipTop) return { grabbed: true, slipAt: 'top', plush }
  return { grabbed: true, slipAt: 'carry', plush }
}
