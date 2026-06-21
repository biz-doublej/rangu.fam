/**
 * 랑구 배틀 — 결정론 전투 엔진 (서버 권위, 풀 반응형 / LoR 스타일).
 *
 * 모든 상태 변화는 applyAction(state, slot, action) 한 곳을 통해서만 일어난다.
 * 상태는 순수 JSON(GameState) — 클라가 보낸 액션을 서버가 검증·적용하고
 * 새 상태를 돌려준다. RNG 는 seed 기반이며 **플레이어별 독립 스트림**(rng.ts)을 써서
 * 멀리건/셔플이 상대 행동이나 제출 순서에 영향받지 않는다.
 *
 * ── 라운드 흐름 ────────────────────────────────────────────────
 *  beginRound: 마나 적립/충전 → 드로우 → phase 'action', 우선권 = 공격토큰 보유자
 *  action:     우선권 핑퐁. 유닛/주문 플레이 또는 공격 선언(라운드당 1회). 양쪽 연속 패스 → 라운드 종료
 *  declareAttack(토큰 보유자) → declareBlock(수비자) → 전투 반응 윈도우 → 전투 해결
 *
 * ── 종료 보장 ──────────────────────────────────────────────────
 *  본진 ≤ 0(승패) · 덱 소진 시 누적 피로 피해 · MAX_ROUNDS 하드 캡(잔여 본진 비교).
 *
 * ── 미구현(설계상 Phase 2) ────────────────────────────────────
 *  주문 카드 카탈로그(현재 보유 카드는 전부 유닛) · 나머지 챔피언 각성 조건 ·
 *  버스트 주문 연쇄 스톨 정밀 가드(현재는 핸드 상한으로 자연히 bound).
 */

import {
  OTHER,
  type ActionResult,
  type BattleAction,
  type BattleCard,
  type BattleUnit,
  type GameState,
  type Keyword,
  type PlayerSlot,
  type PlayerState,
  type SpellEffect,
  type StackItem,
  type StatBuff,
  type TargetRef,
} from './types'
import { deriveBattleUnit, type CardDef } from './stats'
import { seedToInt, seededShuffle } from './rng'

const STARTING_NEXUS = 20
const OPENING_HAND = 4
const MAX_HAND = 10
const MAX_BOARD = 6
const MAX_MANA = 10
const MAX_SPELL_MANA = 3
const MAX_ROUNDS = 50 // 교착 방지 하드 캡 (도달 시 잔여 본진으로 판정)

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

function logEvent(s: GameState, actor: PlayerSlot | 'system', type: string, detail?: Record<string, unknown>) {
  s.log.push({ round: s.round, phase: s.phase, actor, type, detail })
}

// ── 셋업 ──────────────────────────────────────────────────────

/** 카드 정의 목록 → 해당 슬롯의 BattleCard 목록 (유닛 또는 주문) */
export function buildBattleCards(defs: CardDef[], owner: PlayerSlot): BattleCard[] {
  return defs.map((def, i) => {
    const base = { instanceId: `${owner}-${i}-${def.cardId}`, cardId: def.cardId, owner, name: def.name, member: def.member ?? null }
    if (def.spell) {
      return {
        ...base,
        cost: def.spell.cost,
        kind: 'spell',
        spell: { speed: def.spell.speed, effect: def.spell.effect, needsTarget: !!def.spell.needsTarget },
      }
    }
    const u = deriveBattleUnit(def)
    return {
      ...base,
      cost: u.cost,
      kind: 'unit',
      unit: { power: u.power, health: u.health, keywords: u.keywords, isChampion: u.isChampion },
    }
  })
}

function newPlayer(slot: PlayerSlot, userId: string | null, rng: number, deck: BattleCard[]): PlayerState {
  return {
    slot,
    userId,
    rng,
    nexusHealth: STARTING_NEXUS,
    mana: 0,
    maxMana: 0,
    spellMana: 0,
    deck,
    hand: [],
    board: [],
    graveyard: [],
    burned: [],
    fatigueCount: 0,
    hasAttackToken: slot === 'p1',
    hasPassed: false,
    mulliganDone: false,
  }
}

export interface CreateBattleArgs {
  seed: string
  p1: { userId: string | null; deck: CardDef[] }
  p2: { userId: string | null; deck: CardDef[] }
}

export function createBattle(args: CreateBattleArgs): GameState {
  // 플레이어별 독립 RNG 스트림 — 셔플/멀리건이 서로(그리고 제출 순서에) 영향받지 않도록.
  const p1Rng0 = seedToInt(`${args.seed}:p1`)
  const p2Rng0 = seedToInt(`${args.seed}:p2`)
  const [p1Rng, d1] = seededShuffle(p1Rng0, buildBattleCards(args.p1.deck, 'p1'))
  const [p2Rng, d2] = seededShuffle(p2Rng0, buildBattleCards(args.p2.deck, 'p2'))

  const s: GameState = {
    version: 1,
    seed: args.seed,
    rng: seedToInt(args.seed), // 공유 RNG (향후 상호작용용; 현재 미사용)
    round: 0,
    phase: 'mulligan',
    activePlayer: 'p1',
    priority: 'p1',
    attackDeclaredThisRound: false,
    passStreak: 0,
    players: {
      p1: newPlayer('p1', args.p1.userId, p1Rng, d1),
      p2: newPlayer('p2', args.p2.userId, p2Rng, d2),
    },
    stack: [],
    combat: null,
    winner: null,
    log: [],
  }

  drawN(s, 'p1', OPENING_HAND)
  drawN(s, 'p2', OPENING_HAND)
  logEvent(s, 'system', 'battleCreated', { seed: args.seed })
  return s
}

// ── 드로우 / 마나 ─────────────────────────────────────────────

/** n장 드로우. 덱 소진 시 누적 피로 피해, 핸드 상한 초과분은 소각. */
function drawN(s: GameState, slot: PlayerSlot, n: number) {
  const p = s.players[slot]
  for (let i = 0; i < n; i++) {
    const card = p.deck.shift()
    if (!card) {
      // 덱 소진 → 누적 피로 피해 (LoR 의 deck-out 패배에 대응)
      p.fatigueCount += 1
      dealNexusDamage(s, slot, p.fatigueCount)
      checkWin(s)
      if (s.phase === 'finished') return
      continue
    }
    if (p.hand.length >= MAX_HAND) {
      // 핸드 상한 초과분 소각 — 비공개 더미(burned)로. cardId 는 로그에 남기지 않음(상대 정보 누출 방지)
      p.burned.push(card.cardId)
      logEvent(s, slot, 'cardBurned')
      continue
    }
    p.hand.push(card)
  }
}

function beginRound(s: GameState, n: number) {
  if (n > MAX_ROUNDS) {
    // 교착 방지: 잔여 본진으로 판정 (동률 = 무승부)
    const h1 = s.players.p1.nexusHealth
    const h2 = s.players.p2.nexusHealth
    s.winner = h1 === h2 ? null : h1 > h2 ? 'p1' : 'p2'
    s.phase = 'finished'
    logEvent(s, 'system', 'roundCapReached', { round: n, winner: s.winner })
    return
  }

  s.round = n
  s.activePlayer = n % 2 === 1 ? 'p1' : 'p2'
  s.attackDeclaredThisRound = false

  for (const slot of ['p1', 'p2'] as PlayerSlot[]) {
    const p = s.players[slot]
    p.hasAttackToken = slot === s.activePlayer
    // 미사용 마나 → 스펠마나 적립 (≤3)
    const bankable = Math.max(0, Math.min(MAX_SPELL_MANA - p.spellMana, p.mana))
    p.spellMana = Math.min(MAX_SPELL_MANA, p.spellMana + bankable)
    p.maxMana = Math.min(MAX_MANA, n)
    p.mana = p.maxMana
    p.hasPassed = false
    for (const u of p.board) {
      u.hasAttacked = false
      u.isStunned = false
      if (u.keywords.includes('regeneration')) {
        u.health = u.maxHealth
      }
      // 버프 만료는 "본인 턴" 기준으로만 진행 → 상대 턴 수에 좌우되지 않음
      if (slot === s.activePlayer) tickBuffs(u)
    }
    drawN(s, slot, 1)
    if (s.phase === 'finished') return // 피로사(deck-out)로 라운드 시작 중 종료
  }

  s.phase = 'action'
  s.priority = s.activePlayer
  s.passStreak = 0
  s.combat = null
  if (n >= 6) levelUpRoundChampions(s)
  logEvent(s, 'system', 'roundStart', { round: n, active: s.activePlayer })
}

// ── 버프/스탯 재계산 ──────────────────────────────────────────

function recomputeStats(u: BattleUnit) {
  let power = u.basePower
  let healthBonus = 0
  const kw = new Set<Keyword>(u.baseKeywords)
  for (const b of u.buffs) {
    if (b.power) power += b.power
    if (b.health) healthBonus += b.health
    for (const k of b.keywordsAdded || []) kw.add(k)
  }
  u.power = Math.max(0, power)
  u.keywords = Array.from(kw)

  // 체력 버프: 최대 체력 = 기본 + 버프, 현재 받은 피해(delta)는 보존
  const newMax = Math.max(1, u.baseMaxHealth + healthBonus)
  if (newMax !== u.maxHealth) {
    const damage = u.maxHealth - u.health // 이미 받은 피해
    u.maxHealth = newMax
    u.health = Math.min(newMax, Math.max(0, newMax - damage))
  }
}

function tickBuffs(u: BattleUnit) {
  let changed = false
  u.buffs = u.buffs.filter((b) => {
    if (b.duration == null) return true
    b.duration -= 1
    if (b.duration <= 0) {
      changed = true
      return false
    }
    return true
  })
  if (changed) recomputeStats(u)
}

function addBuff(u: BattleUnit, buff: StatBuff) {
  u.buffs.push(buff)
  recomputeStats(u)
}

// ── 조회 헬퍼 ─────────────────────────────────────────────────

function findUnit(s: GameState, slot: PlayerSlot, instanceId: string): BattleUnit | undefined {
  return s.players[slot].board.find((u) => u.instanceId === instanceId)
}
function findAnyUnit(s: GameState, instanceId: string): BattleUnit | undefined {
  return findUnit(s, 'p1', instanceId) || findUnit(s, 'p2', instanceId)
}

// ── 데미지 / 회복 ─────────────────────────────────────────────

/** 유닛 피해. 끈질김/보호막 적용. 반환 = 실제 적용된 피해(스필 계산용). */
function dealDamageToUnit(s: GameState, target: BattleUnit, amount: number, source?: BattleUnit): number {
  let amt = amount
  if (target.keywords.includes('tough')) amt = Math.max(0, amt - 1)
  if (target.hasBarrier && amt > 0) {
    target.hasBarrier = false
    amt = 0
  }
  const healthBefore = Math.max(0, target.health)
  target.health -= amt
  // 흡혈: 실제로 "흡수된" 피해만큼 회복 (오버킬분은 제외)
  if (amt > 0 && source?.keywords.includes('lifesteal')) {
    healNexus(s, source.owner, Math.min(amt, healthBefore))
  }
  return amt
}

function dealNexusDamage(s: GameState, slot: PlayerSlot, amount: number, source?: BattleUnit) {
  if (amount <= 0) return
  const before = Math.max(0, s.players[slot].nexusHealth)
  const dealt = Math.min(amount, before) // 오버킬 제외한 "실제로 들어간" 피해
  s.players[slot].nexusHealth -= amount
  if (source?.keywords.includes('lifesteal')) healNexus(s, source.owner, dealt)
  // 챔피언 진행도는 "그 피해를 가한 유닛 본인"에게만 누적 (보드 전체 X, 오버킬 제외)
  if (source && source.cardId === 'prestige_jaewon' && source.championLevel === 1) {
    source.championProgress += dealt
    if (source.championProgress >= 10) levelUp(source, 3, ['overwhelm'])
  }
}

function healNexus(s: GameState, slot: PlayerSlot, amount: number) {
  if (amount > 0) s.players[slot].nexusHealth += amount
}

function cleanupDead(s: GameState) {
  for (const slot of ['p1', 'p2'] as PlayerSlot[]) {
    const p = s.players[slot]
    const alive: BattleUnit[] = []
    for (const u of p.board) {
      if (u.health <= 0) p.graveyard.push(u.cardId)
      else alive.push(u)
    }
    p.board = alive
  }
}

function checkWin(s: GameState) {
  const d1 = s.players.p1.nexusHealth <= 0
  const d2 = s.players.p2.nexusHealth <= 0
  if (!d1 && !d2) return
  s.phase = 'finished'
  s.winner = d1 && d2 ? null : d1 ? 'p2' : 'p1' // 동시 = 무승부(null)
  logEvent(s, 'system', 'gameOver', { winner: s.winner })
}

// ── 챔피언 각성 ───────────────────────────────────────────────

function levelUp(u: BattleUnit, gainPower: number, gainKeywords: Keyword[]) {
  if (u.championLevel !== 1) return
  u.championLevel = 2
  u.basePower += gainPower
  for (const k of gainKeywords) if (!u.baseKeywords.includes(k)) u.baseKeywords.push(k)
  // 체력도 살짝 보강
  u.baseMaxHealth += 2
  u.health += 2
  recomputeStats(u)
}

/** 라운드 6 이상 → prestige_seungchan 각성 (파워 2배 + 잠행) */
function levelUpRoundChampions(s: GameState) {
  for (const slot of ['p1', 'p2'] as PlayerSlot[]) {
    for (const u of s.players[slot].board) {
      if (u.cardId === 'prestige_seungchan' && u.championLevel === 1) {
        levelUp(u, u.basePower, ['elusive']) // 파워 2배 + 잠행
      }
      // TODO(Phase2): prestige_hanul(블록 6회) / minseok(본진 8회복) / jinkyu(주문 4회)
    }
  }
}

// ── 스택(주문) 해결 ───────────────────────────────────────────

function resolveStack(s: GameState) {
  while (s.stack.length > 0) {
    const item = s.stack.pop() as StackItem
    resolveSpellEffect(s, item)
    if (s.phase === 'finished') break
  }
  cleanupDead(s)
  checkWin(s)
}

function resolveSpellEffect(s: GameState, item: StackItem) {
  const eff: SpellEffect = item.effect
  const src = item.source
  const amount = eff.amount ?? 0
  const firstTarget = item.targets[0]

  switch (eff.kind) {
    case 'buffUnit': {
      const u = targetUnit(s, firstTarget)
      if (u) addBuff(u, makeBuff(eff, item.card.cardId))
      break
    }
    case 'buffTeam': {
      for (const u of s.players[src].board) addBuff(u, makeBuff(eff, item.card.cardId))
      break
    }
    case 'grantKeyword': {
      const u = targetUnit(s, firstTarget)
      if (u && eff.keyword)
        addBuff(u, { keywordsAdded: [eff.keyword], duration: eff.duration ?? null, source: item.card.cardId })
      break
    }
    case 'damageUnit': {
      const u = targetUnit(s, firstTarget)
      if (u) dealDamageToUnit(s, u, amount)
      break
    }
    case 'damageNexus':
      dealNexusDamage(s, OTHER[src], amount)
      break
    case 'healNexus':
      healNexus(s, src, amount)
      break
    case 'stun': {
      const u = targetUnit(s, firstTarget)
      if (u) u.isStunned = true
      break
    }
    case 'draw':
      drawN(s, src, Math.max(1, amount))
      break
  }
  cleanupDead(s)
  checkWin(s)
  logEvent(s, src, 'spellResolved', { card: item.card.cardId, kind: eff.kind })
}

function makeBuff(eff: SpellEffect, source: string): StatBuff {
  return {
    power: eff.amount,
    health: eff.health,
    keywordsAdded: eff.keyword ? [eff.keyword] : [],
    duration: eff.duration ?? null,
    source,
  }
}

function targetUnit(s: GameState, ref?: TargetRef): BattleUnit | undefined {
  if (!ref || ref.type !== 'unit') return undefined
  return findAnyUnit(s, ref.instanceId)
}

// ── 전투 해결 ─────────────────────────────────────────────────

function resolveCombat(s: GameState) {
  if (!s.combat) return
  const atk = s.activePlayer
  const def = OTHER[atk]
  const { attackers, blocks } = s.combat

  for (const aId of attackers) {
    const a = findUnit(s, atk, aId)
    if (!a || a.health <= 0) continue

    const bId = blocks[aId]
    if (!bId) {
      dealNexusDamage(s, def, a.power, a) // 미차단 → 본진 직격
      if (s.phase === 'finished') return
      continue
    }

    const b = findUnit(s, def, bId)
    if (!b || b.health <= 0) {
      // 블로커가 전투 전에 제거됨 → 막은 것으로 처리. 일격은 전부 관통.
      if (a.keywords.includes('overwhelm')) {
        dealNexusDamage(s, def, a.power, a)
        if (s.phase === 'finished') return
      }
      continue
    }
    if (b.isStunned || canBlock(a, b) !== null) {
      // 블로커가 무력화/부적격(기절·잠행/위압 회피) → 막기 실패 → 미차단 취급
      dealNexusDamage(s, def, a.power, a)
      if (s.phase === 'finished') return
      continue
    }

    const bHealthBefore = b.health
    const aFirst = a.keywords.includes('quickAttack') && !b.keywords.includes('quickAttack')
    let dealtToBlocker: number
    if (aFirst) {
      // 속공: 먼저 타격, 상대가 죽으면 반격 없음
      dealtToBlocker = dealDamageToUnit(s, b, a.power, a)
      if (b.health > 0) dealDamageToUnit(s, a, b.power, b)
    } else {
      const bPow = b.power // 동시 타격 — b 의 파워를 먼저 고정
      dealtToBlocker = dealDamageToUnit(s, b, a.power, a)
      dealDamageToUnit(s, a, bPow, b)
    }
    // 일격: 막은 유닛에게 "실제로 들어간" 피해 중 초과분만 본진 관통
    if (a.keywords.includes('overwhelm') && b.health <= 0) {
      const spill = dealtToBlocker - bHealthBefore
      if (spill > 0) dealNexusDamage(s, def, spill, a)
      if (s.phase === 'finished') return
    }
  }

  cleanupDead(s)
  checkWin(s)
  s.combat = null
  if (s.phase !== 'finished') {
    s.phase = 'action'
    s.priority = s.activePlayer
    s.passStreak = 0
  }
  logEvent(s, 'system', 'combatResolved')
}

// ── 블록 적법성 ───────────────────────────────────────────────

function canBlock(attacker: BattleUnit, blocker: BattleUnit): string | null {
  if (blocker.isStunned) return '기절한 유닛은 블록할 수 없습니다.'
  if (attacker.keywords.includes('elusive') && !blocker.keywords.includes('elusive'))
    return '잠행 유닛은 잠행 유닛으로만 막을 수 있습니다.'
  if (attacker.keywords.includes('fearsome') && blocker.power < 3)
    return '위압 유닛은 파워 3 이상으로만 막을 수 있습니다.'
  return null
}

// ── 메인 리듀서 ───────────────────────────────────────────────

export function applyAction(state: GameState, slot: PlayerSlot, action: BattleAction): ActionResult {
  if (state.phase === 'finished') return { ok: false, state, error: '이미 종료된 전투입니다.' }
  const s = clone(state)

  // 외부(클라) 입력은 타입만 검증돼 들어올 수 있으므로, 옵셔널 페이로드 필드를 안전하게 정규화
  // (누락/오타 → TypeError 500 대신 엔진 가드를 타고 깔끔한 거부 400 으로)
  const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  const asRecord = (v: unknown): Record<string, string> =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {}

  let res: ActionResult
  switch (action.type) {
    case 'mulligan':
      res = doMulligan(s, slot, asArray<string>(action.replace))
      break
    case 'playUnit':
      res = doPlayUnit(s, slot, action.instanceId)
      break
    case 'playSpell':
      res = doPlaySpell(s, slot, action.instanceId, asArray(action.targets))
      break
    case 'declareAttack':
      res = doDeclareAttack(s, slot, asArray<string>(action.attackers), asRecord(action.challenges))
      break
    case 'declareBlock':
      res = doDeclareBlock(s, slot, asRecord(action.blocks))
      break
    case 'pass':
      res = doPass(s, slot)
      break
    default:
      return { ok: false, state, error: '알 수 없는 액션입니다.' }
  }

  // 거부된 액션은 원본 state 를 그대로 반환 (클론/부분변경 누수 방지)
  return res.ok ? res : { ok: false, state, error: res.error }
}

function err(state: GameState, message: string): ActionResult {
  return { ok: false, state, error: message }
}

function doMulligan(s: GameState, slot: PlayerSlot, replace: string[]): ActionResult {
  if (s.phase !== 'mulligan') return err(s, '멀리건 단계가 아닙니다.')
  const p = s.players[slot]
  if (p.mulliganDone) return err(s, '이미 멀리건을 마쳤습니다.')

  const toReplace = p.hand.filter((c) => replace.includes(c.instanceId))
  p.hand = p.hand.filter((c) => !replace.includes(c.instanceId))
  p.deck.push(...toReplace)
  // 플레이어 전용 RNG 로 셔플 → 상대 행동/제출 순서와 독립 (결정론 유지)
  const [nextRng, shuffled] = seededShuffle(p.rng, p.deck)
  p.rng = nextRng
  p.deck = shuffled
  drawN(s, slot, toReplace.length)
  p.mulliganDone = true
  logEvent(s, slot, 'mulligan', { replaced: toReplace.length })

  if (s.players.p1.mulliganDone && s.players.p2.mulliganDone) beginRound(s, 1)
  return { ok: true, state: s }
}

function doPlayUnit(s: GameState, slot: PlayerSlot, instanceId: string): ActionResult {
  if (s.phase !== 'action') return err(s, '액션 단계가 아닙니다.')
  if (s.priority !== slot) return err(s, '지금은 우선권이 없습니다.')
  if (s.stack.length > 0) return err(s, '스택이 비어야 유닛을 낼 수 있습니다.')
  const p = s.players[slot]
  const card = p.hand.find((c) => c.instanceId === instanceId)
  if (!card || card.kind !== 'unit' || !card.unit) return err(s, '손패에 없는 유닛입니다.')
  if (p.mana < card.cost) return err(s, '마나가 부족합니다.')
  if (p.board.length >= MAX_BOARD) return err(s, '보드가 가득 찼습니다(최대 6).')

  p.mana -= card.cost
  p.hand = p.hand.filter((c) => c.instanceId !== instanceId)
  const unit: BattleUnit = {
    instanceId: card.instanceId,
    cardId: card.cardId,
    owner: slot,
    name: card.name,
    member: card.member ?? null,
    power: card.unit.power,
    basePower: card.unit.power,
    health: card.unit.health,
    maxHealth: card.unit.health,
    baseMaxHealth: card.unit.health,
    keywords: [...card.unit.keywords],
    baseKeywords: [...card.unit.keywords],
    cost: card.cost,
    isChampion: card.unit.isChampion,
    championLevel: 1,
    championProgress: 0,
    summonedRound: s.round,
    hasAttacked: false,
    isStunned: false,
    hasBarrier: false,
    buffs: [],
  }
  p.board.push(unit)
  logEvent(s, slot, 'playUnit', { card: card.cardId })

  s.passStreak = 0
  s.priority = OTHER[slot] // 상대 대응 윈도우
  return { ok: true, state: s }
}

function doPlaySpell(s: GameState, slot: PlayerSlot, instanceId: string, targets: TargetRef[]): ActionResult {
  if (s.priority !== slot) return err(s, '지금은 우선권이 없습니다.')
  const p = s.players[slot]
  const card = p.hand.find((c) => c.instanceId === instanceId)
  if (!card || card.kind !== 'spell' || !card.spell) return err(s, '손패에 없는 주문입니다.')

  const speed = card.spell.speed
  if (speed === 'slow' && (s.stack.length > 0 || s.phase !== 'action'))
    return err(s, '지연 주문은 액션 단계에 스택이 비었을 때만 낼 수 있습니다.')
  if (s.phase !== 'action' && s.phase !== 'declareBlock') return err(s, '지금은 주문을 낼 수 없습니다.')
  if (card.spell.needsTarget && targets.length === 0) return err(s, '대상을 지정해야 합니다.')

  // 코스트: 마나 우선, 부족분은 스펠마나로 충당
  const fromMana = Math.min(p.mana, card.cost)
  const fromSpell = card.cost - fromMana
  if (fromSpell > p.spellMana) return err(s, '마나가 부족합니다.')
  p.mana -= fromMana
  p.spellMana -= fromSpell

  p.hand = p.hand.filter((c) => c.instanceId !== instanceId)
  const item: StackItem = {
    id: `stk-${s.round}-${s.stack.length}-${card.instanceId}`,
    source: slot,
    card,
    effect: card.spell.effect,
    speed,
    targets,
  }

  if (speed === 'burst') {
    // 즉발: 우선권 양보 없이 즉시 해결
    resolveSpellEffect(s, item)
    s.passStreak = 0
    logEvent(s, slot, 'playSpell', { card: card.cardId, speed })
    return { ok: true, state: s }
  }

  // fast / slow: 스택에 올리고 우선권 양보
  s.stack.push(item)
  s.passStreak = 0
  s.priority = OTHER[slot]
  logEvent(s, slot, 'playSpell', { card: card.cardId, speed })
  return { ok: true, state: s }
}

function doDeclareAttack(
  s: GameState,
  slot: PlayerSlot,
  attackers: string[],
  challenges: Record<string, string>
): ActionResult {
  if (s.phase !== 'action') return err(s, '액션 단계가 아닙니다.')
  if (slot !== s.activePlayer) return err(s, '공격 토큰이 없습니다.')
  if (s.priority !== slot) return err(s, '지금은 우선권이 없습니다.')
  if (s.attackDeclaredThisRound) return err(s, '이번 라운드엔 이미 공격을 선언했습니다.')
  if (s.stack.length > 0) return err(s, '스택이 비어야 공격할 수 있습니다.')
  if (attackers.length === 0) return err(s, '공격 유닛을 1기 이상 지정하세요.')

  const seen = new Set<string>()
  const challenged: Record<string, string> = {}
  for (const aId of attackers) {
    if (seen.has(aId)) return err(s, '같은 유닛을 중복 지정했습니다.')
    seen.add(aId)
    const a = findUnit(s, slot, aId)
    if (!a) return err(s, '내 유닛이 아닙니다.')
    if (a.hasAttacked) return err(s, '이미 공격한 유닛입니다.')
    if (a.isStunned) return err(s, '기절한 유닛은 공격할 수 없습니다.')
    if (a.summonedRound >= s.round) return err(s, '이번 라운드에 소환된 유닛은 공격할 수 없습니다.')
    const ch = challenges[aId]
    if (ch) {
      if (!a.keywords.includes('challenger')) return err(s, '도발이 없는 유닛은 적을 끌어낼 수 없습니다.')
      if (!findUnit(s, OTHER[slot], ch)) return err(s, '끌어낼 적 유닛이 없습니다.')
      challenged[aId] = ch
    }
  }
  for (const aId of attackers) {
    findUnit(s, slot, aId)!.hasAttacked = true
  }

  s.attackDeclaredThisRound = true
  s.combat = { attackers: [...attackers], blocks: {}, challenged, blocksDeclared: false }
  s.phase = 'declareBlock'
  s.priority = OTHER[slot] // 수비자 차례
  s.passStreak = 0
  logEvent(s, slot, 'declareAttack', { attackers, challenged })
  return { ok: true, state: s }
}

function doDeclareBlock(s: GameState, slot: PlayerSlot, blocks: Record<string, string>): ActionResult {
  if (s.phase !== 'declareBlock' || !s.combat) return err(s, '블록 단계가 아닙니다.')
  if (slot !== OTHER[s.activePlayer]) return err(s, '수비자만 블록할 수 있습니다.')
  if (s.combat.blocksDeclared) return err(s, '이미 블록을 선언했습니다.')

  const usedBlockers = new Set<string>()
  for (const [aId, bId] of Object.entries(blocks)) {
    if (!s.combat.attackers.includes(aId)) return err(s, '공격자 목록에 없는 유닛입니다.')
    const a = findUnit(s, s.activePlayer, aId)
    const b = findUnit(s, slot, bId)
    if (!a || !b) return err(s, '블록 대상이 유효하지 않습니다.')
    if (usedBlockers.has(bId)) return err(s, '한 유닛은 한 번만 블록할 수 있습니다.')
    const reason = canBlock(a, b)
    if (reason) return err(s, reason)
    usedBlockers.add(bId)
  }
  // 도발(challenger) 강제: 끌려온 유닛은 반드시 해당 공격자를 막아야 함
  for (const [aId, forcedBId] of Object.entries(s.combat.challenged)) {
    const stillAlive = findUnit(s, slot, forcedBId)
    if (stillAlive && blocks[aId] !== forcedBId)
      return err(s, '도발로 끌려온 유닛은 해당 공격자를 막아야 합니다.')
  }

  s.combat.blocks = blocks
  s.combat.blocksDeclared = true
  s.priority = s.activePlayer // 전투 반응 윈도우 (공격자부터)
  s.passStreak = 0
  logEvent(s, slot, 'declareBlock', { blocks })
  return { ok: true, state: s }
}

function doPass(s: GameState, slot: PlayerSlot): ActionResult {
  // 로컬 변수로 가드 — s.phase 자체를 좁히면 이후(resolveStack 등으로 변경되는) 'finished' 비교가 막힌다
  const ph: GameState['phase'] = s.phase
  if (ph !== 'action' && ph !== 'declareBlock') return err(s, '지금은 패스할 수 없습니다.')
  if (s.priority !== slot) return err(s, '지금은 우선권이 없습니다.')

  // 블록 선언 전 수비자의 패스 = "블록 안 함"
  if (s.phase === 'declareBlock' && s.combat && !s.combat.blocksDeclared) {
    if (slot !== OTHER[s.activePlayer]) return err(s, '수비자만 행동할 수 있습니다.')
    s.combat.blocksDeclared = true
    s.combat.blocks = {}
    s.priority = s.activePlayer
    s.passStreak = 0
    logEvent(s, slot, 'passBlock')
    return { ok: true, state: s }
  }

  s.passStreak += 1
  logEvent(s, slot, 'pass', { streak: s.passStreak })

  if (s.passStreak < 2) {
    s.priority = OTHER[slot]
    return { ok: true, state: s }
  }

  // 양쪽 연속 패스
  if (s.stack.length > 0) {
    resolveStack(s)
    if (s.phase !== 'finished') {
      s.passStreak = 0
      s.priority = s.activePlayer
    }
    return { ok: true, state: s }
  }
  if (s.phase === 'declareBlock' && s.combat?.blocksDeclared) {
    resolveCombat(s)
    return { ok: true, state: s }
  }
  if (s.phase === 'action') {
    beginRound(s, s.round + 1)
    return { ok: true, state: s }
  }
  // 그 외엔 우선권만 교대
  s.priority = OTHER[slot]
  return { ok: true, state: s }
}
