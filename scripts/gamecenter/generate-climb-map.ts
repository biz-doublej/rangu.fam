/**
 * 랑구 등반 맵 생성기 — src/games/climb/map.json 을 만든다.
 *
 *   npx tsx scripts/gamecenter/generate-climb-map.ts [시작 시드]
 *
 * 구역별 규칙(발판 너비·간격·얼음·바람·가짜 발판)대로 발판을 놓고,
 * 풀이기(src/games/climb/solver.ts)가 정상까지 가는 길을 찾은 시드만 채택한다.
 * 맵을 바꾸면 기존 기록의 재실행 결과가 달라지므로, 배포 뒤에는 version 을 올리고 시즌 단위로만 바꾼다.
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { WORLD_WIDTH, replayClimb, type ClimbMap, type ClimbPlatform, type PlatformType } from '../../src/games/climb/engine'
import { solveClimb } from '../../src/games/climb/solver'
import { mulberry32 } from '../../src/games/rng'

const ZONE_HEIGHT = 1200

interface ZoneRule {
  name: string
  wind: number
  width: [number, number]
  rise: [number, number]
  shift: [number, number]
  /** 얼음 발판 비율 */
  ice: number
  /** 가짜 발판을 곁들일 비율 */
  fake: number
}

const RULES: ZoneRule[] = [
  { name: '입구', wind: 0, width: [110, 150], rise: [70, 92], shift: [50, 120], ice: 0, fake: 0 },
  { name: '좁은 길', wind: 0, width: [62, 90], rise: [82, 108], shift: [60, 135], ice: 0, fake: 0 },
  { name: '얼음 계단', wind: 0, width: [95, 130], rise: [76, 100], shift: [55, 125], ice: 1, fake: 0 },
  { name: '바람골', wind: 10, width: [80, 110], rise: [80, 104], shift: [55, 130], ice: 0, fake: 0 },
  { name: '가짜 발판', wind: 0, width: [70, 98], rise: [82, 106], shift: [60, 130], ice: 0, fake: 0.45 },
  { name: '얼음 절벽', wind: 0, width: [66, 88], rise: [84, 108], shift: [55, 125], ice: 0.8, fake: 0 },
  { name: '맞바람', wind: -14, width: [64, 90], rise: [84, 106], shift: [55, 125], ice: 0, fake: 0.35 },
  { name: '정상 직전', wind: 8, width: [52, 72], rise: [86, 108], shift: [55, 120], ice: 0.3, fake: 0.4 },
]

function build(seed: number): ClimbMap {
  const rng = mulberry32(seed)
  const between = ([min, max]: [number, number]) => Math.round(min + rng() * (max - min))
  const platforms: ClimbPlatform[] = [{ x: 0, h: 0, w: WORLD_WIDTH, type: 'normal' }]
  const summitH = ZONE_HEIGHT * RULES.length

  let h = 0
  let center = WORLD_WIDTH / 2
  let dir = rng() < 0.5 ? -1 : 1
  while (true) {
    const zone = Math.min(RULES.length - 1, Math.floor(h / ZONE_HEIGHT))
    const rule = RULES[zone]
    const nextH = h + between(rule.rise)
    if (nextH > summitH - 60) break
    h = nextH
    const w = between(rule.width)
    let nextCenter = center + dir * between(rule.shift)
    // 벽에 가까우면 방향을 바꾼다
    if (nextCenter - w / 2 < 12 || nextCenter + w / 2 > WORLD_WIDTH - 12) {
      dir = -dir
      nextCenter = center + dir * between(rule.shift)
    }
    nextCenter = Math.max(w / 2 + 12, Math.min(WORLD_WIDTH - w / 2 - 12, nextCenter))
    center = nextCenter
    if (rng() < 0.3) dir = -dir
    const type: PlatformType = rng() < rule.ice ? 'ice' : 'normal'
    platforms.push({ x: Math.round(center - w / 2), h, w, type })

    if (rng() < rule.fake) {
      // 진짜 발판의 반대쪽에, 비슷한 높이로 가짜를 하나 둔다
      const fakeW = between(rule.width)
      const mirrored = WORLD_WIDTH - center
      const fakeCenter = Math.abs(mirrored - center) < w ? (center < WORLD_WIDTH / 2 ? center + w + 60 : center - w - 60) : mirrored
      const fx = Math.round(Math.max(12, Math.min(WORLD_WIDTH - fakeW - 12, fakeCenter - fakeW / 2)))
      platforms.push({ x: fx, h: h + between([-14, 18]), w: fakeW, type: 'fake' })
    }
  }
  platforms.push({ x: WORLD_WIDTH / 2 - 70, h: summitH, w: 140, type: 'normal', summit: true })

  return {
    version: 1,
    zones: RULES.map((rule, index) => ({ name: rule.name, fromH: index * ZONE_HEIGHT, wind: rule.wind })),
    platforms,
  }
}

const first = Number(process.argv[2] || 1)
for (let seed = first; seed < first + 400; seed++) {
  const map = build(seed)
  const solution = solveClimb(map)
  if (!solution) {
    console.log(`seed ${seed}: 완주 불가`)
    continue
  }
  const result = replayClimb(map, solution.inputs)
  console.log(`seed ${seed}: 완주 가능 — 발판 ${map.platforms.length}개, 풀이 점프 ${result.jumps}회, ${Math.round(result.frames / 60)}초`)
  const file = join(__dirname, '../../src/games/climb/map.json')
  writeFileSync(file, JSON.stringify({ ...map, generatedFromSeed: seed }, null, 1).replace(/\{\n\s+"x"[^}]+\}/g, (m) => m.replace(/\s*\n\s*/g, ' ')) + '\n')
  console.log(`저장: ${file}`)
  process.exit(0)
}
console.error('완주 가능한 맵을 찾지 못했습니다.')
process.exit(1)
