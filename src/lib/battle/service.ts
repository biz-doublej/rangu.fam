/**
 * 랑구 배틀 — 서비스 레이어 (DB 영속화 + 오케스트레이션).
 *
 * 라우트는 인증/입력만 보고 이 레이어를 호출한다. 전투 규칙은 전부 결정론 엔진
 * (engine.ts)에 있고, 여기선 그걸 DB(card_battles 등)와 잇는다:
 *   - 덱 빌드(보유 카드 검증, cardId 합산) / NPC 덱 생성
 *   - createBattle 영속화, 액션 적용 + PvE AI 자동 진행, 종료 시 정산
 *   - 안개(상대 손패·덱·소각·RNG 가림) 직렬화
 *
 * 동시성: 액션/정산은 card_battles 행을 FOR UPDATE 로 잠그고 한 트랜잭션에서 처리한다
 * (lost update·이중 정산·종료 후 재오픈 방지 — trades 라우트와 동일 컨벤션).
 */

import { randomUUID } from 'crypto'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { cards, userCards } from '@/db/schema/cards'
import { wikiUsers } from '@/db/schema/wiki'
import { resolveMemberIdForUser } from '@/lib/doublejAuth'
import {
  cardBattleDecks,
  cardBattleLog,
  cardBattles,
  cardBattleStats,
  type CardBattle,
} from '@/db/schema/cardBattle'
import { applyAction, createBattle } from './engine'
import { chooseAction } from './bot'
import { redactState, type RedactedView } from './redact'
import type { CardDef } from './stats'
import { OTHER, type BattleAction, type GameState, type PlayerSlot } from './types'

export { redactState, type RedactedView }

export class BattleError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function isMissingBattleTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /card_battle\w*.*does not exist|relation .*card_battle/i.test(msg)
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

export const SEASON = '2026-S1'
const MIN_DECK = 10
const MAX_DECK = 40
const MAX_COPIES = 3
const MAX_CHAMPIONS = 2
const MAX_FACTIONS = 2
const DAILY_BP_CAP = 5 // 하루 BP 획득(승리) 캡 — 파밍 방지

export interface DeckEntry {
  cardId: string
  count: number
}

// ── 덱 빌드 ───────────────────────────────────────────────────

type CardRow = typeof cards.$inferSelect

/**
 * DeckEntry[] → 엔진용 CardDef[] (검증 포함). 같은 cardId 가 여러 엔트리에 쪼개져도
 * 합산해서 MAX_COPIES/크기/진영/챔피언을 일관되게 검사한다.
 * 카드를 1장이라도 보유하면 덱에 (최대 3장까지 가상으로) 넣을 수 있다 — 비파괴 설계.
 */
async function buildDeckDefs(
  userId: string | null,
  entries: DeckEntry[],
  requireOwnership: boolean
): Promise<{ defs: CardDef[]; factions: string[] }> {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new BattleError('덱이 비어 있습니다.')
  }

  // cardId 별 합산 (분할 엔트리로 MAX_COPIES 우회 방지)
  const byCard = new Map<string, number>()
  for (const e of entries) {
    if (!e || typeof e.cardId !== 'string' || !Number.isInteger(e.count) || e.count < 1) {
      throw new BattleError('잘못된 덱 구성입니다.')
    }
    byCard.set(e.cardId, (byCard.get(e.cardId) ?? 0) + e.count)
  }

  const total = [...byCard.values()].reduce((n, c) => n + c, 0)
  if (total < MIN_DECK || total > MAX_DECK) {
    throw new BattleError(`덱은 ${MIN_DECK}~${MAX_DECK}장이어야 합니다. (현재 ${total}장)`)
  }
  for (const [cardId, count] of byCard) {
    if (count > MAX_COPIES) throw new BattleError(`카드당 ${MAX_COPIES}장까지 넣을 수 있습니다. (${cardId})`)
  }

  const db = getDb()
  const ids = [...byCard.keys()]
  const rows = await db.select().from(cards).where(inArray(cards.cardId, ids))
  const byId = new Map<string, CardRow>(rows.map((r) => [r.cardId, r]))

  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length) throw new BattleError(`존재하지 않는 카드: ${missing.join(', ')}`)

  if (requireOwnership && userId) {
    const owned = await db
      .select({ cardId: userCards.cardId })
      .from(userCards)
      .where(and(eq(userCards.userId, userId), inArray(userCards.cardId, ids)))
    const ownedSet = new Set(owned.map((r) => r.cardId))
    const notOwned = ids.filter((id) => !ownedSet.has(id))
    if (notOwned.length) throw new BattleError(`보유하지 않은 카드는 덱에 넣을 수 없습니다: ${notOwned.join(', ')}`)
  }

  // 진영(멤버) ≤2, 챔피언(프레스티지) ≤2
  const factions = new Set<string>()
  let champions = 0
  for (const [cardId, count] of byCard) {
    const row = byId.get(cardId)!
    if (row.member) factions.add(row.member)
    if ((row.type || '').toLowerCase() === 'prestige') champions += count
  }
  if (factions.size > MAX_FACTIONS) throw new BattleError(`덱은 진영 ${MAX_FACTIONS}개(멤버 2명)까지만 섞을 수 있습니다.`)
  if (champions > MAX_CHAMPIONS) throw new BattleError(`챔피언(프레스티지)은 ${MAX_CHAMPIONS}장까지만 넣을 수 있습니다.`)

  const defs: CardDef[] = []
  for (const [cardId, count] of byCard) {
    const row = byId.get(cardId)!
    for (let i = 0; i < count; i++) {
      defs.push({ cardId: row.cardId, name: row.name, member: row.member, type: row.type, rarity: row.rarity })
    }
  }
  return { defs, factions: [...factions] }
}

/** NPC(PvE 상대) 덱 — DB 실제 카드에서 조립해 항상 유효. */
async function buildNpcDeck(): Promise<CardDef[]> {
  const db = getDb()
  let pool = await db
    .select()
    .from(cards)
    .where(sql`${cards.type} != 'prestige'`)
    .limit(28)
  // 챔피언은 하드코딩 대신 실제 존재하는 프레스티지 중 2장
  const champs = await db
    .select()
    .from(cards)
    .where(sql`${cards.type} = 'prestige'`)
    .limit(2)

  // 비-프레스티지가 하나도 없으면 프레스티지라도 풀에 포함 (PvE 가용성 유지)
  if (pool.length === 0) {
    pool = await db.select().from(cards).limit(28)
  }

  const chosen: CardRow[] = [...pool, ...champs]
  if (chosen.length === 0) throw new BattleError('대전에 사용할 카드 데이터가 없습니다. 먼저 카드를 등록하세요.', 503)

  const defs: CardDef[] = []
  let i = 0
  const target = Math.max(MIN_DECK, Math.min(MAX_DECK, chosen.length))
  while (defs.length < target && i <= MAX_DECK) {
    const row = chosen[i % chosen.length]
    defs.push({ cardId: row.cardId, name: row.name, member: row.member, type: row.type, rarity: row.rarity })
    i++
  }
  return defs
}

// ── 슬롯 매핑 / 안개 직렬화 ──────────────────────────────────

export function slotForUser(battle: Pick<CardBattle, 'player1Id' | 'player2Id'>, userId: string): PlayerSlot | null {
  if (battle.player1Id === userId) return 'p1'
  if (battle.player2Id === userId) return 'p2'
  return null
}

// ── PvE AI 자동 진행 ─────────────────────────────────────────

/** 게임이 끝나거나 우선권이 사람에게 돌아올 때까지 AI 슬롯을 대신 둔다. */
function runAiTurns(state: GameState, aiSlot: PlayerSlot): GameState {
  let s = state
  let guard = 0
  while (s.phase !== 'finished' && guard++ < 10_000) {
    if (s.phase === 'mulligan') {
      if (s.players[aiSlot].mulliganDone) break // 사람 멀리건 대기
      const r = applyAction(s, aiSlot, { type: 'mulligan', replace: [] })
      if (!r.ok) break
      s = r.state
      continue
    }
    if (s.priority !== aiSlot) break // 사람 차례
    const r = applyAction(s, aiSlot, chooseAction(s, aiSlot))
    if (!r.ok) break
    s = r.state
  }
  return s
}

// ── 생성 ──────────────────────────────────────────────────────

export interface CreateOptions {
  mode: 'pve' | 'pvp'
  deck: DeckEntry[]
  opponentId?: string
}

export async function createBattleForUser(userId: string, opts: CreateOptions): Promise<{ id: string; view: RedactedView }> {
  const db = getDb()
  const mine = await buildDeckDefs(userId, opts.deck, true)

  let player2Id: string | null = null
  let oppDefs: CardDef[]
  let p2DeckEntries: DeckEntry[] = []

  if (opts.mode === 'pvp') {
    if (!opts.opponentId) throw new BattleError('상대를 지정하세요.')
    if (opts.opponentId === userId) throw new BattleError('자기 자신과는 대전할 수 없습니다.')
    // 상대가 실제 5인 멤버인지 검증 (없는 유저/비멤버는 존재를 드러내지 않게 404)
    const [oppUser] = await db.select().from(wikiUsers).where(eq(wikiUsers.id, opts.opponentId)).limit(1)
    if (!oppUser || !resolveMemberIdForUser(oppUser)) throw new BattleError('상대를 찾을 수 없습니다.', 404)

    const active = await getActiveDeck(opts.opponentId)
    if (!active) throw new BattleError('상대가 활성 덱을 설정하지 않았습니다.', 409)
    let opp: { defs: CardDef[] }
    try {
      opp = await buildDeckDefs(opts.opponentId, active, true)
    } catch {
      // 상대 덱이 더 이상 유효하지 않음 — 상대 카드 식별자를 도전자에게 노출하지 않는다
      throw new BattleError('상대의 활성 덱이 더 이상 유효하지 않습니다. 상대가 덱을 다시 설정해야 합니다.', 409)
    }
    oppDefs = opp.defs
    p2DeckEntries = active
    player2Id = opts.opponentId
  } else {
    oppDefs = await buildNpcDeck()
  }

  const seed = randomUUID()
  let state = createBattle({
    seed,
    p1: { userId, deck: mine.defs },
    p2: { userId: player2Id, deck: oppDefs },
  })
  // PvE: AI 멀리건은 미리 처리(사람과 무관) → 사람이 멀리건하면 바로 라운드 시작
  if (player2Id === null) state = runAiTurns(state, 'p2')

  const id = randomUUID()
  await db.insert(cardBattles).values({
    id,
    mode: opts.mode,
    status: 'mulligan',
    player1Id: userId,
    player2Id,
    p1Deck: opts.deck,
    p2Deck: p2DeckEntries,
    state,
    seed,
    round: state.round,
    activePlayerId: userId,
  })

  return { id, view: redactState(state, 'p1') }
}

// ── 액션 적용 (행 잠금 + 트랜잭션) ──────────────────────────

export async function applyUserAction(
  userId: string,
  battleId: string,
  action: BattleAction
): Promise<RedactedView> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const [battle] = await tx
      .select()
      .from(cardBattles)
      .where(eq(cardBattles.id, battleId))
      .limit(1)
      .for('update')
    if (!battle) throw new BattleError('전투를 찾을 수 없습니다.', 404)

    const mySlot = slotForUser(battle, userId)
    if (!mySlot) throw new BattleError('전투를 찾을 수 없습니다.', 404) // 비참가자에겐 존재를 숨김
    if (battle.status === 'finished') throw new BattleError('이미 종료된 전투입니다.', 409)
    if (!battle.state) throw new BattleError('전투 상태가 없습니다.', 500)

    const res = applyAction(battle.state, mySlot, action)
    if (!res.ok) throw new BattleError(res.error || '허용되지 않는 행동입니다.', 400)
    let state = res.state

    // PvE: 사람 행동 후 AI(상대 슬롯) 자동 진행
    if (battle.player2Id === null) state = runAiTurns(state, OTHER[mySlot])

    const finished = state.phase === 'finished'
    const status = finished ? 'finished' : state.phase === 'mulligan' ? 'mulligan' : 'active'
    const winnerId =
      finished && state.winner ? (state.winner === 'p1' ? battle.player1Id : battle.player2Id) : null
    const activePlayerId = finished ? null : state.activePlayer === 'p1' ? battle.player1Id : battle.player2Id

    await tx
      .update(cardBattles)
      .set({ state, status, round: state.round, winnerId, activePlayerId, updatedAt: new Date() })
      .where(eq(cardBattles.id, battleId))

    // 잠금 하에서 'finished' 로 전이한 트랜잭션만 정산 (이중 정산 불가)
    if (finished) await settleBattle(tx, battle, state)

    return redactState(state, mySlot)
  })
}

// ── 종료 정산 (전적/레이팅/BP/로그) — 호출측 트랜잭션 내에서 실행 ─

function kstDate(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

async function settleBattle(tx: Tx, battle: CardBattle, state: GameState) {
  const today = kstDate()

  const players: { slot: PlayerSlot; userId: string; opponentId: string | null }[] = [
    { slot: 'p1', userId: battle.player1Id, opponentId: battle.player2Id },
  ]
  if (battle.player2Id) players.push({ slot: 'p2', userId: battle.player2Id, opponentId: battle.player1Id })

  for (const p of players) {
    const isWin = state.winner === p.slot
    const isDraw = state.winner === null
    const result: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWin ? 'win' : 'loss'

    // 시즌 스탯 행 보장 후 잠금
    await tx.insert(cardBattleStats).values({ userId: p.userId, season: SEASON }).onConflictDoNothing()
    const [row] = await tx
      .select()
      .from(cardBattleStats)
      .where(and(eq(cardBattleStats.userId, p.userId), eq(cardBattleStats.season, SEASON)))
      .limit(1)
      .for('update')
    if (!row) continue

    // 일일 BP 캡 리셋
    const dailyUsed = row.lastRewardDate === today ? row.dailyRewardedWins : 0
    let bpDelta = 0
    let newDailyUsed = dailyUsed
    if (isDraw) bpDelta = 10
    else if (isWin) {
      if (dailyUsed < DAILY_BP_CAP) {
        bpDelta = 20
        newDailyUsed = dailyUsed + 1
      } else bpDelta = 2 // 캡 초과 위로금
    } else bpDelta = 5

    // 레이팅: PvP(양쪽 실유저)만 ELO 변동, PvE 는 변동 없음
    let ratingDelta = 0
    if (battle.mode === 'pvp' && battle.player2Id) {
      const expected = 0.5 // TODO: 상대 레이팅 반영한 정식 ELO
      const score = isDraw ? 0.5 : isWin ? 1 : 0
      ratingDelta = Math.round(32 * (score - expected))
    }

    const newStreak = isWin ? row.currentStreak + 1 : 0
    await tx
      .update(cardBattleStats)
      .set({
        wins: row.wins + (isWin ? 1 : 0),
        losses: row.losses + (!isWin && !isDraw ? 1 : 0),
        draws: row.draws + (isDraw ? 1 : 0),
        rating: row.rating + ratingDelta,
        bestRating: Math.max(row.bestRating, row.rating + ratingDelta),
        battlePoints: row.battlePoints + bpDelta,
        currentStreak: newStreak,
        winStreak: Math.max(row.winStreak, newStreak),
        dailyRewardedWins: newDailyUsed,
        lastRewardDate: today,
        updatedAt: new Date(),
      })
      .where(eq(cardBattleStats.id, row.id))

    // 전투당 유저별 로그 1행 (멱등 — 유니크 충돌 시 무시)
    await tx
      .insert(cardBattleLog)
      .values({
        battleId: battle.id,
        userId: p.userId,
        opponentId: p.opponentId,
        mode: battle.mode,
        result,
        ratingDelta,
        bpDelta,
        rounds: state.log,
      })
      .onConflictDoNothing({ target: [cardBattleLog.battleId, cardBattleLog.userId] })
  }
}

// ── 조회 ──────────────────────────────────────────────────────

export async function getBattleView(userId: string, battleId: string): Promise<RedactedView> {
  const db = getDb()
  const [battle] = await db.select().from(cardBattles).where(eq(cardBattles.id, battleId)).limit(1)
  if (!battle) throw new BattleError('전투를 찾을 수 없습니다.', 404)
  const mySlot = slotForUser(battle, userId)
  if (!mySlot) throw new BattleError('전투를 찾을 수 없습니다.', 404) // 비참가자에겐 존재를 숨김
  if (!battle.state) throw new BattleError('전투 상태가 없습니다.', 500)
  return redactState(battle.state, mySlot)
}

export async function listBattlesForUser(userId: string, limit = 20) {
  const db = getDb()
  return db
    .select({
      id: cardBattles.id,
      mode: cardBattles.mode,
      status: cardBattles.status,
      player1Id: cardBattles.player1Id,
      player2Id: cardBattles.player2Id,
      round: cardBattles.round,
      winnerId: cardBattles.winnerId,
      activePlayerId: cardBattles.activePlayerId,
      updatedAt: cardBattles.updatedAt,
    })
    .from(cardBattles)
    .where(or(eq(cardBattles.player1Id, userId), eq(cardBattles.player2Id, userId)))
    .orderBy(desc(cardBattles.updatedAt))
    .limit(limit)
}

// ── 덱 CRUD ───────────────────────────────────────────────────

export async function listDecks(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(cardBattleDecks)
    .where(eq(cardBattleDecks.userId, userId))
    .orderBy(desc(cardBattleDecks.updatedAt))
}

export async function getActiveDeck(userId: string): Promise<DeckEntry[] | null> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(cardBattleDecks)
    .where(and(eq(cardBattleDecks.userId, userId), eq(cardBattleDecks.isActive, true)))
    .limit(1)
  return row ? (row.cards as DeckEntry[]) : null
}

export async function saveDeck(
  userId: string,
  input: { id?: string; name: string; cards: DeckEntry[]; setActive?: boolean }
): Promise<string> {
  const db = getDb()
  // 검증 (보유 카드 + 진영/챔피언/크기) — buildDeckDefs 재사용
  const { factions } = await buildDeckDefs(userId, input.cards, true)
  const now = new Date()
  const fields = {
    name: input.name || '내 덱',
    factionA: factions[0] || '',
    factionB: factions[1] || '',
    cards: input.cards,
    isActive: input.setActive ?? false,
    updatedAt: now,
  }

  return db.transaction(async (tx) => {
    if (input.setActive) {
      await tx.update(cardBattleDecks).set({ isActive: false, updatedAt: now }).where(eq(cardBattleDecks.userId, userId))
    }
    if (input.id) {
      // 수정: 반드시 본인 소유 행만 (IDOR 방지 — 남의 덱 id 로 덮어쓰기 불가)
      const updated = await tx
        .update(cardBattleDecks)
        .set(fields)
        .where(and(eq(cardBattleDecks.id, input.id), eq(cardBattleDecks.userId, userId)))
        .returning({ id: cardBattleDecks.id })
      if (updated.length === 0) throw new BattleError('본인 덱만 수정할 수 있습니다.', 403)
      return input.id
    }
    // 생성: 서버 생성 id (클라 id 무시)
    const id = randomUUID()
    await tx.insert(cardBattleDecks).values({ id, userId, ...fields })
    return id
  })
}
