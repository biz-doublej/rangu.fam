/**
 * 윷판. 자리 번호:
 *
 *   10 ─ 9 ─ 8 ─ 7 ─ 6 ─ 5
 *    │ 26            21 │
 *   11    27      22    4
 *   12       23         3        23 = 가운데(방)
 *   13    24      28    2
 *    │ 25            29 │
 *   15 ─16 ─17 ─18 ─19 ─20       20 = 참먹이(출발점이자 마지막 자리)
 *
 * 바깥 길은 1 → 2 → … → 19 → 20. 말은 20(참먹이)을 지나쳐야 난다 — 딱 20에 서면 아직 판 위다.
 * 지름길: 5(모)에 멈춘 말은 21 → 22 → 23 → 24 → 25 → 15 로,
 *         10(뒷모)에 멈춘 말은 26 → 27 → 23 → 28 → 29 → 20 으로,
 *         23(방)에 멈춘 말은 28 → 29 → 20 으로 간다.
 * 5·10·23 을 그냥 지나가는 말은 가던 길로 계속 간다.
 */

/** 아직 판에 올라오지 않은 말 */
export const WAITING = 0
/** 참먹이 */
export const HOME = 20
/** 난 말 */
export const DONE = 99
export const CENTER = 23

export interface PiecePosition {
  pos: number
  /** 마지막으로 지나온 자리 (빽도로 되돌아갈 곳). 모르면 undefined */
  from?: number
}

const DIAGONAL_NEXT: Record<number, number> = { 21: 22, 22: 23, 24: 25, 25: 15, 26: 27, 27: 23, 28: 29, 29: 20 }
const BACK: Record<number, number> = { 1: 20, 21: 5, 22: 21, 23: 22, 24: 23, 25: 24, 26: 10, 27: 26, 28: 23, 29: 28 }

function stepForward(pos: number, cameFrom: number | undefined, first: boolean): number {
  if (pos === WAITING) return 1
  if (pos === HOME) return DONE
  if (first && pos === 5) return 21
  if (first && pos === 10) return 26
  if (pos === CENTER) return !first && cameFrom === 22 ? 24 : 28
  return DIAGONAL_NEXT[pos] ?? pos + 1
}

/** steps 칸 앞으로 (1~5). 참먹이를 지나치면 DONE. */
export function moveForward(piece: PiecePosition, steps: number): PiecePosition {
  let pos = piece.pos
  let from = piece.from
  for (let i = 0; i < steps; i++) {
    const next = stepForward(pos, from, i === 0)
    from = pos
    pos = next
    if (pos === DONE) return { pos: DONE }
  }
  return { pos, from: from === WAITING ? undefined : from }
}

/** 빽도: 한 칸 뒤로. 판 위의 말만 움직일 수 있다. */
export function moveBack(piece: PiecePosition): PiecePosition {
  const { pos, from } = piece
  if (pos === WAITING || pos === DONE) return piece
  // 방금 온 길을 알면 그 길로 되돌아간다 (15·20·23 처럼 들어오는 길이 둘인 자리)
  if (from !== undefined && from !== WAITING) return { pos: from }
  return { pos: BACK[pos] ?? pos - 1 }
}

/** 화면용 좌표 (0~100) */
export const STATION_XY: Record<number, [number, number]> = (() => {
  const xy: Record<number, [number, number]> = {}
  const step = 16
  for (let i = 1; i <= 4; i++) xy[i] = [90, 90 - step * i]
  xy[5] = [90, 10]
  for (let i = 1; i <= 4; i++) xy[5 + i] = [90 - step * i, 10]
  xy[10] = [10, 10]
  for (let i = 1; i <= 4; i++) xy[10 + i] = [10, 10 + step * i]
  xy[15] = [10, 90]
  for (let i = 1; i <= 4; i++) xy[15 + i] = [10 + step * i, 90]
  xy[20] = [90, 90]
  const d = 80 / 6
  xy[21] = [90 - d, 10 + d]
  xy[22] = [90 - d * 2, 10 + d * 2]
  xy[23] = [50, 50]
  xy[24] = [90 - d * 4, 10 + d * 4]
  xy[25] = [90 - d * 5, 10 + d * 5]
  xy[26] = [10 + d, 10 + d]
  xy[27] = [10 + d * 2, 10 + d * 2]
  xy[28] = [10 + d * 4, 10 + d * 4]
  xy[29] = [10 + d * 5, 10 + d * 5]
  return xy
})()

export const BIG_STATIONS = [5, 10, 15, 20, 23]
