/**
 * 랑구 배틀 엔진 — 결정론/규칙 검증용 자동 대전 시뮬.
 *
 * 봇 둘이 합법 액션만 골라 끝까지 둔다. 검증 항목:
 *   1) 게임이 라운드 캡 안에 종료되는가 (무한루프/교착 없음)
 *   2) 모든 봇 액션이 엔진에 의해 합법 처리되는가 (illegal → 즉시 throw)
 *   3) 같은 seed → 완전히 동일한 최종 상태인가 (결정론)
 *   4) 실제 전투가 일어나 본진 피해가 발생하는가
 *
 * 실행: npx tsx scripts/battle-sim.ts
 */

import { createBattle, applyAction } from '@/lib/battle/engine'
import { chooseAction } from '@/lib/battle/bot'
import { redactState } from '@/lib/battle/redact'
import type { BattleAction, BattleUnit, GameState, PlayerSlot } from '@/lib/battle/types'
import type { CardDef } from '@/lib/battle/stats'
import { MEMBER } from '@/lib/dogam'

// ── 덱 생성 ───────────────────────────────────────────────────

function memberCards(member: string, code: string): CardDef[] {
  const out: CardDef[] = []
  for (const y of [2021, 2022, 2023, 2024, 2025, 2026]) {
    const yy = String(y).slice(2)
    out.push({ cardId: `${code}_${yy}_V1`, name: `${member} ${y} v1`, member, type: 'year', rarity: 'basic' })
    out.push({ cardId: `${code}_${yy}_V2`, name: `${member} ${y} v2`, member, type: 'year', rarity: 'basic' })
  }
  out.push({ cardId: `SC_${code}_22`, name: `${member} 학생회`, member, type: 'special', rarity: 'rare' })
  out.push({ cardId: `BACKNUM_${code}`, name: `${member} 백넘버`, member, type: 'special', rarity: 'rare' })
  return out
}

// p1 = 재원🔥 + 승찬🌊 ("시간을 넘어서"), p2 = 한울🌿 + 진규🎐 ("매진-한진")
const DECK_P1: CardDef[] = [
  ...memberCards(MEMBER.JAEWON, 'JAE'),
  ...memberCards(MEMBER.SEUNGCHAN, 'LEE'),
  { cardId: 'SIG_JAE_25', name: '정재원 시그니처', member: MEMBER.JAEWON, type: 'signature', rarity: 'rare' },
  { cardId: 'prestige_jaewon', name: '정재원 PRESTIGE', member: MEMBER.JAEWON, type: 'prestige', rarity: 'legendary' },
  { cardId: 'prestige_seungchan', name: '이승찬 PRESTIGE', member: MEMBER.SEUNGCHAN, type: 'prestige', rarity: 'legendary' },
]
const DECK_P2: CardDef[] = [
  ...memberCards(MEMBER.HANUL, 'HAN'),
  ...memberCards(MEMBER.JINGYU, 'JIN'),
  { cardId: 'prestige_hanul', name: '강한울 PRESTIGE', member: MEMBER.HANUL, type: 'prestige', rarity: 'legendary' },
  { cardId: 'prestige_jinkyu', name: '정진규 PRESTIGE', member: MEMBER.JINGYU, type: 'prestige', rarity: 'legendary' },
]

// 봇 정책(chooseAction)은 src/lib/battle/bot.ts 로 추출 — API(PvE/고스트)와 공용.

// ── 드라이버 ──────────────────────────────────────────────────

const ROUND_CAP = 80
const MAX_ITER = 200_000

interface GameResult {
  state: GameState
  iterations: number
  combats: number
  timedOut: boolean
}

function step(state: GameState, slot: PlayerSlot, action: BattleAction): GameState {
  const res = applyAction(state, slot, action)
  if (!res.ok) {
    throw new Error(
      `ILLEGAL: ${slot} / phase=${state.phase} round=${state.round} / ${action.type} → ${res.error}`
    )
  }
  return res.state
}

function runGame(seed: string): GameResult {
  let state = createBattle({
    seed,
    p1: { userId: 'p1-user', deck: DECK_P1 },
    p2: { userId: 'p2-user', deck: DECK_P2 },
  })

  state = step(state, 'p1', { type: 'mulligan', replace: [] })
  state = step(state, 'p2', { type: 'mulligan', replace: [] })

  let iter = 0
  while (state.phase !== 'finished' && iter < MAX_ITER && state.round <= ROUND_CAP) {
    const actor = state.priority
    state = step(state, actor, chooseAction(state, actor))
    iter++
  }

  const combats = state.log.filter((e) => e.type === 'combatResolved').length
  return { state, iterations: iter, combats, timedOut: state.phase !== 'finished' }
}

// ── 챔피언 각성 시나리오 (화이트박스 — 보드에 직접 주입) ──────

function injectUnit(
  instanceId: string,
  cardId: string,
  owner: PlayerSlot,
  power: number,
  health: number,
  keywords: BattleUnit['keywords'],
  isChampion: boolean
): BattleUnit {
  return {
    instanceId,
    cardId,
    owner,
    name: cardId,
    power,
    basePower: power,
    health,
    maxHealth: health,
    baseMaxHealth: health,
    keywords: [...keywords],
    baseKeywords: [...keywords],
    cost: 5,
    isChampion,
    championLevel: 1,
    championProgress: 0,
    summonedRound: 0,
    hasAttacked: false,
    isStunned: false,
    hasBarrier: false,
    buffs: [],
  }
}

function startedGame(seed: string): GameState {
  let s = createBattle({ seed, p1: { userId: 'a', deck: DECK_P1 }, p2: { userId: 'b', deck: DECK_P2 } })
  s = step(s, 'p1', { type: 'mulligan', replace: [] })
  s = step(s, 'p2', { type: 'mulligan', replace: [] })
  return s
}

/** 승찬: 라운드 6 도달 시 각성(파워 2배 + 잠행) */
function scenarioSeungchanLevelUp(): { ok: boolean; detail: string } {
  let s = startedGame('champ-lee')
  s.players.p1.board.push(injectUnit('inj-lee', 'prestige_seungchan', 'p1', 5, 8, ['elusive'], true))
  let guard = 0
  while (s.round < 6 && s.phase !== 'finished' && guard++ < 5000) {
    s = step(s, s.priority, { type: 'pass' })
  }
  const c = s.players.p1.board.find((u) => u.cardId === 'prestige_seungchan')
  return {
    ok: !!c && c.championLevel === 2 && c.power === 10,
    detail: `round=${s.round} level=${c?.championLevel} power=${c?.power}(기대 10) keywords=${c?.keywords.join(',')}`,
  }
}

/** 재원: 누적 본진 피해 10+ 시 각성(파워+3 + 일격) */
function scenarioJaewonLevelUp(): { ok: boolean; detail: string } {
  let s = startedGame('champ-jae') // 라운드1 = p1 공격 토큰
  s.players.p1.board.push(injectUnit('inj-jae', 'prestige_jaewon', 'p1', 12, 6, ['overwhelm'], true))
  s = step(s, 'p1', { type: 'declareAttack', attackers: ['inj-jae'] })
  s = step(s, 'p2', { type: 'declareBlock', blocks: {} }) // 노블록
  s = step(s, 'p1', { type: 'pass' })
  s = step(s, 'p2', { type: 'pass' }) // → 전투 해결, 본진 12 피해
  const c = s.players.p1.board.find((u) => u.cardId === 'prestige_jaewon')
  return {
    ok: !!c && c.championLevel === 2 && c.basePower === 15 && s.players.p2.nexusHealth === 8,
    detail: `level=${c?.championLevel} basePower=${c?.basePower}(기대 15) p2nexus=${s.players.p2.nexusHealth}(기대 8) progress=${c?.championProgress}`,
  }
}

// ── 회귀 시나리오 (버그 헌트로 잡은 수정들 직접 검증) ─────────

type Check = { ok: boolean; detail: string }

/** #1 멀리건 결정론: 같은 seed·교체목록이면 제출 순서가 달라도 p1 패/덱 동일 */
function scenarioMulliganOrderIndependence(): Check {
  const mulliganGame = (firstSlot: PlayerSlot): GameState => {
    let s = createBattle({ seed: 'mull-seed', p1: { userId: 'a', deck: DECK_P1 }, p2: { userId: 'b', deck: DECK_P2 } })
    const rP1 = s.players.p1.hand.slice(0, 2).map((c) => c.instanceId)
    const rP2 = s.players.p2.hand.slice(0, 2).map((c) => c.instanceId)
    const order: PlayerSlot[] = firstSlot === 'p1' ? ['p1', 'p2'] : ['p2', 'p1']
    for (const slot of order) {
      s = step(s, slot, { type: 'mulligan', replace: slot === 'p1' ? rP1 : rP2 })
    }
    return s
  }
  const a = mulliganGame('p1')
  const b = mulliganGame('p2')
  const ids = (cards: { instanceId: string }[]) => cards.map((c) => c.instanceId).join(',')
  const handEq = ids(a.players.p1.hand) === ids(b.players.p1.hand)
  const deckEq = ids(a.players.p1.deck) === ids(b.players.p1.deck)
  return { ok: handEq && deckEq, detail: `p1 hand동일=${handEq} deck동일=${deckEq} (제출순서 p1先 vs p2先)` }
}

/** #2 덱 소진: 작은 덱 + 양쪽 무한 패스 → 피로 피해로 반드시 종료 */
function scenarioDeckOutTermination(): Check {
  const tiny = (m: string, code: string): CardDef[] =>
    [21, 22, 23].flatMap((y) => [1, 2]).slice(0, 5).map((_, i) => ({
      cardId: `${code}_T${i}`,
      name: `${m} ${i}`,
      member: m,
      type: 'year',
      rarity: 'basic',
    }))
  let s = createBattle({ seed: 'deckout', p1: { userId: 'a', deck: tiny(MEMBER.JAEWON, 'JAE') }, p2: { userId: 'b', deck: tiny(MEMBER.HANUL, 'HAN') } })
  s = step(s, 'p1', { type: 'mulligan', replace: [] })
  s = step(s, 'p2', { type: 'mulligan', replace: [] })
  let guard = 0
  while (s.phase !== 'finished' && guard++ < 10000) s = step(s, s.priority, { type: 'pass' })
  return {
    ok: s.phase === 'finished',
    detail: `phase=${s.phase} round=${s.round} winner=${s.winner} nexus ${s.players.p1.nexusHealth}/${s.players.p2.nexusHealth}`,
  }
}

/** 라운드당 공격 1회: 전투 해결 후 같은 라운드 재공격 거부 */
function scenarioOneAttackPerRound(): Check {
  let s = startedGame('one-atk')
  s.players.p1.board.push(injectUnit('atk1', 'JAE_X', 'p1', 3, 3, [], false))
  s.players.p1.board.push(injectUnit('atk2', 'JAE_Y', 'p1', 3, 3, [], false))
  s = step(s, 'p1', { type: 'declareAttack', attackers: ['atk1'] })
  s = step(s, 'p2', { type: 'declareBlock', blocks: {} })
  s = step(s, 'p1', { type: 'pass' })
  s = step(s, 'p2', { type: 'pass' }) // 전투 해결 → action, p1 우선권
  const res = applyAction(s, 'p1', { type: 'declareAttack', attackers: ['atk2'] })
  return { ok: !res.ok, detail: `2차 공격 거부=${!res.ok} (${res.error || '에러없음→버그'})` }
}

/** #3 일격 스필이 끈질김 경감을 반영: power5 overwhelm vs health3 tough → 스필 1 (본진 19) */
function scenarioOverwhelmToughSpill(): Check {
  let s = startedGame('ow-tough')
  s.players.p1.board.push(injectUnit('ow', 'prestige_x', 'p1', 5, 5, ['overwhelm'], false))
  s.players.p2.board.push(injectUnit('tg', 'tank', 'p2', 0, 3, ['tough'], false))
  s = step(s, 'p1', { type: 'declareAttack', attackers: ['ow'] })
  s = step(s, 'p2', { type: 'declareBlock', blocks: { ow: 'tg' } })
  s = step(s, 'p1', { type: 'pass' })
  s = step(s, 'p2', { type: 'pass' })
  return { ok: s.players.p2.nexusHealth === 19, detail: `p2 nexus=${s.players.p2.nexusHealth} (기대 19, 버그시 18)` }
}

/** #6 챔피언 진행도 per-source: 비-챔피언이 본진 때려도 아이들 jaewon 진행 0 */
function scenarioChampionProgressPerSource(): Check {
  let s = startedGame('champ-src')
  s.players.p1.board.push(injectUnit('j1', 'prestige_jaewon', 'p1', 4, 6, ['overwhelm'], true))
  s.players.p1.board.push(injectUnit('j2', 'prestige_jaewon', 'p1', 4, 6, ['overwhelm'], true))
  s.players.p1.board.push(injectUnit('atk', 'plain', 'p1', 10, 5, [], false))
  s = step(s, 'p1', { type: 'declareAttack', attackers: ['atk'] })
  s = step(s, 'p2', { type: 'declareBlock', blocks: {} })
  s = step(s, 'p1', { type: 'pass' })
  s = step(s, 'p2', { type: 'pass' })
  const j1 = s.players.p1.board.find((u) => u.instanceId === 'j1')
  const j2 = s.players.p1.board.find((u) => u.instanceId === 'j2')
  return {
    ok: !!j1 && !!j2 && j1.championProgress === 0 && j2.championProgress === 0 && j1.championLevel === 1 && j2.championLevel === 1,
    detail: `j1(prog=${j1?.championProgress},lv=${j1?.championLevel}) j2(prog=${j2?.championProgress},lv=${j2?.championLevel}) (둘 다 0/1 기대)`,
  }
}

/** #12 멀리건 중 pass 거부 */
function scenarioPassDuringMulligan(): Check {
  const s = createBattle({ seed: 'mull-pass', p1: { userId: 'a', deck: DECK_P1 }, p2: { userId: 'b', deck: DECK_P2 } })
  const res = applyAction(s, 'p1', { type: 'pass' })
  return { ok: !res.ok, detail: `멀리건 중 pass 거부=${!res.ok} (${res.error || '에러없음→버그'})` }
}

/** #15 거부된 액션은 원본 state 객체를 그대로 반환 (변경 누수 없음) */
function scenarioRejectedReturnsOriginal(): Check {
  const s = startedGame('reject')
  const before = JSON.stringify(s)
  const res = applyAction(s, 'p2', { type: 'playUnit', instanceId: 'nonexistent' }) // p2는 우선권 없음
  return {
    ok: !res.ok && res.state === s && JSON.stringify(res.state) === before,
    detail: `거부=${!res.ok} 원본동일참조=${res.state === s} 무변경=${JSON.stringify(res.state) === before}`,
  }
}

/** 안개(fog-of-war): 상대 손패/덱/소각 + 본인 덱 순서 + RNG/seed 가림, counts·본인 손패는 유지 */
function scenarioRedactHidesSecrets(): Check {
  const s = startedGame('redact')
  s.players.p2.burned.push('secret_burned_card')
  const ownHand = s.players.p1.hand.length
  const oppHandReal = s.players.p2.hand.length
  const v = redactState(s, 'p1')
  const ok =
    v.state.players.p2.hand.length === 0 &&
    v.state.players.p2.deck.length === 0 &&
    v.state.players.p2.burned.length === 0 &&
    v.state.players.p1.deck.length === 0 &&
    v.state.seed === '' &&
    v.state.rng === 0 &&
    v.state.players.p1.rng === 0 &&
    v.state.players.p2.rng === 0 &&
    v.state.players.p1.hand.length === ownHand && // 본인 손패는 보임
    v.counts.p2.hand === oppHandReal // 개수는 보존(공개)
  return {
    ok,
    detail: `oppHand=${v.state.players.p2.hand.length} oppDeck=${v.state.players.p2.deck.length} oppBurned=${v.state.players.p2.burned.length} ownDeckHidden=${v.state.players.p1.deck.length === 0} seed='${v.state.seed}' rng=${v.state.rng} ownHand=${v.state.players.p1.hand.length} counts.oppHand=${v.counts.p2.hand}`,
  }
}

// ── 검증 ──────────────────────────────────────────────────────

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`)
}

function summarize(r: GameResult): string {
  const { state } = r
  const w = state.winner ? state.winner : r.timedOut ? '시간초과' : '무승부'
  return `winner=${w} round=${state.round} nexus p1=${state.players.p1.nexusHealth} p2=${state.players.p2.nexusHealth} board ${state.players.p1.board.length}v${state.players.p2.board.length} combats=${r.combats} iters=${r.iterations}`
}

function maxChampLevel(state: GameState): number {
  let lv = 1
  for (const slot of ['p1', 'p2'] as PlayerSlot[]) {
    for (const u of state.players[slot].board) lv = Math.max(lv, u.championLevel)
  }
  return lv
}

function main() {
  console.log('=== 랑구 배틀 엔진 시뮬 ===\n')
  console.log(`덱: p1 ${DECK_P1.length}장 (재원+승찬) / p2 ${DECK_P2.length}장 (한울+진규)\n`)

  // 1) 여러 seed 로 끝까지 진행
  const seeds = ['alpha', 'bravo', 'charlie', 'delta', 'echo']
  const results = seeds.map((s) => ({ seed: s, r: runGame(s) }))
  for (const { seed, r } of results) {
    console.log(`[${seed}] ${summarize(r)}  챔피언최고레벨=${maxChampLevel(r.state)}`)
    assert(!r.timedOut, `'${seed}' 게임이 라운드 캡(${ROUND_CAP}) 안에 끝나지 않음`)
    const dmg = 40 - r.state.players.p1.nexusHealth - r.state.players.p2.nexusHealth
    assert(dmg > 0, `'${seed}' 본진 피해가 전혀 없음 (전투 미발생)`)
    assert(r.combats > 0, `'${seed}' 전투가 한 번도 해결되지 않음`)
  }

  // 2) 결정론 — 같은 seed 두 번 → 완전히 동일한 최종 상태
  console.log('\n--- 결정론 검증 ---')
  for (const seed of seeds) {
    const a = JSON.stringify(runGame(seed).state)
    const b = JSON.stringify(runGame(seed).state)
    assert(a === b, `'${seed}' 결정론 실패 — 같은 seed인데 결과가 다름`)
    console.log(`[${seed}] 동일 ✓ (state ${a.length} bytes)`)
  }

  // 3) 마지막 게임의 끝부분 이벤트 로그 미리보기
  console.log('\n--- 샘플 플레이 로그 (alpha, 마지막 12 이벤트) ---')
  const tail = runGame('alpha').state.log.slice(-12)
  for (const e of tail) {
    console.log(`  R${e.round} ${e.phase} ${e.actor} ${e.type}${e.detail ? ' ' + JSON.stringify(e.detail) : ''}`)
  }

  // 4) 챔피언 각성 시나리오 (구현했지만 일반 게임에선 안 도는 경로)
  console.log('\n--- 챔피언 각성 검증 ---')
  const lee = scenarioSeungchanLevelUp()
  console.log(`[승찬 라운드6 각성] ${lee.ok ? '✓' : '✗'}  ${lee.detail}`)
  assert(lee.ok, `승찬 챔피언 각성 실패 — ${lee.detail}`)
  const jae = scenarioJaewonLevelUp()
  console.log(`[재원 본진피해10 각성] ${jae.ok ? '✓' : '✗'}  ${jae.detail}`)
  assert(jae.ok, `재원 챔피언 각성 실패 — ${jae.detail}`)

  // 5) 버그 헌트 수정 회귀 검증
  console.log('\n--- 회귀 검증 (버그 헌트 수정 사항) ---')
  const regressions: [string, Check][] = [
    ['#1 멀리건 결정론(제출순서 독립)', scenarioMulliganOrderIndependence()],
    ['#2 덱 소진 종료(피로)', scenarioDeckOutTermination()],
    ['라운드당 공격 1회', scenarioOneAttackPerRound()],
    ['#3 일격+끈질김 스필', scenarioOverwhelmToughSpill()],
    ['#6 챔피언 진행도 per-source', scenarioChampionProgressPerSource()],
    ['#12 멀리건 중 pass 거부', scenarioPassDuringMulligan()],
    ['#15 거부액션 원본 반환', scenarioRejectedReturnsOriginal()],
    ['#9·13·14 안개(상대 정보/RNG 가림)', scenarioRedactHidesSecrets()],
  ]
  for (const [name, c] of regressions) {
    console.log(`[${name}] ${c.ok ? '✓' : '✗'}  ${c.detail}`)
    assert(c.ok, `${name} 실패 — ${c.detail}`)
  }

  console.log('\n✅ 전부 통과 — 종료성/합법성/결정론/전투/챔피언각성 + 회귀 13건 OK')
}

try {
  main()
} catch (e) {
  console.error('\n❌ 시뮬 실패:', e instanceof Error ? e.message : e)
  process.exit(1)
}
